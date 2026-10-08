import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import app from '../../../app.js';

describe('subject routes CSRF protection', () => {
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

  it.each([
    { method: 'POST', path: '/api/periods/12/subjects' },
    { method: 'PUT', path: '/api/subjects/12' },
    { method: 'DELETE', path: '/api/subjects/12' },
    { method: 'POST', path: '/api/subjects/12/classes' },
    { method: 'POST', path: '/api/periods/12/classes/conflicts/external' },
    { method: 'POST', path: '/api/subjects/12/classes/conflicts/external' },
    { method: 'POST', path: '/api/subjects/classes/conflicts/internal' },
  ])('rechaza $method $path cuando el origen no está permitido', async ({ method, path }) => {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        Origin: 'https://untrusted.example',
      },
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      code: 'INVALID_ORIGIN',
      message: 'Origen no permitido',
    });
  });
});
