import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import app from '../../../app.js';

describe('days-off routes authentication', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));

    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it('responde 401 al listar descansos sin access token', async () => {
    const response = await fetch(`${baseUrl}/api/periods/12/days-off`);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      code: 'NO_ACCESS_TOKEN',
      message: 'Acceso denegado',
    });
  });
});
