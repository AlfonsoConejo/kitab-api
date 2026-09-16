import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import app from '../../../app.js';

describe('period CRUD CSRF protection', () => {
  const allowedOrigin = 'https://app.kitab.test';
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    vi.stubEnv('FRONTEND_URL', allowedOrigin);

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
    {
      method: 'POST',
      path: '/api/periods',
      body: validPeriod,
    },
    {
      method: 'PUT',
      path: '/api/periods/12',
      body: validPeriod,
    },
    {
      method: 'DELETE',
      path: '/api/periods/12',
    },
  ])('rechaza $method $path cuando el origen no está permitido', async ({
    method,
    path,
    body,
  }) => {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        Origin: 'https://untrusted.example',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      code: 'INVALID_ORIGIN',
      message: 'Origen no permitido',
    });
  });
});

const validPeriod = {
  name: 'Agosto-Diciembre 2026',
  startDate: '2026-08-01',
  endDate: '2026-12-15',
  color: '#2563EB',
};
