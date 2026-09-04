import type { Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from './app-error.js';

type ErrorResponseOptions = {
  uniqueMessage?: string;
  fallbackMessage?: string;
};

// Convierte errores conocidos en respuestas HTTP consistentes para los controladores.
export function sendErrorResponse(
  response: Response,
  error: unknown,
  options: ErrorResponseOptions = {},
) {
  if (error instanceof ZodError) {
    return response.status(400).json({
      success: false,
      message: error.issues[0]?.message ?? 'Datos inválidos.',
    });
  }

  if (error instanceof AppError) {
    return response.status(error.status).json({
      success: false,
      message: error.message,
    });
  }

  const isUniqueViolation =
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '23505';

  if (isUniqueViolation) {
    return response.status(409).json({
      success: false,
      message: options.uniqueMessage ?? 'El recurso ya existe.',
    });
  }

  console.error('Error no controlado:', error);

  return response.status(500).json({
    success: false,
    message: options.fallbackMessage ?? 'Error interno del servidor.',
  });
}
