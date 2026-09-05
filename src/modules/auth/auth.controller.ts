import type { Response } from 'express';
import { getAuthenticatedUserId, getUserIdOrRespond, type AuthenticatedRequest } from '../../shared/http/authenticated-request.js';
import { sendErrorResponse } from '../../shared/http/error-response.js';
import { AuthUseCases } from './application/auth.use-cases.js';
import { baseCookieOptions, accessTokenCookieOptions, refreshTokenCookieOptions } from './auth.cookies.js';
import { RefreshTokenError } from './auth.errors.js';
import { PgAuthRepository } from './infrastructure/pg-auth.repository.js';
import { loginSchema, registerSchema } from './auth.schemas.js';

const useCases = new AuthUseCases(new PgAuthRepository());

function clearAuthCookies(response: Response) {
  response.clearCookie('accessToken', baseCookieOptions);
  response.clearCookie('refreshToken', baseCookieOptions);
}

function setAuthCookies(response: Response, accessToken: string, refreshToken: string) {
  response.cookie('accessToken', accessToken, accessTokenCookieOptions);
  response.cookie('refreshToken', refreshToken, refreshTokenCookieOptions);
}

// Registra un usuario después de validar su información y cifrar su contraseña.
export async function register(request: AuthenticatedRequest, response: Response) {
  try {
    const input = registerSchema.parse(request.body);
    const user = await useCases.register(input);

    return response.status(201).json({
      success: true,
      message: 'Usuario creado correctamente',
      user,
    });
  } catch (error) {
    return sendErrorResponse(response, error, {
      uniqueMessage: 'El usuario ya existe',
      fallbackMessage: 'Error interno del servidor',
    });
  }
}

// Inicia una sesión y entrega tokens mediante cookies HttpOnly.
export async function login(request: AuthenticatedRequest, response: Response) {
  try {
    const input = loginSchema.parse(request.body);
    const result = await useCases.login(input, request);

    setAuthCookies(response, result.accessToken, result.refreshToken);

    return response.status(200).json({
      success: true,
      message: 'Login exitoso',
      data: {
        user: result.user,
        session: { id: result.sessionId },
      },
    });
  } catch (error) {
    return sendErrorResponse(response, error, {
      fallbackMessage: 'Error interno del servidor',
    });
  }
}

// Devuelve el perfil del usuario identificado por el access token.
export async function me(request: AuthenticatedRequest, response: Response) {
  const userId = getUserIdOrRespond(request, response);

  if (!userId) {
    return;
  }

  try {
    const user = await useCases.getCurrentUser(userId);

    return response.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    return sendErrorResponse(response, error, {
      fallbackMessage: 'Error interno del servidor',
    });
  }
}

// Rota el refresh token y emite nuevas cookies de autenticación.
export async function refresh(request: AuthenticatedRequest, response: Response) {
  const refreshToken = request.cookies?.refreshToken as string | undefined;

  if (!refreshToken) {
    return response.status(401).json({
      success: false,
      message: 'Refresh token requerido',
    });
  }

  try {
    const tokens = await useCases.refresh(refreshToken);

    setAuthCookies(response, tokens.accessToken, tokens.refreshToken);

    return response.status(200).json({
      success: true,
      message: 'Token renovado exitosamente',
    });
  } catch (error) {
    if (error instanceof RefreshTokenError) {
      clearAuthCookies(response);
    }

    return sendErrorResponse(response, error, {
      fallbackMessage: 'Error interno del servidor',
    });
  }
}

// Revoca el refresh token actual, desactiva su sesión y elimina las cookies.
export async function logout(request: AuthenticatedRequest, response: Response) {
  const refreshToken = request.cookies?.refreshToken as string | undefined;
  const authenticatedUserId = getAuthenticatedUserId(request) ?? undefined;

  try {
    await useCases.logout(refreshToken, authenticatedUserId);
    clearAuthCookies(response);

    return response.status(200).json({
      success: true,
      message: 'Sesión cerrada exitosamente',
    });
  } catch (error) {
    clearAuthCookies(response);

    return sendErrorResponse(response, error, {
      fallbackMessage: 'Error al cerrar sesión',
    });
  }
}

// Revoca los refresh tokens y desactiva todas las sesiones del usuario autenticado.
export async function logoutAll(request: AuthenticatedRequest, response: Response) {
  const authenticatedUserId = getUserIdOrRespond(request, response);

  if (!authenticatedUserId) {
    return;
  }

  const refreshToken = request.cookies?.refreshToken as string | undefined;

  try {
    const deactivatedSessions = await useCases.logoutAll(refreshToken, authenticatedUserId);
    clearAuthCookies(response);

    return response.status(200).json({
      success: true,
      message: `Se cerraron ${deactivatedSessions} sesiones correctamente`,
    });
  } catch (error) {
    clearAuthCookies(response);

    return sendErrorResponse(response, error, {
      fallbackMessage: 'Error al cerrar todas las sesiones',
    });
  }
}
