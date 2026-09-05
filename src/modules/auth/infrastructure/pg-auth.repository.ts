import type { Pool, PoolClient } from 'pg';
import { pool } from '../../../config/db.js';
import { hashToken } from '../../../services/token.service.js';
import type { RefreshTokenRow, SessionMetadata, UserRow } from '../auth.types.js';

type DatabaseClient = Pool | PoolClient;

export class PgAuthRepository {
  constructor(readonly database: Pool = pool) {}

  async findUserByEmail(email: string, client: DatabaseClient = this.database): Promise<UserRow | null> {
    const result = await client.query<UserRow>(
      `SELECT id, first_name, last_name, email, password_hash, created_at, updated_at
       FROM users
       WHERE email = $1`,
      [email],
    );

    return result.rows[0] ?? null;
  }

  async findUserById(userId: number): Promise<UserRow | null> {
    const result = await this.database.query<UserRow>(
      `SELECT id, first_name, last_name, email, created_at, updated_at
       FROM users
       WHERE id = $1`,
      [userId],
    );

    return result.rows[0] ?? null;
  }

  async createUser(
    user: { first_name: string; last_name: string; email: string; password_hash: string },
    client: DatabaseClient = this.database,
  ): Promise<UserRow> {
    const result = await client.query<UserRow>(
      `INSERT INTO users (first_name, last_name, email, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, first_name, last_name, email, created_at, updated_at`,
      [user.first_name, user.last_name, user.email, user.password_hash],
    );

    return result.rows[0]!;
  }

  async createSession(userId: number, metadata: SessionMetadata, client: PoolClient): Promise<{ id: number }> {
    const result = await client.query<{ id: number }>(
      `INSERT INTO sessions (user_id, user_agent, ip_address, city, state, country)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [userId, metadata.userAgent, metadata.ipAddress, metadata.city, metadata.state, metadata.country],
    );

    return result.rows[0]!;
  }

  async createRefreshToken(sessionId: number, refreshToken: string, client: PoolClient): Promise<void> {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await client.query(
      `INSERT INTO refresh_tokens (session_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [sessionId, hashToken(refreshToken), expiresAt],
    );
  }

  async getRefreshTokenForUpdate(refreshToken: string, client: PoolClient): Promise<RefreshTokenRow | null> {
    const result = await client.query<RefreshTokenRow>(
      `SELECT rt.id, rt.session_id, rt.is_used, rt.is_revoked, rt.expires_at, s.user_id, s.is_active
       FROM refresh_tokens rt
       JOIN sessions s ON s.id = rt.session_id
       WHERE rt.token_hash = $1
       FOR UPDATE OF rt, s`,
      [hashToken(refreshToken)],
    );

    return result.rows[0] ?? null;
  }

  async markRefreshTokenUsed(tokenId: number, client: PoolClient): Promise<void> {
    await client.query(
      `UPDATE refresh_tokens
       SET is_used = true, used_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND is_used = false`,
      [tokenId],
    );
  }

  async revokeSessionRefreshTokens(sessionId: number, client: PoolClient): Promise<void> {
    await client.query(
      `UPDATE refresh_tokens
       SET is_revoked = true, revoked_at = CURRENT_TIMESTAMP
       WHERE session_id = $1 AND is_revoked = false`,
      [sessionId],
    );
  }

  async deactivateSession(sessionId: number, client: PoolClient): Promise<void> {
    await client.query(
      'UPDATE sessions SET is_active = false WHERE id = $1',
      [sessionId],
    );
  }

  async findActiveRefreshToken(refreshToken: string, client: PoolClient): Promise<{ session_id: number; user_id: number } | null> {
    const result = await client.query<{ session_id: number; user_id: number }>(
      `SELECT rt.session_id, s.user_id
       FROM refresh_tokens rt
       JOIN sessions s ON s.id = rt.session_id
       WHERE rt.token_hash = $1 AND rt.is_revoked = false`,
      [hashToken(refreshToken)],
    );

    return result.rows[0] ?? null;
  }

  async revokeRefreshToken(refreshToken: string, client: PoolClient): Promise<{ session_id: number } | null> {
    const result = await client.query<{ session_id: number }>(
      `UPDATE refresh_tokens
       SET is_revoked = true, revoked_at = CURRENT_TIMESTAMP
       WHERE token_hash = $1 AND is_revoked = false
       RETURNING session_id`,
      [hashToken(refreshToken)],
    );

    return result.rows[0] ?? null;
  }

  async getActiveRefreshTokenUserId(refreshToken: string, client: PoolClient): Promise<number | null> {
    const result = await client.query<{ user_id: number }>(
      `SELECT s.user_id
       FROM refresh_tokens rt
       JOIN sessions s ON s.id = rt.session_id
       WHERE rt.token_hash = $1 AND rt.is_revoked = false AND s.is_active = true`,
      [hashToken(refreshToken)],
    );

    return result.rows[0]?.user_id ?? null;
  }

  async revokeAllUserRefreshTokens(userId: number, client: PoolClient): Promise<void> {
    await client.query(
      `UPDATE refresh_tokens
       SET is_revoked = true, is_used = true, revoked_at = CURRENT_TIMESTAMP
       WHERE session_id IN (SELECT id FROM sessions WHERE user_id = $1 AND is_active = true)
         AND is_revoked = false`,
      [userId],
    );
  }

  async deactivateAllUserSessions(userId: number, client: PoolClient): Promise<number> {
    const result = await client.query<{ id: number }>(
      `UPDATE sessions
       SET is_active = false
       WHERE user_id = $1 AND is_active = true
       RETURNING id`,
      [userId],
    );

    return result.rows.length;
  }
}
