import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import cookieParser from 'cookie-parser';
import express from 'express';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
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

vi.mock('../../../middleware/auth.middleware.js', () => ({
  authMiddleware: (
    request: { user?: { id: number; sid: number } },
    _response: unknown,
    next: () => void,
  ) => {
    request.user = { id: 7, sid: 19 };
    next();
  },
}));

import authRoutes from '../auth.routes.js';

const user = {
  id: 7,
  firstName: 'Taylor',
  lastName: 'Swift',
  email: 'taylor@example.com',
  fullName: 'Taylor Swift',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: null,
};

describe('auth routes', () => {
  const app = express();
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    app.use(express.json());
    app.use(cookieParser());
    app.use('/api/auth', authRoutes);

    server = app.listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));

    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  beforeEach(() => {
    getCurrentUserMock.mockReset();
    loginMock.mockReset();
    logoutAllMock.mockReset();
    logoutMock.mockReset();
    refreshMock.mockReset();
    registerMock.mockReset();
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it('registra un usuario con el payload normalizado', async () => {
    registerMock.mockResolvedValue(user);

    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: '  Taylor  ',
        lastName: '  Swift  ',
        email: '  TAYLOR@EXAMPLE.COM  ',
        password: 'secure-password',
      }),
    });

    expect(registerMock).toHaveBeenCalledWith({
      firstName: 'Taylor', lastName: 'Swift', email: 'taylor@example.com', password: 'secure-password',
    });
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      success: true, message: 'Usuario creado correctamente', user,
    });
  });

  it('rechaza un registro inválido antes de llamar al caso de uso', async () => {
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validRegistration, email: 'correo-invalido' }),
    });

    expect(registerMock).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      success: false, message: 'El correo electrónico es inválido.',
    });
  });

  it('responde 409 si el correo ya está registrado', async () => {
    registerMock.mockRejectedValue(new UserAlreadyExistsError());

    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validRegistration),
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ success: false, message: 'El usuario ya existe' });
  });

  it('inicia sesión, emite cookies HttpOnly y no expone tokens en el cuerpo', async () => {
    loginMock.mockResolvedValue({
      user,
      sessionId: 19,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });

    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ' TAYLOR@EXAMPLE.COM ', password: 'secure-password' }),
    });

    expect(loginMock).toHaveBeenCalledWith(
      { email: 'taylor@example.com', password: 'secure-password' },
      expect.anything(),
    );
    expect(response.headers.get('set-cookie')).toContain('accessToken=access-token');
    expect(response.headers.get('set-cookie')).toContain('refreshToken=refresh-token');
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      message: 'Login exitoso',
      data: { user, session: { id: 19 } },
    });
  });

  it('responde 401 ante credenciales inválidas', async () => {
    loginMock.mockRejectedValue(new InvalidCredentialsError());

    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, password: 'wrong-password' }),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      success: false, message: 'Usuario o contraseña incorrectos',
    });
  });

  it('devuelve el perfil del usuario autenticado', async () => {
    getCurrentUserMock.mockResolvedValue(user);

    const response = await fetch(`${baseUrl}/api/auth/me`);

    expect(getCurrentUserMock).toHaveBeenCalledWith(7);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, data: { user } });
  });

  it('responde 404 si el usuario autenticado ya no existe', async () => {
    getCurrentUserMock.mockRejectedValue(new UserNotFoundError());

    const response = await fetch(`${baseUrl}/api/auth/me`);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ success: false, message: 'Usuario no encontrado' });
  });

  it('exige una cookie de refresh token para renovarlo', async () => {
    const response = await fetch(`${baseUrl}/api/auth/refresh`, { method: 'POST' });

    expect(refreshMock).not.toHaveBeenCalled();
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ success: false, message: 'Refresh token requerido' });
  });

  it('rota las cookies al renovar un refresh token válido', async () => {
    refreshMock.mockResolvedValue({ accessToken: 'new-access-token', refreshToken: 'new-refresh-token' });

    const response = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: 'refreshToken=old-refresh-token' },
    });

    expect(refreshMock).toHaveBeenCalledWith('old-refresh-token');
    expect(response.headers.get('set-cookie')).toContain('accessToken=new-access-token');
    expect(response.headers.get('set-cookie')).toContain('refreshToken=new-refresh-token');
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, message: 'Token renovado exitosamente' });
  });

  it('elimina las cookies si falla la renovación del token', async () => {
    refreshMock.mockRejectedValue(new RefreshTokenError('Refresh token expirado', 'REFRESH_TOKEN_EXPIRED'));

    const response = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: 'refreshToken=expired-token' },
    });

    expect(response.headers.get('set-cookie')).toContain('accessToken=;');
    expect(response.headers.get('set-cookie')).toContain('refreshToken=;');
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ success: false, message: 'Refresh token expirado' });
  });

  it('cierra la sesión actual y elimina las cookies', async () => {
    const response = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: 'refreshToken=refresh-token' },
    });

    expect(logoutMock).toHaveBeenCalledWith('refresh-token', undefined);
    expect(response.headers.get('set-cookie')).toContain('accessToken=;');
    expect(response.headers.get('set-cookie')).toContain('refreshToken=;');
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, message: 'Sesión cerrada exitosamente' });
  });

  it('devuelve 403 al intentar cerrar la sesión de otro usuario', async () => {
    logoutMock.mockRejectedValue(new LogoutForbiddenError('No autorizado para cerrar esta sesión.'));

    const response = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: 'refreshToken=other-user-token' },
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      success: false, message: 'No autorizado para cerrar esta sesión.',
    });
  });

  it('cierra todas las sesiones del usuario autenticado', async () => {
    logoutAllMock.mockResolvedValue(3);

    const response = await fetch(`${baseUrl}/api/auth/logout-all`, {
      method: 'POST',
      headers: { Cookie: 'refreshToken=refresh-token' },
    });

    expect(logoutAllMock).toHaveBeenCalledWith('refresh-token', 7);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true, message: 'Se cerraron 3 sesiones correctamente',
    });
  });

  it('propaga la protección de propiedad al cerrar todas las sesiones', async () => {
    logoutAllMock.mockRejectedValue(new LogoutForbiddenError('No autorizado para cerrar estas sesiones'));

    const response = await fetch(`${baseUrl}/api/auth/logout-all`, { method: 'POST' });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      success: false, message: 'No autorizado para cerrar estas sesiones',
    });
  });
});

const validRegistration = {
  firstName: 'Taylor',
  lastName: 'Swift',
  email: 'taylor@example.com',
  password: 'secure-password',
};
