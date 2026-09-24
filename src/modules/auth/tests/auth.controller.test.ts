import type { Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthenticatedRequest } from '../../../shared/http/authenticated-request.js';
import {
  InvalidCredentialsError,
  LogoutForbiddenError,
  RefreshTokenError,
  UserAlreadyExistsError,
  UserNotFoundError,
} from '../auth.errors.js';

const {
  getCurrentUserMock,
  loginMock,
  logoutAllMock,
  logoutMock,
  refreshMock,
  registerMock,
} = vi.hoisted(() => ({
  getCurrentUserMock: vi.fn(),
  loginMock: vi.fn(),
  logoutAllMock: vi.fn(),
  logoutMock: vi.fn(),
  refreshMock: vi.fn(),
  registerMock: vi.fn(),
}));

vi.mock('../application/auth.use-cases.js', () => ({
  AuthUseCases: class {
    getCurrentUser = getCurrentUserMock;
    login = loginMock;
    logout = logoutMock;
    logoutAll = logoutAllMock;
    refresh = refreshMock;
    register = registerMock;
  },
}));

import { login, logout, logoutAll, me, refresh, register } from '../auth.controller.js';

const user = {
  id: 7,
  firstName: 'Taylor',
  lastName: 'Swift',
  email: 'taylor@example.com',
  fullName: 'Taylor Swift',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: null,
};

const validRegistration = {
  firstName: 'Taylor',
  lastName: 'Swift',
  email: 'taylor@example.com',
  password: 'secure-password',
};

