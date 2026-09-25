import type { Request, Response } from 'express';
import { getUserIdOrRespond, type AuthenticatedRequest } from '../../shared/http/authenticated-request.js';
import { sendErrorResponse } from '../../shared/http/error-response.js';
import { DaysOffUseCases } from './application/days-off.use-cases.js';
import { PgDaysOffRepository } from './infrastructure/pg-days-off.repository.js';
import { dayOffIdSchema, daysOffPeriodIdSchema } from './days-off.schemas.js';

const useCases = new DaysOffUseCases(new PgDaysOffRepository());

// Valida y convierte el identificador de período de la URL.
const periodIdFrom = (request: Request) => {
  return daysOffPeriodIdSchema.parse(request.params).periodId;
};

// Valida y convierte el identificador de descanso de la URL.
const dayOffIdFrom = (request: Request) => {
  return dayOffIdSchema.parse(request.params).dayOffId;
};

// Obtiene los días libres del período perteneciente al usuario autenticado.
export async function getDaysOffByPeriod(
  request: AuthenticatedRequest,
  response: Response,
) {
  const userId = getUserIdOrRespond(request, response);

  if (!userId) {
    return;
  }

  try {
    const periodId = periodIdFrom(request);
    const daysOff = await useCases.listByPeriod(userId, periodId);

    return response.status(200).json({
      success: true,
      data: daysOff,
    });
  } catch (error) {
    return sendErrorResponse(response, error);
  }
}

// Obtiene un descanso y deriva su período a partir de su identificador.
export async function getDayOffById(
  request: AuthenticatedRequest,
  response: Response,
) {
  const userId = getUserIdOrRespond(request, response);

  if (!userId) {
    return;
  }

  try {
    const dayOffId = dayOffIdFrom(request);
    const dayOff = await useCases.getById(userId, dayOffId);

    return response.status(200).json({
      success: true,
      data: dayOff,
    });
  } catch (error) {
    return sendErrorResponse(response, error);
  }
}

// Crea un día libre dentro de un período perteneciente al usuario autenticado.
export async function createDayOff(
  request: AuthenticatedRequest,
  response: Response,
) {
  const userId = getUserIdOrRespond(request, response);

  if (!userId) {
    return;
  }

  try {
    const periodId = periodIdFrom(request);
    const dayOff = await useCases.create(userId, periodId, request.body);

    return response.status(201).json({
      success: true,
      message: 'Descanso creado correctamente.',
      data: dayOff,
    });
  } catch (error) {
    return sendErrorResponse(response, error);
  }
}

// Actualiza un descanso e infiere su período para validar el rango de fechas.
export async function updateDayOff(
  request: AuthenticatedRequest,
  response: Response,
) {
  const userId = getUserIdOrRespond(request, response);

  if (!userId) {
    return;
  }

  try {
    const dayOffId = dayOffIdFrom(request);
    const dayOff = await useCases.update(
      userId,
      dayOffId,
      request.body,
    );

    return response.status(200).json({
      success: true,
      message: 'Descanso actualizado correctamente.',
      data: dayOff,
    });
  } catch (error) {
    return sendErrorResponse(response, error);
  }
}

// Elimina un descanso después de comprobar la propiedad de su período inferido.
export async function deleteDayOff(
  request: AuthenticatedRequest,
  response: Response,
) {
  const userId = getUserIdOrRespond(request, response);

  if (!userId) {
    return;
  }

  try {
    const dayOffId = dayOffIdFrom(request);
    await useCases.delete(userId, dayOffId);

    return response.status(200).json({
      success: true,
      message: 'Descanso eliminado correctamente.',
    });
  } catch (error) {
    return sendErrorResponse(response, error);
  }
}
