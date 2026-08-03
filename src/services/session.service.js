import { getLocationFromIp } from '../utils/geo.js';

export const createSession = async (userId, req, client) => {
  const userAgent = req.get('User-Agent');
  const ipAddress = req.ip || req.connection?.remoteAddress;
  
  // Get location from IP address
  let location = {};
  try {
    location = await getLocationFromIp(ipAddress);
  } catch (error) {
    console.warn('No se pudo obtener ubicación:', error.message);
    location = { city: null, state: null, country: null };
  }

  const result = await client.query(
    `INSERT INTO sessions (
      user_id, user_agent, ip_address, city, state, country
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, created_at`,
    [
      userId,
      userAgent,
      ipAddress,
      location.city || null,
      location.state || null,
      location.country || null
    ]
  );

  return result.rows[0];
};

export const deactivateSession = async (sessionId, client = pool) => {
  const db = client || pool;

  const result = await db.query(
    `UPDATE sessions
     SET is_active = false
     WHERE id = $1
     RETURNING id, user_id`,
    [sessionId]
  );

  return result.rows[0] || null;
};

export const deactivateAllUserSessions = async (userId, client = pool) => {
  const db = client || pool;

  const result = await db.query(
    `UPDATE sessions 
    SET is_active = false
    WHERE user_id = $1
      AND is_active = true
    RETURNING id`,
    [userId]
  );

  return result.rows;
};

export const getSessionByRefreshToken = async (tokenHash, client = pool) => {
  const db = client || pool;

  const result = await db.query(
    `SELECT 
      rt.id as token_id,
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