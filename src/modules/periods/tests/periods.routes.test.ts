import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { PeriodNotFoundError } from '../periods.errors.js';

const {
  createPeriodMock,
  deletePeriodMock,
  getPeriodMock,
  listPeriodsMock,
  updatePeriodMock,
} = vi.hoisted(() => ({
  createPeriodMock: vi.fn(),
  deletePeriodMock: vi.fn(),
  getPeriodMock: vi.fn(),
  listPeriodsMock: vi.fn(),
  updatePeriodMock: vi.fn(),
}));

vi.mock('../application/periods.use-cases.js', () => ({
  PeriodsUseCases: class {
    createPeriod = createPeriodMock;
    deletePeriod = deletePeriodMock;
    getPeriod = getPeriodMock;
    listPeriods = listPeriodsMock;
    updatePeriod = updatePeriodMock;
  },
}));

vi.mock('../../../middleware/auth.middleware.js', () => ({
  authMiddleware: (
    request: { user?: { id: number } },
    _response: unknown,
    next: () => void,
  ) => {
    request.user = { id: 200 };
    next();
  },
}));

import periodRoutes from '../periods.routes.js';

describe('period routes - resource ownership', () => {
  const app = express();
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    app.use(express.json());
    app.use('/api/periods', periodRoutes);

    server = app.listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));

    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  beforeEach(() => {
    createPeriodMock.mockReset();
    deletePeriodMock.mockReset();
    getPeriodMock.mockReset();
    listPeriodsMock.mockReset();
    updatePeriodMock.mockReset();
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it('crea un período y devuelve 201 con su DTO', async () => {
    const createdPeriod = {
      id: 12,
      ...validPeriod,
      userId: 200,
      createdAt: '2026-08-01T00:00:00.000Z',
    };
    createPeriodMock.mockResolvedValue(createdPeriod);

    const response = await fetch(`${baseUrl}/api/periods`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPeriod),
    });

    expect(createPeriodMock).toHaveBeenCalledWith(200, validPeriod);
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      success: true,
      message: 'Periodo creado correctamente.',
      data: createdPeriod,
    });
  });

  it('devuelve los períodos del usuario autenticado', async () => {
    const periods = [
      {
        id: 12,
        ...validPeriod,
        userId: 200,
        createdAt: '2026-08-01T00:00:00.000Z',
      },
    ];
    listPeriodsMock.mockResolvedValue(periods);

    const response = await fetch(`${baseUrl}/api/periods`);

    expect(listPeriodsMock).toHaveBeenCalledWith(200);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: periods,
    });
  });

  it('devuelve un período del usuario autenticado', async () => {
    const period = {
      id: 12,
      ...validPeriod,
      userId: 200,
      createdAt: '2026-08-01T00:00:00.000Z',
    };
    getPeriodMock.mockResolvedValue(period);

    const response = await fetch(`${baseUrl}/api/periods/12`);

    expect(getPeriodMock).toHaveBeenCalledWith(200, 12);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: period,
    });
  });

  it('actualiza un período y devuelve su DTO actualizado', async () => {
    const updatedPeriod = {
      id: 12,
      ...validPeriod,
      name: 'Enero-Junio 2027',
      userId: 200,
      createdAt: '2026-08-01T00:00:00.000Z',
    };
    updatePeriodMock.mockResolvedValue(updatedPeriod);

    const response = await fetch(`${baseUrl}/api/periods/12`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPeriod),
    });

    expect(updatePeriodMock).toHaveBeenCalledWith(200, 12, validPeriod);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      message: 'Periodo actualizado correctamente.',
      data: updatedPeriod,
    });
  });

  it('responde 409 cuando el nuevo nombre del período ya existe', async () => {
    updatePeriodMock.mockRejectedValue({ code: '23505' });

    const response = await fetch(`${baseUrl}/api/periods/12`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPeriod),
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: 'Ya existe un periodo con ese nombre.',
    });
  });

  it('rechaza la actualización cuando el body está vacío', async () => {
    const response = await fetch(`${baseUrl}/api/periods/12`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(updatePeriodMock).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: 'Debes enviar al menos un campo para actualizar.',
    });
  });

  it('rechaza un ID de período inválido antes de consultar el caso de uso', async () => {
    const response = await fetch(`${baseUrl}/api/periods/invalid`);

    expect(getPeriodMock).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: 'El ID del período no es válido.',
    });
  });

  it('elimina un período del usuario autenticado', async () => {
    deletePeriodMock.mockResolvedValue(undefined);

    const response = await fetch(`${baseUrl}/api/periods/12`, {
      method: 'DELETE',
    });

    expect(deletePeriodMock).toHaveBeenCalledWith(200, 12);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      message: 'Periodo eliminado correctamente.',
    });
  });

  it('no devuelve un período que pertenece a otro usuario', async () => {
    getPeriodMock.mockRejectedValue(new PeriodNotFoundError());

    const response = await fetch(`${baseUrl}/api/periods/12`);

    expect(getPeriodMock).toHaveBeenCalledWith(200, 12);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: 'El periodo no existe o no te pertenece.',
    });
    expect(response.status).toBe(404);
  });

  it('no actualiza un período que pertenece a otro usuario', async () => {
    updatePeriodMock.mockRejectedValue(new PeriodNotFoundError());

    const response = await fetch(`${baseUrl}/api/periods/12`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPeriod),
    });

    expect(updatePeriodMock).toHaveBeenCalledWith(200, 12, validPeriod);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: 'El periodo no existe o no te pertenece.',
    });
    expect(response.status).toBe(404);
  });

  it('no elimina un período que pertenece a otro usuario', async () => {
    deletePeriodMock.mockRejectedValue(new PeriodNotFoundError());

    const response = await fetch(`${baseUrl}/api/periods/12`, {
      method: 'DELETE',
    });

    expect(deletePeriodMock).toHaveBeenCalledWith(200, 12);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: 'El periodo no existe o no te pertenece.',
    });
    expect(response.status).toBe(404);
  });
});

const validPeriod = {
  name: 'Agosto-Diciembre 2026',
  startDate: '2026-08-01',
  endDate: '2026-12-15',
  color: '#2563EB',
};
