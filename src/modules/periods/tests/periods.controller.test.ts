import type { Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthenticatedRequest } from '../../../shared/http/authenticated-request.js';

const { createPeriodMock, updatePeriodMock } = vi.hoisted(() => ({
  createPeriodMock: vi.fn(),
  updatePeriodMock: vi.fn(),
}));

vi.mock('../application/periods.use-cases.js', () => ({
  PeriodsUseCases: class {
    createPeriod = createPeriodMock;
    updatePeriod = updatePeriodMock;
  },
}));

import { createPeriod, updatePeriod } from '../periods.controller.js';

describe('updatePeriod controller', () => {
  beforeEach(() => {
    createPeriodMock.mockReset();
    updatePeriodMock.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('responde 404 cuando el caso de uso no encuentra el período actualizado', async () => {
    const body = {
      name: 'Agosto-Diciembre 2026',
      startDate: '2026-08-01',
      endDate: '2026-12-15',
      color: '#2563EB',
    };
    const request = {
      user: { id: 100 },
      params: { periodId: '12' },
      body,
    } as unknown as AuthenticatedRequest;
    const response = createResponseMock();

    updatePeriodMock.mockResolvedValue(null);

    await updatePeriod(request, response);

    expect(updatePeriodMock).toHaveBeenCalledWith(100, 12, body);
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      message: 'El periodo no existe o no te pertenece.',
    });
  });
});

describe('createPeriod controller errors', () => {
  const validBody = {
    name: 'Agosto-Diciembre 2026',
    startDate: '2026-08-01',
    endDate: '2026-12-15',
    color: '#2563EB',
  };

  beforeEach(() => {
    createPeriodMock.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('responde 401 cuando no hay un usuario autenticado', async () => {
    const request = { body: validBody } as AuthenticatedRequest;
    const response = createResponseMock();

    await createPeriod(request, response);

    expect(createPeriodMock).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      message: 'Usuario no autenticado',
    });
  });

  it('responde 400 cuando el payload no es válido', async () => {
    const request = {
      user: { id: 100 },
      body: { ...validBody, color: '#FFF' },
    } as AuthenticatedRequest;
    const response = createResponseMock();

    await createPeriod(request, response);

    expect(createPeriodMock).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      message: 'El color debe ser un código hexadecimal válido.',
    });
  });

  it('responde 409 cuando el nombre del período ya existe', async () => {
    const request = {
      user: { id: 100 },
      body: validBody,
    } as AuthenticatedRequest;
    const response = createResponseMock();

    createPeriodMock.mockRejectedValue({ code: '23505' });

    await createPeriod(request, response);

    expect(response.status).toHaveBeenCalledWith(409);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      message: 'Ya existe un periodo con ese nombre.',
    });
  });

  it('responde 500 ante un error no controlado', async () => {
    const request = {
      user: { id: 100 },
      body: validBody,
    } as AuthenticatedRequest;
    const response = createResponseMock();

    createPeriodMock.mockRejectedValue(new Error('Database unavailable'));

    await createPeriod(request, response);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      message: 'Error interno del servidor.',
    });
  });
});

function createResponseMock() {
  const response = {
    status: vi.fn(),
    json: vi.fn(),
  };

  response.status.mockReturnValue(response);
  response.json.mockReturnValue(response);

  return response as unknown as Response;
}
