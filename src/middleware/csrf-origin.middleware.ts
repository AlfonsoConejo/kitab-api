import type { NextFunction, Request, Response } from 'express';

const unsafeMethods = new Set([
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
]);

// Convierte una URL a su origen estándar.
// Ejemplo: https://kitab.app/ → https://kitab.app
function normalizeOrigin(origin: string): string | null {
  try {
    return new URL(origin).origin;
  } catch {
    return null;
  }
}

// Lee y normaliza la lista de orígenes permitidos desde FRONTEND_URL.
function getAllowedOrigins(): string[] {
  return (process.env.FRONTEND_URL || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map(normalizeOrigin)
    .filter((origin): origin is string => origin !== null);
}

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
      'FRONTEND_URL no está configurado para validar el origen CSRF',
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