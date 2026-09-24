import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import app from '../../../app.js';

describe('auth routes authentication', () => {
  const allowedOrigin = 'https://app.kitab.test';
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    vi.stubEnv('ALLOWED_ORIGINS', allowedOrigin);

    server = app.listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));

    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    vi.unstubAllEnvs();
  });

  it('responde 401 cuando se consulta el perfil sin access token', async () => {
    const response = await fetch(`${baseUrl}/api/auth/me`);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      code: 'NO_ACCESS_TOKEN',
      message: 'Acceso denegado',
    });
  });

  it('responde 401 al cerrar todas las sesiones sin access token', async () => {
    const response = await fetch(`${baseUrl}/api/auth/logout-all`, {
      method: 'POST',
      headers: { Origin: allowedOrigin },
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      code: 'NO_ACCESS_TOKEN',
      message: 'Acceso denegado',
    });
  });
});
