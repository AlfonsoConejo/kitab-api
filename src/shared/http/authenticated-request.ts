import type { Request, Response } from 'express';

export type AuthenticatedRequest = Request & {
  user?: {
    id?: number;
    sid?: number;
  };
};

export function getAuthenticatedUserId(request: AuthenticatedRequest): number | null {
  const userId = request.user?.id;

  if (!userId) {
    return null;
  }

  return userId;
}

// Obtiene el usuario autenticado o responde 401 de forma consistente.
export function getUserIdOrRespond(
  request: AuthenticatedRequest,
  response: Response,
): number | null {
  const userId = getAuthenticatedUserId(request);

  if (!userId) {
    response.status(401).json({
      success: false,
      message: 'Usuario no autenticado',
    });
  }

  return userId;
}
