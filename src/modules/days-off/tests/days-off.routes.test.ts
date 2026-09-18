import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { DayOffNotFoundError, DayOffPeriodNotFoundError } from '../days-off.errors.js';

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

const updatePayload = {
  name: 'Vacaciones de invierno',
  type: 'vacation',
  startDate: '2026-12-15',
  endDate: '2026-12-31',
  notes: null,
};

describe('days-off routes', () => {
  const app = express();
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    app.use(express.json());
    app.use('/api/periods/:periodId/days-off', daysOffRoutes);

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
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: [dayOff],
    });
  });

  it('obtiene un descanso por ID dentro del período', async () => {
    getByIdMock.mockResolvedValue(dayOff);

    const response = await fetch(`${baseUrl}/api/periods/12/days-off/25`);

    expect(getByIdMock).toHaveBeenCalledWith(100, 12, 25);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: dayOff,
    });
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
    await expect(response.json()).resolves.toEqual({
      success: true,
      message: 'Descanso creado correctamente.',
      data: dayOff,
    });
  });

  it('actualiza un descanso dentro del período', async () => {
    const updatedDayOff = {
      ...dayOff,
      ...updatePayload,
      type: 'vacation' as const,
    };

    updateMock.mockResolvedValue(updatedDayOff);

    const response = await fetch(`${baseUrl}/api/periods/12/days-off/25`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatePayload),
    });

    expect(updateMock).toHaveBeenCalledWith(100, 12, 25, updatePayload);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      message: 'Descanso actualizado correctamente.',
      data: updatedDayOff,
    });
  });

  it('elimina un descanso dentro del período', async () => {
    deleteMock.mockResolvedValue(undefined);

    const response = await fetch(`${baseUrl}/api/periods/12/days-off/25`, {
      method: 'DELETE',
    });

    expect(deleteMock).toHaveBeenCalledWith(100, 12, 25);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      message: 'Descanso eliminado correctamente.',
    });
  });

  it('rechaza un periodId inválido antes de consultar el caso de uso', async () => {
    const response = await fetch(`${baseUrl}/api/periods/invalid/days-off`);

    expect(listByPeriodMock).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: 'El ID del período no es válido.',
    });
  });

  it('rechaza un dayOffId inválido antes de consultar el caso de uso', async () => {
    const response = await fetch(`${baseUrl}/api/periods/12/days-off/invalid`);

    expect(getByIdMock).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: 'El ID del descanso no es válido.',
    });
  });

  it('no devuelve un descanso de un período ajeno', async () => {
    getByIdMock.mockRejectedValue(new DayOffNotFoundError());

    const response = await fetch(`${baseUrl}/api/periods/12/days-off/25`);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: 'El descanso no existe o no pertenece al período.',
    });
  });

  it('no actualiza un descanso cuando el período no pertenece al usuario', async () => {
    updateMock.mockRejectedValue(new DayOffPeriodNotFoundError());

    const response = await fetch(`${baseUrl}/api/periods/12/days-off/25`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: 'El período no existe o no te pertenece.',
    });
  });

  it('no elimina un descanso de un período ajeno', async () => {
    deleteMock.mockRejectedValue(new DayOffNotFoundError());

    const response = await fetch(`${baseUrl}/api/periods/12/days-off/25`, {
      method: 'DELETE',
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: 'El descanso no existe o no pertenece al período.',
    });
  });
});
