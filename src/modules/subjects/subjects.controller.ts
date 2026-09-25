import type { Request, Response } from 'express';
import { sendErrorResponse } from '../../shared/http/error-response.js';
import { getUserIdOrRespond, type AuthenticatedRequest } from '../../shared/http/authenticated-request.js';
import { SubjectsUseCases } from './application/subjects.use-cases.js';
import { PgSubjectsRepository } from './infrastructure/pg-subjects.repository.js';
import {
  createClassesSchema,
  externalConflictsSchema,
  internalConflictsSchema,
  periodIdParamsSchema,
  subjectIdParamsSchema,
} from './subjects.schemas.js';

const useCases = new SubjectsUseCases(new PgSubjectsRepository());

function subjectIdFrom(request: AuthenticatedRequest): number {
  return subjectIdParamsSchema.parse(request.params).subjectId;
}

function periodIdFrom(request: Request): number {
  return periodIdParamsSchema.parse(request.params).periodId;
}

// Obtiene las materias de un período perteneciente al usuario autenticado.
export async function getSubjectsByPeriod(
  request: AuthenticatedRequest,
  response: Response,
) {
  const userId = getUserIdOrRespond(request, response);

  if (!userId) {
    return;
  }

  try {
    const periodId = periodIdFrom(request);
    const subjects = await useCases.listSubjects(userId, periodId);

    return response.status(200).json({
      success: true,
      data: subjects,
    });
  } catch (error) {
    return sendErrorResponse(response, error);
  }
}

// Crea una materia y sus clases opcionales dentro de un período del usuario autenticado.
export async function createSubject(
  request: AuthenticatedRequest,
  response: Response,
) {
  const userId = getUserIdOrRespond(request, response);

  if (!userId) {
    return;
  }

  try {
    const periodId = periodIdFrom(request);
    const result = await useCases.createSubject(userId, periodId, request.body);

    return response.status(201).json({
      success: true,
      message: 'Materia creada correctamente.',
      ...result,
    });
  } catch (error) {
    return sendErrorResponse(response, error, {
      uniqueMessage: 'Ya existe una materia con ese nombre en este periodo.',
    });
  }
}

// Crea una o más clases para una materia que pertenece al usuario autenticado.
export async function createClasses(request: AuthenticatedRequest, response: Response) {
  const userId = getUserIdOrRespond(request, response);

  if (!userId) {
    return;
  }

  try {
    const subjectId = subjectIdFrom(request);
    const { classes } = createClassesSchema.parse(request.body);
    const createdClasses = await useCases.createClasses(userId, subjectId, classes);

    return response.status(201).json({
      success: true,
      message: 'Clases creadas correctamente.',
      classes: createdClasses,
    });
  } catch (error) {
    return sendErrorResponse(response, error);
  }
}

// Actualiza una materia y aplica los cambios solicitados a sus clases en una transacción.
export async function updateSubject(request: AuthenticatedRequest, response: Response) {
  const userId = getUserIdOrRespond(request, response);

  if (!userId) {
    return;
  }

  try {
    const subjectId = subjectIdFrom(request);
    const result = await useCases.updateSubject(userId, subjectId, request.body);

    return response.status(200).json({
      success: true,
      message: 'Materia actualizada correctamente.',
      ...result,
    });
  } catch (error) {
    return sendErrorResponse(response, error);
  }
}

// Elimina una materia que pertenece al usuario autenticado.
export async function deleteSubject(request: AuthenticatedRequest, response: Response) {
  const userId = getUserIdOrRespond(request, response);

  if (!userId) {
    return;
  }

  try {
    const subjectId = subjectIdFrom(request);

    await useCases.deleteSubject(userId, subjectId);

    return response.status(200).json({
      success: true,
      message: 'Materia eliminada correctamente.',
    });
  } catch (error) {
    return sendErrorResponse(response, error);
  }
}

// Obtiene una materia del usuario autenticado junto con todas sus clases.
export async function getSubjectWithClasses(request: AuthenticatedRequest, response: Response) {
  const userId = getUserIdOrRespond(request, response);

  if (!userId) {
    return;
  }

  try {
    const subjectId = subjectIdFrom(request);
    const subject = await useCases.getSubjectWithClasses(userId, subjectId);

    return response.status(200).json({
      success: true,
      data: subject,
    });
  } catch (error) {
    return sendErrorResponse(response, error);
  }
}

// Busca conflictos de horario entre clases enviadas y clases persistidas en el mismo período.
export async function checkExternalConflicts(request: AuthenticatedRequest, response: Response) {
  const userId = getUserIdOrRespond(request, response);

  if (!userId) {
    return;
  }

  try {
    const { periodId, subjectId, classes } = externalConflictsSchema.parse(request.body);
    const externalConflicts = await useCases.checkExternalConflicts(userId, periodId, subjectId ?? null, classes);

    return response.status(200).json({
      success: true,
      externalConflicts,
    });
  } catch (error) {
    return sendErrorResponse(response, error);
  }
}

// Busca conflictos de horario entre las clases incluidas en un mismo payload.
export async function checkInternalConflicts(request: AuthenticatedRequest, response: Response) {
  const userId = getUserIdOrRespond(request, response);

  if (!userId) {
    return;
  }

  try {
    const { classes } = internalConflictsSchema.parse(request.body);
    const internalConflicts = useCases.checkInternalConflicts(classes);

    return response.status(200).json({
      success: true,
      internalConflicts,
    });
  } catch (error) {
    return sendErrorResponse(response, error);
  }
}
