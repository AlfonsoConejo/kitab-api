import type { Pool, PoolClient } from 'pg';
import type { RefreshTokenRow, SessionMetadata, UserRow } from '../auth.types.js';

type DatabaseClient = Pool | PoolClient;

/** Contract required by auth use cases to access users, sessions and refresh tokens. */
export interface AuthRepository {
  readonly database: Pool;

  findUserByEmail(email: string, client?: DatabaseClient): Promise<UserRow | null>;
  findUserById(userId: number): Promise<UserRow | null>;
  createUser(
    user: { first_name: string; last_name: string; email: string; password_hash: string },
    client?: DatabaseClient,
  ): Promise<UserRow>;

  createSession(userId: number, metadata: SessionMetadata, client: PoolClient): Promise<{ id: number }>;
  createRefreshToken(sessionId: number, refreshToken: string, client: PoolClient): Promise<void>;
  getRefreshTokenForUpdate(refreshToken: string, client: PoolClient): Promise<RefreshTokenRow | null>;
  markRefreshTokenUsed(tokenId: number, client: PoolClient): Promise<void>;
  revokeSessionRefreshTokens(sessionId: number, client: PoolClient): Promise<void>;
  deactivateSession(sessionId: number, client: PoolClient): Promise<void>;

  findActiveRefreshToken(
    refreshToken: string,
    client: PoolClient,
  ): Promise<{ session_id: number; user_id: number } | null>;
  revokeRefreshToken(refreshToken: string, client: PoolClient): Promise<{ session_id: number } | null>;
  getActiveRefreshTokenUserId(refreshToken: string, client: PoolClient): Promise<number | null>;
  revokeAllUserRefreshTokens(userId: number, client: PoolClient): Promise<void>;
  deactivateAllUserSessions(userId: number, client: PoolClient): Promise<number>;
}
