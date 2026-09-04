import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { getUserIdOrRespond, type AuthenticatedRequest } from '../../shared/http/authenticated-request.js';
import { sendErrorResponse } from '../../shared/http/error-response.js';
import { periodIdSchema, periodSchema } from './periods.schemas.js';
import { PeriodsUseCases } from './application/periods.use-cases.js';
import { PgPeriodsRepository } from './infrastructure/pg-periods.repository.js';

const useCases = new PeriodsUseCases(new PgPeriodsRepository());

// Devuelve la respuesta estándar cuando la ruta no tiene un usuario autenticado.
// Valida y convierte el parámetro periodId de la URL a un número entero positivo.
const periodIdFrom = (req: Request) => {
  const validatedParams = periodIdSchema.parse(req.params);

  const periodId = validatedParams.periodId;

  return periodId;
};

// Obtiene el ID del usuario autenticado o responde 401 si no está disponible.
const userIdFrom = getUserIdOrRespond;
const sendError = (
  response: Response,
  error: unknown,
  uniqueMessage?: string,
) => sendErrorResponse(response, error, { uniqueMessage });

// Crea un período académico para el usuario autenticado.
export async function createPeriod( req: AuthenticatedRequest, res: Response) {
  const userId = userIdFrom(req, res);

  if (!userId) {
    return;
  }

  try {
    const validatedPeriod = periodSchema.parse(req.body);

    const period = await useCases.createPeriod(
      userId,
      validatedPeriod
    );

    return res.status(201).json({
      success: true,
      message: 'Periodo creado correctamente.',
      data: period
    });

  } catch (error) {
    return sendError(
      res,
      error,
      'Ya existe un periodo con ese nombre.'
    );
  }
}

// Obtiene todos los períodos académicos del usuario autenticado.
export async function getPeriods(req: AuthenticatedRequest, res: Response) {
  const userId = userIdFrom(req, res);

  if (!userId) {
    return;
  }

  try {
    const periods = await useCases.listPeriods(userId);

    return res.status(200).json({
      success: true,
      data: periods
    });
  } catch (error) {
    return sendError(res, error);
  }
}

// Obtiene un período si pertenece al usuario autenticado.
export async function getPeriod(req: AuthenticatedRequest, res: Response) {
  const userId = userIdFrom(req, res);

  if (!userId) {
    return;
  }

  try {
    const periodId = periodIdFrom(req);

    const period = await useCases.getPeriod(userId, periodId);

    return res.status(200).json({
      success: true,
      data: period
    });
  } catch (error) {
    return sendError(res, error);
  }
}

// Actualiza un período existente que pertenece al usuario autenticado.
export async function updatePeriod(req: AuthenticatedRequest, res: Response) {
  const userId = userIdFrom(req, res);

  if (!userId) {
    return;
  }

  try {
    const bodyIsEmpty =
      !req.body ||
      Object.keys(req.body).length === 0;

    if (bodyIsEmpty) {
      throw new ZodError([
        {
          code: 'custom',
          path: [],
          message: 'Debes enviar al menos un campo para actualizar.'
        }
      ]);
    }

    const periodId = periodIdFrom(req);

    const validatedPeriod = periodSchema.parse(req.body);

    const period = await useCases.updatePeriod(
      userId,
      periodId,
      validatedPeriod
    );

    if (!period) {
      return res.status(404).json({
        success: false,
        message: 'El periodo no existe o no te pertenece.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Periodo actualizado correctamente.',
      data: period
    });
  } catch (error) {
    return sendError(
      res,
      error,
      'Ya existe un periodo con ese nombre.'
    );
  }
}

// Elimina un período existente que pertenece al usuario autenticado.
export async function deletePeriod(req: AuthenticatedRequest, res: Response) {
  const userId = userIdFrom(req, res);

  if (!userId) {
    return;
  }

  try {
    const periodId = periodIdFrom(req);

    await useCases.deletePeriod(userId, periodId);

    return res.status(200).json({
      success: true,
      message: 'Periodo eliminado correctamente.'
    });
  } catch (error) {
    return sendError(res, error);
  }
}

// Obtiene las materias pertenecientes a un período del usuario autenticado.
export async function getSubjectsByPeriod(req: AuthenticatedRequest, res: Response) {
  const userId = userIdFrom(req, res);

  if (!userId) {
    return;
  }

  try {
    const periodId = periodIdFrom(req);

    const subjects = await useCases.listSubjects(userId, periodId);

    return res.status(200).json({
      success: true,
      data: subjects
    });
  } catch (error) {
    return sendError(res, error);
  }
}

// Obtiene las clases de todas las materias de un período del usuario autenticado.
export async function getClassesByPeriod(req: AuthenticatedRequest, res: Response) {
  const userId = userIdFrom(req, res);

  if (!userId) {
    return;
  }

  try {
    const periodId = periodIdFrom(req);

    const classes = await useCases.listClasses(userId, periodId);

    return res.status(200).json({
      success: true,
      data: classes
    });
  } catch (error) {
    return sendError(res, error);
  }
}

// Crea una materia y, opcionalmente, sus clases dentro de un período del usuario autenticado.
export async function createSubject(req: AuthenticatedRequest, res: Response) {
  const userId = userIdFrom(req, res);

  if (!userId) {
    return;
  }

  try {
    const periodId = periodIdFrom(req);

    const result = await useCases.createSubject(
      userId,
      periodId,
      req.body
    );

    return res.status(201).json({
      success: true,
      message: 'Materia creada correctamente.',
      ...result
    });
  } catch (error) {
    return sendError(
      res,
      error,
      'Ya existe una materia con ese nombre en este periodo.'
    );
  }
}
