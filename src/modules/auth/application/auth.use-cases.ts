import bcrypt from 'bcrypt';
import type { Request } from 'express';
import { getLocationFromIp } from '../../../utils/geo.js';
import { withTransaction } from '../../../shared/database/transaction.js';
import { generateAccessToken, generateRefreshToken } from '../../../services/token.service.js';
import { InvalidCredentialsError, LogoutForbiddenError, RefreshTokenError, UserAlreadyExistsError, UserNotFoundError } from '../auth.errors.js';
import { toUserDto, toUserRecord } from '../auth.mapper.js';
import type { LoginInput, RegisterInput } from '../auth.schemas.js';
import type { SessionMetadata } from '../auth.types.js';
import { PgAuthRepository } from '../infrastructure/pg-auth.repository.js';

const refreshErrorCodes = {
  notFound: ['Refresh token inválido', 'REFRESH_TOKEN_NOT_FOUND'],
  expired: ['Refresh token expirado', 'REFRESH_TOKEN_EXPIRED'],
  revoked: ['Refresh token revocado', 'REFRESH_TOKEN_REVOKED'],
  inactive: ['Sesión inactiva', 'SESSION_INACTIVE'],
  reused: ['Token reutilizado. Inicia sesión nuevamente.', 'REFRESH_TOKEN_ALREADY_USED'],
} as const;

export class AuthUseCases {
  // Recibe el repositorio que concentra el acceso a usuarios, sesiones y refresh tokens.
  constructor(private readonly auth: PgAuthRepository) {}

  // Registra un usuario nuevo después de comprobar su correo y cifrar su contraseña.
  async register(input: RegisterInput) {
    const existingUser = await this.auth.findUserByEmail(input.email);

    if (existingUser) {
      throw new UserAlreadyExistsError();
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    try {
      const user = await this.auth.createUser(toUserRecord(input, passwordHash));
      return toUserDto(user);
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
        throw new UserAlreadyExistsError();
      }

      throw error;
    }
  }

  // Verifica credenciales y crea de forma atómica una sesión con sus tokens asociados.
  async login(input: LoginInput, request: Request) {
    const metadata = await this.getSessionMetadata(request);

    return withTransaction(this.auth.database, async (client) => {
      const user = await this.auth.findUserByEmail(input.email, client);

      if (!user?.password_hash || !(await bcrypt.compare(input.password, user.password_hash))) {
        throw new InvalidCredentialsError();
      }

      const session = await this.auth.createSession(user.id, metadata, client);
      const refreshToken = generateRefreshToken();

      await this.auth.createRefreshToken(session.id, refreshToken, client);

      return {
        user: toUserDto(user),
        sessionId: session.id,
        accessToken: generateAccessToken(user.id, session.id),
        refreshToken,
      };
    });
  }

  // Obtiene el perfil público del usuario autenticado.
  async getCurrentUser(userId: number) {
    const user = await this.auth.findUserById(userId);

    if (!user) {
      throw new UserNotFoundError();
    }

    return toUserDto(user);
  }

  // Consume un refresh token de un solo uso y rota los tokens de la sesión.
  async refresh(refreshToken: string) {
    const outcome = await withTransaction(this.auth.database, async (client) => {
      const token = await this.auth.getRefreshTokenForUpdate(refreshToken, client);

      if (!token) {
        throw new RefreshTokenError(...refreshErrorCodes.notFound);
      }

      if (new Date(token.expires_at) < new Date()) {
        throw new RefreshTokenError(...refreshErrorCodes.expired);
      }

      if (token.is_revoked) {
        throw new RefreshTokenError(...refreshErrorCodes.revoked);
      }

      if (!token.is_active) {
        throw new RefreshTokenError(...refreshErrorCodes.inactive);
      }

      if (token.is_used) {
        await this.auth.revokeSessionRefreshTokens(token.session_id, client);
        await this.auth.deactivateSession(token.session_id, client);

        return { error: new RefreshTokenError(...refreshErrorCodes.reused) };
      }

      await this.auth.markRefreshTokenUsed(token.id, client);

      const nextRefreshToken = generateRefreshToken();
      await this.auth.createRefreshToken(token.session_id, nextRefreshToken, client);

      return {
        userId: token.user_id,
        sessionId: token.session_id,
        refreshToken: nextRefreshToken,
      };
    });

    if ('error' in outcome) {
      throw outcome.error;
    }

    return {
      accessToken: generateAccessToken(outcome.userId, outcome.sessionId),
      refreshToken: outcome.refreshToken,
    };
  }

  // Revoca el refresh token actual y desactiva únicamente su sesión asociada.
  async logout(refreshToken: string | undefined, authenticatedUserId?: number) {
    if (!refreshToken) {
      return;
    }

    await withTransaction(this.auth.database, async (client) => {
      const token = await this.auth.findActiveRefreshToken(refreshToken, client);

      if (!token) {
        return;
      }

      if (authenticatedUserId && token.user_id !== authenticatedUserId) {
        throw new LogoutForbiddenError('No autorizado para cerrar esta sesión.');
      }

      const revokedToken = await this.auth.revokeRefreshToken(refreshToken, client);

      if (revokedToken) {
        await this.auth.deactivateSession(revokedToken.session_id, client);
      }
    });
  }

  // Revoca todos los refresh tokens y desactiva todas las sesiones del usuario propietario.
  async logoutAll(refreshToken: string | undefined, authenticatedUserId?: number) {
    if (!refreshToken) {
      return 0;
    }

    return withTransaction(this.auth.database, async (client) => {
      const userId = await this.auth.getActiveRefreshTokenUserId(refreshToken, client);

      if (!userId) {
        return 0;
      }

      if (authenticatedUserId && userId !== authenticatedUserId) {
        throw new LogoutForbiddenError('No autorizado para cerrar estas sesiones');
      }

      await this.auth.revokeAllUserRefreshTokens(userId, client);
      return this.auth.deactivateAllUserSessions(userId, client);
    });
  }

  // Obtiene metadatos de cliente y ubicación sin bloquear el inicio de sesión ante fallos externos.
  private async getSessionMetadata(request: Request): Promise<SessionMetadata> {
    const ipAddress = request.ip || request.socket.remoteAddress;

    try {
      const location = await getLocationFromIp(ipAddress);

      return {
        userAgent: request.get('User-Agent'),
        ipAddress,
        city: location.city || null,
        state: location.state || null,
        country: location.country || null,
      };
    } catch (error) {
      console.warn('No se pudo obtener ubicación:', error);

      return {
        userAgent: request.get('User-Agent'),
        ipAddress,
        city: null,
        state: null,
        country: null,
      };
    }
  }
}
