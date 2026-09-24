import type { NextFunction, Request, Response } from 'express';
import { getAllowedOrigins, normalizeOrigin } from '../shared/http/allowed-origins.js';

const unsafeMethods = new Set([
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
]);

// Bloquea solicitudes que modifican datos cuando su encabezado Origin no está permitido.
export function csrfOriginMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  if (!unsafeMethods.has(request.method)) {
    return next();
  }

  const allowedOrigins = getAllowedOrigins();

  if (!allowedOrigins.length) {
    console.error(
      'ALLOWED_ORIGINS no está configurado para validar el origen CSRF',
    );

    return response.status(500).json({
      code: 'CSRF_ORIGIN_NOT_CONFIGURED',
      message: 'Error interno del servidor',
    });
  }

  const requestOrigin = request.get('Origin');

  if (!requestOrigin) {
    return response.status(403).json({
      code: 'INVALID_ORIGIN',
      message: 'Origen no permitido',
    });
  }

  const normalizedRequestOrigin = normalizeOrigin(requestOrigin);

  if (
    !normalizedRequestOrigin ||
    !allowedOrigins.includes(normalizedRequestOrigin)
  ) {
    return response.status(403).json({
      code: 'INVALID_ORIGIN',
      message: 'Origen no permitido',
    });
  }

  return next();
}
