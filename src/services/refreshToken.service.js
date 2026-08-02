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