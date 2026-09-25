import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { DayOffNotFoundError } from '../days-off.errors.js';

const {
  createMock,
  deleteMock,
  getByIdMock,
  listByPeriodMock,
  updateMock,
} = vi.hoisted(() => ({
  createMock: vi.fn(),
  deleteMock: vi.fn(),
  getByIdMock: vi.fn(),
  listByPeriodMock: vi.fn(),
  updateMock: vi.fn(),
}));

vi.mock('../application/days-off.use-cases.js', () => ({
  DaysOffUseCases: class {
    create = createMock;
    delete = deleteMock;
    getById = getByIdMock;
    listByPeriod = listByPeriodMock;
    update = updateMock;
  },
}));

vi.mock('../../../middleware/auth.middleware.js', () => ({
  authMiddleware: (
    request: { user?: { id: number } },
    _response: unknown,
    next: () => void,
  ) => {
    request.user = { id: 100 };
    next();
  },
}));

import daysOffRoutes from '../days-off.routes.js';
import periodDaysOffRoutes from '../period-days-off.routes.js';

const dayOff = {
  id: 25,
  periodId: 12,
  name: 'Consejo técnico',
  type: 'day_off' as const,
  startDate: '2026-09-10',
  endDate: '2026-09-10',
  notes: null,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

const validPayload = {
  name: 'Consejo técnico',
  type: 'day_off',
  startDate: '2026-09-10',
  endDate: '2026-09-10',
  notes: null,
};

describe('days-off routes', () => {
  const app = express();
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    app.use(express.json());
    app.use('/api/periods/:periodId/days-off', periodDaysOffRoutes);
    app.use('/api/days-off', daysOffRoutes);

    server = app.listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));

    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  beforeEach(() => {
    createMock.mockReset();
    deleteMock.mockReset();
    getByIdMock.mockReset();
    listByPeriodMock.mockReset();
    updateMock.mockReset();
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it('lista los descansos del período indicado en la ruta padre', async () => {
    listByPeriodMock.mockResolvedValue([dayOff]);

    const response = await fetch(`${baseUrl}/api/periods/12/days-off`);

    expect(listByPeriodMock).toHaveBeenCalledWith(100, 12);
    expect(response.status).toBe(200);
  });

  it('crea un descanso dentro del período', async () => {
    createMock.mockResolvedValue(dayOff);

    const response = await fetch(`${baseUrl}/api/periods/12/days-off`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload),
    });

    expect(createMock).toHaveBeenCalledWith(100, 12, validPayload);
    expect(response.status).toBe(201);
  });

  it('obtiene un descanso por su identificador e infiere el período', async () => {
    getByIdMock.mockResolvedValue(dayOff);

    const response = await fetch(`${baseUrl}/api/days-off/25`);

    expect(getByIdMock).toHaveBeenCalledWith(100, 25);
    await expect(response.json()).resolves.toEqual({ success: true, data: dayOff });
  });

  it('actualiza un descanso por su identificador e infiere el período', async () => {
    updateMock.mockResolvedValue({ ...dayOff, name: 'Vacaciones', type: 'vacation' });

    const response = await fetch(`${baseUrl}/api/days-off/25`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validPayload, name: 'Vacaciones', type: 'vacation' }),
    });

    expect(updateMock).toHaveBeenCalledWith(100, 25, {
      ...validPayload,
      name: 'Vacaciones',
      type: 'vacation',
    });
    expect(response.status).toBe(200);
  });

  it('elimina un descanso por su identificador e infiere el período', async () => {
    deleteMock.mockResolvedValue(undefined);

    const response = await fetch(`${baseUrl}/api/days-off/25`, { method: 'DELETE' });

    expect(deleteMock).toHaveBeenCalledWith(100, 25);
    await expect(response.json()).resolves.toEqual({
      success: true,
      message: 'Descanso eliminado correctamente.',
    });
  });

  it('rechaza un periodId inválido en una operación de colección', async () => {
    const response = await fetch(`${baseUrl}/api/periods/invalid/days-off`);

    expect(listByPeriodMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: 'El ID del período no es válido.',
    });
  });

  it('rechaza un dayOffId inválido en una operación individual', async () => {
    const response = await fetch(`${baseUrl}/api/days-off/invalid`);

    expect(getByIdMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: 'El ID del descanso no es válido.',
    });
  });

  it('no expone un descanso de otro usuario', async () => {
    getByIdMock.mockRejectedValue(new DayOffNotFoundError());

    const response = await fetch(`${baseUrl}/api/days-off/25`);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: 'El descanso no existe o no te pertenece.',
    });
  });
});

