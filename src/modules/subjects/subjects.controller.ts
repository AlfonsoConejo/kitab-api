import type { Response } from 'express';
import { sendErrorResponse } from '../../shared/http/error-response.js';
import { getAuthenticatedUserId, type AuthenticatedRequest } from '../../shared/http/authenticated-request.js';
import { SubjectsUseCases } from './application/subjects.use-cases.js';
import { PgSubjectsRepository } from './infrastructure/pg-subjects.repository.js';
import {
  createClassesSchema,
  externalConflictsSchema,
  internalConflictsSchema,
  subjectIdParamsSchema,
} from './subjects.schemas.js';

const useCases = new SubjectsUseCases(new PgSubjectsRepository());

function getUserIdOrRespond(request: AuthenticatedRequest, response: Response): number | null {
  const userId = getAuthenticatedUserId(request);

  if (!userId) {
    response.status(401).json({
      success: false,
      message: 'Usuario no autenticado',
    });

    return null;
  }

  return userId;
}

function subjectIdFrom(request: AuthenticatedRequest): number {
  return subjectIdParamsSchema.parse(request.params).subjectId;
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
