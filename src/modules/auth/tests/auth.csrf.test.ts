import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

const { registerMock } = vi.hoisted(() => ({
  registerMock: vi.fn(),
}));

vi.mock('../application/auth.use-cases.js', () => ({
  AuthUseCases: class {
    register = registerMock;
  },
}));

import app from '../../../app.js';

const allowedOrigin = 'https://app.kitab.test';

describe('auth routes CSRF protection', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    vi.stubEnv('ALLOWED_ORIGINS', allowedOrigin);

    server = app.listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));

    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  beforeEach(() => {
    registerMock.mockReset();
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    vi.unstubAllEnvs();
  });

  it.each([
    { path: '/api/auth/register', body: validRegistration },
    { path: '/api/auth/login', body: { email: 'taylor@example.com', password: 'secure-password' } },
    { path: '/api/auth/refresh', headers: { Cookie: 'refreshToken=refresh-token' } },
    { path: '/api/auth/logout', headers: { Cookie: 'refreshToken=refresh-token' } },
    { path: '/api/auth/logout-all', headers: { Cookie: 'accessToken=access-token; refreshToken=refresh-token' } },
  ])('rechaza POST $path cuando el origen no está permitido', async ({ path, body, headers }) => {
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: {
        Origin: 'https://untrusted.example',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      code: 'INVALID_ORIGIN',
      message: 'Origen no permitido',
    });
  });

  it('permite registrar con un origen configurado', async () => {
    const user = {
      id: 7,
      firstName: 'Taylor',
      lastName: 'Swift',
      email: 'taylor@example.com',
      fullName: 'Taylor Swift',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: null,
    };
    registerMock.mockResolvedValue(user);

    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        Origin: `${allowedOrigin}/`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(validRegistration),
    });

    expect(registerMock).toHaveBeenCalledWith(validRegistration);
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      success: true,
      message: 'Usuario creado correctamente',
      user,
    });
  });
});

const validRegistration = {
  firstName: 'Taylor',
  lastName: 'Swift',
  email: 'taylor@example.com',
  password: 'secure-password',
};
