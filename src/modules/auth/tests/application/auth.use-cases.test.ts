import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request } from 'express';
import type { PoolClient } from 'pg';
import { AuthUseCases } from '../../application/auth.use-cases.js';
import {
  InvalidCredentialsError,
  LogoutForbiddenError,
  RefreshTokenError,
  UserAlreadyExistsError,
  UserNotFoundError,
} from '../../auth.errors.js';
import type { RefreshTokenRow, UserRow } from '../../auth.types.js';
import { createAuthRepositoryMock } from '../auth.repository.mock.js';

const {
  bcryptCompareMock,
  bcryptHashMock,
  generateAccessTokenMock,
  generateRefreshTokenMock,
  getLocationFromIpMock,
  withTransactionMock,
} = vi.hoisted(() => ({
  bcryptCompareMock: vi.fn(),
  bcryptHashMock: vi.fn(),
  generateAccessTokenMock: vi.fn(),
  generateRefreshTokenMock: vi.fn(),
  getLocationFromIpMock: vi.fn(),
  withTransactionMock: vi.fn(),
}));

vi.mock('bcrypt', () => ({
  default: {
    compare: bcryptCompareMock,
    hash: bcryptHashMock,
  },
}));

vi.mock('../../../../shared/database/transaction.js', () => ({
  withTransaction: withTransactionMock,
}));

vi.mock('../../../../services/token.service.js', () => ({
  generateAccessToken: generateAccessTokenMock,
  generateRefreshToken: generateRefreshTokenMock,
}));

vi.mock('../../../../utils/geo.js', () => ({
  getLocationFromIp: getLocationFromIpMock,
}));

const user: UserRow = {
  id: 7,
  first_name: 'Ada',
  last_name: 'Lovelace',
  email: 'ada@example.com',
  password_hash: 'stored-hash',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: null,
};

const loginInput = {
  email: 'ada@example.com',
  password: 'secure-password',
};

const transactionClient = {} as PoolClient;

