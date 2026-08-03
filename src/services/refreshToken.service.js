import { pool } from '../config/db.js';
import { hashToken } from './token.service.js';

export const createRefreshToken = async (sessionId, refreshToken, client) => {
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días

  await client.query(
    `INSERT INTO refresh_tokens (session_id, token_hash, expires_at)
    VALUES ($1, $2, $3)`,
    [sessionId, tokenHash, expiresAt]
  );
};

export const verifyRefreshToken = async (token, client) => {
  const tokenHash = hashToken(token);

  // Search for the refresh token in the database
  const result = await client.query(
    `SELECT rt.id, rt.session_id, rt.is_used, rt.is_revoked, rt.expires_at,
            s.user_id, s.is_active
    FROM refresh_tokens rt
    JOIN sessions s ON rt.session_id = s.id
    WHERE rt.token_hash = $1`,
    [tokenHash]
  );

  if (result.rows.length === 0) {
    const error = new Error('Refresh token inválido');
    error.code = 'REFRESH_TOKEN_NOT_FOUND';
    throw error;
  }

  const tokenData = result.rows[0];

  // Verify expiration
  if (new Date(tokenData.expires_at) < new Date()) {
    const error = new Error('Refresh token expirado');
    error.code = 'REFRESH_TOKEN_EXPIRED';
    throw error;
  }

  // Verify if the token is revoked
  if (tokenData.is_revoked) {
    const error = new Error('Refresh token revocado');
    error.code = 'REFRESH_TOKEN_REVOKED';
    throw error;
  }

  // Verify if the session is active
  if (!tokenData.is_active) {
    const error = new Error('Sesión inactiva');
    error.code = 'SESSION_INACTIVE';
    throw error;
  }

  // Check if the token has already been used (one-time use)
  if (tokenData.is_used) {
    console.warn(`⚠️ REUSE ATTACK! User: ${tokenData.user_id}, Session: ${tokenData.session_id}`);
    
    // Revoke all refresh tokens for this user and session
    await client.query(
      `UPDATE refresh_tokens rt
      SET is_revoked = true, revoked_at = CURRENT_TIMESTAMP
      FROM sessions s
      WHERE rt.session_id = s.id
        AND s.user_id = $1
        AND rt.is_revoked = false`,
      [tokenData.user_id]
    );

    // Deactivate all sessions for this user
    await client.query(
      `UPDATE sessions
      SET is_active = false
      WHERE user_id = $1`,
      [tokenData.user_id]
    );

    const error = new Error('Token reutilizado. Inicia sesión nuevamente.');
    error.code = 'REFRESH_TOKEN_ALREADY_USED';
    throw error;
  }

  // Mark as used (one-time use)
  await client.query(
    `UPDATE refresh_tokens
    SET is_used = true, used_at = CURRENT_TIMESTAMP
    WHERE id = $1`,
    [tokenData.id]
  );

  // Return data
  return {
    userId: tokenData.user_id,
    sessionId: tokenData.session_id
  };
};

export const revokeRefreshToken = async (tokenHash, client = pool) => {
  const db = client || pool;

  const result = await db.query(
    `UPDATE refresh_tokens
     SET is_revoked = true,
         revoked_at = CURRENT_TIMESTAMP
     WHERE token_hash = $1
       AND is_revoked = false
     RETURNING id, session_id`,
    [tokenHash]
  );

  return result.rows[0] || null;
};

export const revokeAllRefreshTokensBySession = async (sessionId, client = pool) => {
  const db = client || pool;

  const result = await db.query(
    `UPDATE refresh_tokens
     SET is_revoked = true,
         revoked_at = CURRENT_TIMESTAMP
     WHERE session_id = $1
       AND is_revoked = false
     RETURNING id`,
    [sessionId]
  );

  return result.rows;
};

export const revokeAllUserRefreshTokens = async (userId, client = pool) => {
  const db = client || pool;

  const result = await db.query(
    `UPDATE refresh_tokens
    SET is_revoked = true,
        is_used = true,
        revoked_at = CURRENT_TIMESTAMP
    WHERE session_id IN (
      SELECT id
      FROM sessions
      WHERE user_id = $1
        AND is_active = true
    )
    AND is_revoked = false
    RETURNING id`,
    [userId]
  );

  return result.rows;
};

export const findRefreshTokenByToken = async (refreshToken, client = pool) => {
  const db = client || pool;
  const tokenHash = hashToken(refreshToken);

  const result = await db.query(
    `SELECT 
      rt.id,
      rt.session_id,
      rt.is_revoked,
      s.user_id,
      s.is_active
    FROM refresh_tokens rt
    JOIN sessions s ON rt.session_id = s.id
    WHERE rt.token_hash = $1
      AND rt.is_revoked = false`,
    [tokenHash]
  );

  return result.rows[0] || null;
};

export const getUserIdFromRefreshToken = async (refreshToken, client = pool) => {
  const db = client || pool;
  const tokenHash = hashToken(refreshToken);

  const result = await db.query(
    `SELECT s.user_id
    FROM refresh_tokens rt
    JOIN sessions s ON s.id = rt.session_id
    WHERE rt.token_hash = $1
      AND rt.is_revoked = false
      AND s.is_active = true`,
    [tokenHash]
  );

  return result.rows[0]?.user_id || null;
};