describe('auth controllers', () => {
  beforeEach(() => {
    getCurrentUserMock.mockReset();
    loginMock.mockReset();
    logoutAllMock.mockReset();
    logoutMock.mockReset();
    refreshMock.mockReset();
    registerMock.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registra un usuario y responde 201', async () => {
    const response = createResponseMock();
    registerMock.mockResolvedValue(user);

    await register(request({ body: validRegistration }), response);

    expect(registerMock).toHaveBeenCalledWith(validRegistration);
    expect(response.status).toHaveBeenCalledWith(201);
    expect(response.json).toHaveBeenCalledWith({
      success: true, message: 'Usuario creado correctamente', user,
    });
  });

  it('rechaza un registro inválido antes de llamar al caso de uso', async () => {
    const response = createResponseMock();

    await register(request({ body: { ...validRegistration, email: 'invalid-email' } }), response);

    expect(registerMock).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      success: false, message: 'El correo electrónico es inválido.',
    });
  });

  it('responde 409 si el usuario ya existe', async () => {
    const response = createResponseMock();
    registerMock.mockRejectedValue(new UserAlreadyExistsError());

    await register(request({ body: validRegistration }), response);

    expect(response.status).toHaveBeenCalledWith(409);
    expect(response.json).toHaveBeenCalledWith({ success: false, message: 'El usuario ya existe' });
  });

  it('inicia sesión, devuelve el usuario y establece las cookies de tokens', async () => {
    const response = createResponseMock();
    loginMock.mockResolvedValue({
      user,
      sessionId: 19,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
    const loginRequest = request({ body: { email: ' TAYLOR@EXAMPLE.COM ', password: 'secure-password' } });

    await login(loginRequest, response);

    expect(loginMock).toHaveBeenCalledWith(
      { email: 'taylor@example.com', password: 'secure-password' },
      loginRequest,
    );
    expect(response.cookie).toHaveBeenCalledWith('accessToken', 'access-token', expect.objectContaining({
      httpOnly: true, maxAge: 15 * 60 * 1000,
    }));
    expect(response.cookie).toHaveBeenCalledWith('refreshToken', 'refresh-token', expect.objectContaining({
      httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000,
    }));
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({
      success: true,
      message: 'Login exitoso',
      data: { user, session: { id: 19 } },
    });
  });

  it('responde 401 ante credenciales inválidas', async () => {
    const response = createResponseMock();
    loginMock.mockRejectedValue(new InvalidCredentialsError());

    await login(request({ body: { email: user.email, password: 'wrong-password' } }), response);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({
      success: false, message: 'Usuario o contraseña incorrectos',
    });
  });

  it('responde 400 ante un payload de login inválido', async () => {
    const response = createResponseMock();

    await login(request({ body: { email: '', password: '' } }), response);

    expect(loginMock).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      success: false, message: 'Todos los campos son obligatorios',
    });
  });

  it('devuelve el perfil del usuario autenticado', async () => {
    const response = createResponseMock();
    getCurrentUserMock.mockResolvedValue(user);

    await me(request({ user: { id: 7 } }), response);

    expect(getCurrentUserMock).toHaveBeenCalledWith(7);
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({ success: true, data: { user } });
  });

  it('responde 401 al consultar el perfil sin usuario autenticado', async () => {
    const response = createResponseMock();

    await me(request(), response);

    expect(getCurrentUserMock).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({ success: false, message: 'Usuario no autenticado' });
  });

  it('responde 404 si el perfil ya no existe', async () => {
    const response = createResponseMock();
    getCurrentUserMock.mockRejectedValue(new UserNotFoundError());

    await me(request({ user: { id: 7 } }), response);

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ success: false, message: 'Usuario no encontrado' });
  });

  it('exige el refresh token antes de renovarlo', async () => {
    const response = createResponseMock();

    await refresh(request(), response);

    expect(refreshMock).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({ success: false, message: 'Refresh token requerido' });
  });

  it('rota las cookies al renovar el refresh token', async () => {
    const response = createResponseMock();
    refreshMock.mockResolvedValue({ accessToken: 'new-access-token', refreshToken: 'new-refresh-token' });

    await refresh(request({ cookies: { refreshToken: 'old-refresh-token' } }), response);

    expect(refreshMock).toHaveBeenCalledWith('old-refresh-token');
    expect(response.cookie).toHaveBeenCalledWith('accessToken', 'new-access-token', expect.anything());
    expect(response.cookie).toHaveBeenCalledWith('refreshToken', 'new-refresh-token', expect.anything());
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({ success: true, message: 'Token renovado exitosamente' });
  });

  it('limpia las cookies cuando el refresh token es inválido', async () => {
    const response = createResponseMock();
    refreshMock.mockRejectedValue(new RefreshTokenError('Refresh token expirado', 'REFRESH_TOKEN_EXPIRED'));

    await refresh(request({ cookies: { refreshToken: 'expired-token' } }), response);

    expectClearedAuthCookies(response);
    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({ success: false, message: 'Refresh token expirado' });
  });

  it('cierra la sesión actual y limpia las cookies', async () => {
    const response = createResponseMock();

    await logout(request({ user: { id: 7 }, cookies: { refreshToken: 'refresh-token' } }), response);

    expect(logoutMock).toHaveBeenCalledWith('refresh-token', 7);
    expectClearedAuthCookies(response);
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({ success: true, message: 'Sesión cerrada exitosamente' });
  });

  it('limpia las cookies y responde 403 cuando no puede cerrar la sesión', async () => {
    const response = createResponseMock();
    logoutMock.mockRejectedValue(new LogoutForbiddenError('No autorizado para cerrar esta sesión.'));

    await logout(request({ user: { id: 7 }, cookies: { refreshToken: 'other-user-token' } }), response);

    expectClearedAuthCookies(response);
    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({
      success: false, message: 'No autorizado para cerrar esta sesión.',
    });
  });

  it('cierra todas las sesiones del usuario autenticado', async () => {
    const response = createResponseMock();
    logoutAllMock.mockResolvedValue(3);

    await logoutAll(request({ user: { id: 7 }, cookies: { refreshToken: 'refresh-token' } }), response);

    expect(logoutAllMock).toHaveBeenCalledWith('refresh-token', 7);
    expectClearedAuthCookies(response);
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({
      success: true, message: 'Se cerraron 3 sesiones correctamente',
    });
  });

  it('responde 401 sin usuario al cerrar todas las sesiones', async () => {
    const response = createResponseMock();

    await logoutAll(request({ cookies: { refreshToken: 'refresh-token' } }), response);

    expect(logoutAllMock).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({ success: false, message: 'Usuario no autenticado' });
  });
});

function request(values: Partial<AuthenticatedRequest> = {}): AuthenticatedRequest {
  return values as AuthenticatedRequest;
}

function createResponseMock() {
  const response = {
    clearCookie: vi.fn(),
    cookie: vi.fn(),
    json: vi.fn(),
    status: vi.fn(),
  };

  response.clearCookie.mockReturnValue(response);
  response.cookie.mockReturnValue(response);
  response.json.mockReturnValue(response);
  response.status.mockReturnValue(response);

  return response as unknown as Response;
}

function expectClearedAuthCookies(response: Response) {
  expect(response.clearCookie).toHaveBeenCalledWith('accessToken', expect.objectContaining({
    httpOnly: true,
    path: '/',
  }));
  expect(response.clearCookie).toHaveBeenCalledWith('refreshToken', expect.objectContaining({
    httpOnly: true,
    path: '/',
  }));
}
