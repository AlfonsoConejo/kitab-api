import type { Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';
import type { AuthenticatedRequest } from '../../../shared/http/authenticated-request.js';
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

import {
  createDayOff,
  deleteDayOff,
  getDayOffById,
  getDaysOffByPeriod,
  updateDayOff,
} from '../days-off.controller.js';

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

describe('days-off controllers', () => {
  beforeEach(() => {
    createMock.mockReset();
    deleteMock.mockReset();
    getByIdMock.mockReset();
    listByPeriodMock.mockReset();
    updateMock.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lista los descansos de un período', async () => {
    const response = createResponseMock();
    listByPeriodMock.mockResolvedValue([dayOff]);

    await getDaysOffByPeriod(request({ periodId: '12' }), response);

    expect(listByPeriodMock).toHaveBeenCalledWith(100, 12);
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({ success: true, data: [dayOff] });
  });

  it('obtiene un descanso por ID', async () => {
    const response = createResponseMock();
    getByIdMock.mockResolvedValue(dayOff);

    await getDayOffById(request({ periodId: '12', dayOffId: '25' }), response);

    expect(getByIdMock).toHaveBeenCalledWith(100, 12, 25);
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({ success: true, data: dayOff });
  });

  it('crea un descanso y devuelve 201', async () => {
    const response = createResponseMock();
    createMock.mockResolvedValue(dayOff);

    await createDayOff(request({ periodId: '12' }, validPayload), response);

    expect(createMock).toHaveBeenCalledWith(100, 12, validPayload);
    expect(response.status).toHaveBeenCalledWith(201);
    expect(response.json).toHaveBeenCalledWith({
      success: true,
      message: 'Descanso creado correctamente.',
      data: dayOff,
    });
  });

  it('actualiza un descanso y devuelve su DTO actualizado', async () => {
    const response = createResponseMock();
    const updatedDayOff = {
      ...dayOff,
      ...updatePayload,
      type: 'vacation' as const,
    };
    updateMock.mockResolvedValue(updatedDayOff);

    await updateDayOff(request({ periodId: '12', dayOffId: '25' }, updatePayload), response);

    expect(updateMock).toHaveBeenCalledWith(100, 12, 25, updatePayload);
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({
      success: true,
      message: 'Descanso actualizado correctamente.',
      data: updatedDayOff,
    });
  });

  it('elimina un descanso', async () => {
    const response = createResponseMock();
    deleteMock.mockResolvedValue(undefined);

    await deleteDayOff(request({ periodId: '12', dayOffId: '25' }), response);

    expect(deleteMock).toHaveBeenCalledWith(100, 12, 25);
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({
      success: true,
      message: 'Descanso eliminado correctamente.',
    });
  });

  it('responde 401 sin usuario autenticado', async () => {
    const response = createResponseMock();

    const request = {
      params: { periodId: '12' },
      body: validPayload,
    } as unknown as AuthenticatedRequest;

    await createDayOff(request, response);

    expect(createMock).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      message: 'Usuario no autenticado',
    });
  });

  it('responde 400 con un periodId inválido', async () => {
    const response = createResponseMock();

    await getDaysOffByPeriod(request({ periodId: 'invalid' }), response);

    expect(listByPeriodMock).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      message: 'El ID del período no es válido.',
    });
  });

  it('responde 400 con un dayOffId inválido', async () => {
    const response = createResponseMock();

    await getDayOffById(request({ periodId: '12', dayOffId: 'invalid' }), response);

    expect(getByIdMock).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      message: 'El ID del descanso no es válido.',
    });
  });

  it('responde 400 cuando el caso de uso rechaza un payload inválido', async () => {
    const response = createResponseMock();
    createMock.mockRejectedValue(new ZodError([
      {
        code: 'custom',
        path: ['endDate'],
        message: 'Un día libre debe iniciar y terminar en la misma fecha.',
      },
    ]));

    await createDayOff(request({ periodId: '12' }, validPayload), response);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      message: 'Un día libre debe iniciar y terminar en la misma fecha.',
    });
  });

  it('responde 404 cuando el período no existe o no pertenece al usuario', async () => {
    const response = createResponseMock();
    getByIdMock.mockRejectedValue(new DayOffPeriodNotFoundError());

    await getDayOffById(request({ periodId: '12', dayOffId: '25' }), response);

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      message: 'El período no existe o no te pertenece.',
    });
  });

  it('responde 404 cuando el descanso no existe o no pertenece al período', async () => {
    const response = createResponseMock();
    getByIdMock.mockRejectedValue(new DayOffNotFoundError());

    await getDayOffById(request({ periodId: '12', dayOffId: '25' }), response);

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      message: 'El descanso no existe o no pertenece al período.',
    });
  });

  it('responde 500 ante un error no controlado', async () => {
    const response = createResponseMock();
    createMock.mockRejectedValue(new Error('Database unavailable'));

    await createDayOff(request({ periodId: '12' }, validPayload), response);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      message: 'Error interno del servidor.',
    });
  });
});

function request(
  params: Record<string, string>,
  body: unknown = undefined,
): AuthenticatedRequest {
  return {
    user: { id: 100 },
    params,
    body,
  } as unknown as AuthenticatedRequest;
}

function createResponseMock() {
  const response = {
    status: vi.fn(),
    json: vi.fn(),
  };

  response.status.mockReturnValue(response);
  response.json.mockReturnValue(response);

  return response as unknown as Response;
}
