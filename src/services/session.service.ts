import type { Pool, PoolClient } from 'pg';
import { pool } from '../config/db.js';

type DatabaseClient = Pool | PoolClient;

// Actualiza la actividad de una sesión válida, como máximo una vez cada diez minutos.
export async function touchSession(
  sessionId: number,
  userId: number,
  client: DatabaseClient = pool,
): Promise<{ id: number } | null> {
  const result = await client.query<{ id: number }>(
    `WITH active_session AS (
       SELECT id
       FROM sessions
       WHERE id = $1
         AND user_id = $2
         AND is_active = true
       FOR UPDATE
     ), updated_session AS (
       UPDATE sessions
       SET last_seen_at = CURRENT_TIMESTAMP
       WHERE id = (SELECT id FROM active_session)
         AND (
           last_seen_at IS NULL
           OR last_seen_at < CURRENT_TIMESTAMP - INTERVAL '10 minutes'
         )
       RETURNING id
     )
     SELECT id FROM active_session`,
    [sessionId, userId],
  );

  return result.rows[0] ?? null;
}