describe('AuthUseCases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bcryptHashMock.mockResolvedValue('hashed-password');
    bcryptCompareMock.mockResolvedValue(true);
    generateAccessTokenMock.mockReturnValue('access-token');
    generateRefreshTokenMock.mockReturnValue('next-refresh-token');
    getLocationFromIpMock.mockResolvedValue({
      city: 'Ciudad de México',
      state: 'CDMX',
      country: 'MX',
    });
    withTransactionMock.mockImplementation(async (_database, operation) => operation(transactionClient));
  });

  it('registra un usuario, cifra la contraseña y devuelve su DTO', async () => {
    const repository = createAuthRepositoryMock({
      findUserByEmail: vi.fn().mockResolvedValue(null),
      createUser: vi.fn().mockResolvedValue(user),
    });
    const useCases = new AuthUseCases(repository);

    const result = await useCases.register({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      password: 'secure-password',
    });

    expect(bcryptHashMock).toHaveBeenCalledWith('secure-password', 10);
    expect(repository.createUser).toHaveBeenCalledWith({
      first_name: 'Ada',
      last_name: 'Lovelace',
      email: 'ada@example.com',
      password_hash: 'hashed-password',
    });
    expect(result).toEqual({
      id: 7,
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      fullName: 'Ada Lovelace',
      createdAt: user.created_at,
      updatedAt: null,
    });
  });

  it('rechaza el registro si el correo ya existe antes de cifrar la contraseña', async () => {
    const repository = createAuthRepositoryMock({
      findUserByEmail: vi.fn().mockResolvedValue(user),
    });

    await expect(new AuthUseCases(repository).register({
      firstName: 'Ada', lastName: 'Lovelace', email: user.email, password: 'secure-password',
    })).rejects.toBeInstanceOf(UserAlreadyExistsError);

    expect(bcryptHashMock).not.toHaveBeenCalled();
    expect(repository.createUser).not.toHaveBeenCalled();
  });

  it('traduce la carrera de unicidad de PostgreSQL a usuario existente', async () => {
    const duplicateError = Object.assign(new Error('duplicate key'), { code: '23505' });
    const repository = createAuthRepositoryMock({
      findUserByEmail: vi.fn().mockResolvedValue(null),
      createUser: vi.fn().mockRejectedValue(duplicateError),
    });

    await expect(new AuthUseCases(repository).register({
      firstName: 'Ada', lastName: 'Lovelace', email: user.email, password: 'secure-password',
    })).rejects.toBeInstanceOf(UserAlreadyExistsError);
  });

  it('propaga los errores inesperados al registrar', async () => {
    const databaseError = new Error('database unavailable');
    const repository = createAuthRepositoryMock({
      findUserByEmail: vi.fn().mockResolvedValue(null),
      createUser: vi.fn().mockRejectedValue(databaseError),
    });

    await expect(new AuthUseCases(repository).register({
      firstName: 'Ada', lastName: 'Lovelace', email: user.email, password: 'secure-password',
    })).rejects.toBe(databaseError);
  });

  it('inicia sesión, guarda la sesión con metadatos y crea sus tokens', async () => {
    const repository = createAuthRepositoryMock({
      findUserByEmail: vi.fn().mockResolvedValue(user),
      createSession: vi.fn().mockResolvedValue({ id: 19 }),
    });
    const request = createRequest();

    const result = await new AuthUseCases(repository).login(loginInput, request);

    expect(withTransactionMock).toHaveBeenCalledWith(repository.database, expect.any(Function));
    expect(repository.findUserByEmail).toHaveBeenCalledWith(user.email, transactionClient);
    expect(repository.createSession).toHaveBeenCalledWith(7, {
      userAgent: 'Kitab tests', ipAddress: '203.0.113.20', city: 'Ciudad de México', state: 'CDMX', country: 'MX',
    }, transactionClient);
    expect(repository.createRefreshToken).toHaveBeenCalledWith(19, 'next-refresh-token', transactionClient);
    expect(generateAccessTokenMock).toHaveBeenCalledWith(7, 19);
    expect(result).toMatchObject({ sessionId: 19, accessToken: 'access-token', refreshToken: 'next-refresh-token' });
  });

  it('rechaza credenciales cuando el usuario no existe sin crear una sesión', async () => {
    const repository = createAuthRepositoryMock({
      findUserByEmail: vi.fn().mockResolvedValue(null),
    });

    await expect(new AuthUseCases(repository).login(loginInput, createRequest()))
      .rejects.toBeInstanceOf(InvalidCredentialsError);

    expect(repository.createSession).not.toHaveBeenCalled();
    expect(repository.createRefreshToken).not.toHaveBeenCalled();
  });

  it('rechaza credenciales cuando la contraseña no coincide', async () => {
    bcryptCompareMock.mockResolvedValue(false);
    const repository = createAuthRepositoryMock({
      findUserByEmail: vi.fn().mockResolvedValue(user),
    });

    await expect(new AuthUseCases(repository).login(loginInput, createRequest()))
      .rejects.toBeInstanceOf(InvalidCredentialsError);

    expect(repository.createSession).not.toHaveBeenCalled();
  });

  it('rechaza credenciales cuando el usuario no tiene contraseña almacenada', async () => {
    const userWithoutPassword: UserRow = { ...user, password_hash: undefined };
    const repository = createAuthRepositoryMock({
      findUserByEmail: vi.fn().mockResolvedValue(userWithoutPassword),
    });

    await expect(new AuthUseCases(repository).login(loginInput, createRequest()))
      .rejects.toBeInstanceOf(InvalidCredentialsError);

    expect(bcryptCompareMock).not.toHaveBeenCalled();
    expect(repository.createSession).not.toHaveBeenCalled();
  });

  it('continúa el login sin ubicación si falla el proveedor externo', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    getLocationFromIpMock.mockRejectedValue(new Error('geolocation unavailable'));
    const repository = createAuthRepositoryMock({
      findUserByEmail: vi.fn().mockResolvedValue(user),
      createSession: vi.fn().mockResolvedValue({ id: 19 }),
    });

    await new AuthUseCases(repository).login(loginInput, createRequest());

    expect(repository.createSession).toHaveBeenCalledWith(7, expect.objectContaining({
      city: null, state: null, country: null,
    }), transactionClient);
    warning.mockRestore();
  });

  it('obtiene el perfil del usuario autenticado', async () => {
    const repository = createAuthRepositoryMock({ findUserById: vi.fn().mockResolvedValue(user) });

    await expect(new AuthUseCases(repository).getCurrentUser(7)).resolves.toMatchObject({
      id: 7, fullName: 'Ada Lovelace', email: user.email,
    });
  });

  it('rechaza el perfil de un usuario inexistente', async () => {
    const repository = createAuthRepositoryMock({ findUserById: vi.fn().mockResolvedValue(null) });

    await expect(new AuthUseCases(repository).getCurrentUser(7)).rejects.toBeInstanceOf(UserNotFoundError);
  });

  it.each([
    ['no existe', null, 'REFRESH_TOKEN_NOT_FOUND'],
    ['está expirado', refreshToken({ expires_at: new Date('2020-01-01') }), 'REFRESH_TOKEN_EXPIRED'],
    ['está revocado', refreshToken({ is_revoked: true }), 'REFRESH_TOKEN_REVOKED'],
    ['pertenece a una sesión inactiva', refreshToken({ is_active: false }), 'SESSION_INACTIVE'],
  ])('rechaza un refresh token que %s', async (_description, token, code) => {
    const repository = createAuthRepositoryMock({
      getRefreshTokenForUpdate: vi.fn().mockResolvedValue(token),
    });

    await expect(new AuthUseCases(repository).refresh('refresh-token'))
      .rejects.toMatchObject({ code });

    expect(repository.markRefreshTokenUsed).not.toHaveBeenCalled();
  });

  it('revoca la sesión si se reutiliza un refresh token y después rechaza la solicitud', async () => {
    const repository = createAuthRepositoryMock({
      getRefreshTokenForUpdate: vi.fn().mockResolvedValue(refreshToken({ is_used: true })),
    });

    await expect(new AuthUseCases(repository).refresh('refresh-token'))
      .rejects.toBeInstanceOf(RefreshTokenError);

    expect(repository.revokeSessionRefreshTokens).toHaveBeenCalledWith(19, transactionClient);
    expect(repository.deactivateSession).toHaveBeenCalledWith(19, transactionClient);
    expect(repository.markRefreshTokenUsed).not.toHaveBeenCalled();
  });

  it('consume y rota un refresh token válido', async () => {
    const repository = createAuthRepositoryMock({
      getRefreshTokenForUpdate: vi.fn().mockResolvedValue(refreshToken()),
    });

    await expect(new AuthUseCases(repository).refresh('refresh-token')).resolves.toEqual({
      accessToken: 'access-token', refreshToken: 'next-refresh-token',
    });

    expect(repository.markRefreshTokenUsed).toHaveBeenCalledWith(31, transactionClient);
    expect(repository.createRefreshToken).toHaveBeenCalledWith(19, 'next-refresh-token', transactionClient);
    expect(generateAccessTokenMock).toHaveBeenCalledWith(7, 19);
  });

  it('no hace nada al cerrar sesión sin refresh token', async () => {
    const repository = createAuthRepositoryMock();

    await expect(new AuthUseCases(repository).logout(undefined, 7)).resolves.toBeUndefined();

    expect(withTransactionMock).not.toHaveBeenCalled();
  });

  it('no revoca una sesión si el refresh token no está activo', async () => {
    const repository = createAuthRepositoryMock({ findActiveRefreshToken: vi.fn().mockResolvedValue(null) });

    await new AuthUseCases(repository).logout('refresh-token', 7);

    expect(repository.revokeRefreshToken).not.toHaveBeenCalled();
  });

  it('impide cerrar una sesión que pertenece a otro usuario', async () => {
    const repository = createAuthRepositoryMock({
      findActiveRefreshToken: vi.fn().mockResolvedValue({ session_id: 19, user_id: 99 }),
    });

    await expect(new AuthUseCases(repository).logout('refresh-token', 7))
      .rejects.toBeInstanceOf(LogoutForbiddenError);

    expect(repository.revokeRefreshToken).not.toHaveBeenCalled();
  });

  it('revoca el token actual y desactiva exclusivamente su sesión al cerrar sesión', async () => {
    const repository = createAuthRepositoryMock({
      findActiveRefreshToken: vi.fn().mockResolvedValue({ session_id: 19, user_id: 7 }),
      revokeRefreshToken: vi.fn().mockResolvedValue({ session_id: 19 }),
    });

    await new AuthUseCases(repository).logout('refresh-token', 7);

    expect(repository.revokeRefreshToken).toHaveBeenCalledWith('refresh-token', transactionClient);
    expect(repository.deactivateSession).toHaveBeenCalledWith(19, transactionClient);
  });

  it('no desactiva una sesión si el token ya fue revocado por otra solicitud', async () => {
    const repository = createAuthRepositoryMock({
      findActiveRefreshToken: vi.fn().mockResolvedValue({ session_id: 19, user_id: 7 }),
      revokeRefreshToken: vi.fn().mockResolvedValue(null),
    });

    await expect(new AuthUseCases(repository).logout('refresh-token', 7)).resolves.toBeUndefined();

    expect(repository.revokeRefreshToken).toHaveBeenCalledWith('refresh-token', transactionClient);
    expect(repository.deactivateSession).not.toHaveBeenCalled();
  });

  it('devuelve cero al cerrar todas las sesiones sin token válido', async () => {
    const repository = createAuthRepositoryMock({ getActiveRefreshTokenUserId: vi.fn().mockResolvedValue(null) });
    const useCases = new AuthUseCases(repository);

    await expect(useCases.logoutAll(undefined, 7)).resolves.toBe(0);
    await expect(useCases.logoutAll('refresh-token', 7)).resolves.toBe(0);

    expect(repository.revokeAllUserRefreshTokens).not.toHaveBeenCalled();
  });

  it('impide cerrar todas las sesiones de otro usuario', async () => {
    const repository = createAuthRepositoryMock({ getActiveRefreshTokenUserId: vi.fn().mockResolvedValue(99) });

    await expect(new AuthUseCases(repository).logoutAll('refresh-token', 7))
      .rejects.toBeInstanceOf(LogoutForbiddenError);

    expect(repository.revokeAllUserRefreshTokens).not.toHaveBeenCalled();
  });

  it('revoca todos los tokens y sesiones activas del usuario propietario', async () => {
    const repository = createAuthRepositoryMock({
      getActiveRefreshTokenUserId: vi.fn().mockResolvedValue(7),
      deactivateAllUserSessions: vi.fn().mockResolvedValue(3),
    });

    await expect(new AuthUseCases(repository).logoutAll('refresh-token', 7)).resolves.toBe(3);

    expect(repository.revokeAllUserRefreshTokens).toHaveBeenCalledWith(7, transactionClient);
    expect(repository.deactivateAllUserSessions).toHaveBeenCalledWith(7, transactionClient);
  });
});

function createRequest(): Request {
  return {
    ip: '203.0.113.20',
    socket: { remoteAddress: '203.0.113.20' },
    get: vi.fn().mockReturnValue('Kitab tests'),
  } as unknown as Request;
}

function refreshToken(overrides: Partial<RefreshTokenRow> = {}): RefreshTokenRow {
  return {
    id: 31,
    session_id: 19,
    is_used: false,
    is_revoked: false,
    expires_at: new Date('2030-01-01'),
    user_id: 7,
    is_active: true,
    ...overrides,
  };
}
