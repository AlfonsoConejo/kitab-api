import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import app from '../../../app.js';

describe('days-off routes CSRF protection', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    vi.stubEnv('ALLOWED_ORIGINS', 'https://app.kitab.test');

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

  it('rechaza la creación de un descanso con un origen no permitido', async () => {
    const response = await fetch(`${baseUrl}/api/periods/12/days-off`, {
      method: 'POST',
      headers: {
        Origin: 'https://untrusted.example',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Consejo técnico',
        type: 'day_off',
        startDate: '2026-09-10',
        endDate: '2026-09-10',
      }),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      code: 'INVALID_ORIGIN',
      message: 'Origen no permitido',
    });
  });
});
