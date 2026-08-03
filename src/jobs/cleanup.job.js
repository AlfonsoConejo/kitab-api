import { pool } from '../config/db.js';

export const cleanupExpiredData = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Delete expired refresh tokens (>30 days)
    const tokensResult = await client.query(
      `DELETE FROM refresh_tokens
       WHERE expires_at < NOW() - INTERVAL '30 days'
       RETURNING id`
    );
    console.log(`Eliminados ${tokensResult.rowCount} refresh tokens expirados`);

    // Delete inactive sessions (>30 days)
    const sessionsResult = await client.query(
      `DELETE FROM sessions
       WHERE is_active = false 
         AND last_seen_at < NOW() - INTERVAL '30 days'
       RETURNING id`
    );
    console.log(`Eliminadas ${sessionsResult.rowCount} sesiones inactivas`);

    // Deactivate active sessions that haven't been seen in the last 30 days
    const activeResult = await client.query(
      `UPDATE sessions
       SET is_active = false
       WHERE is_active = true 
         AND last_seen_at < NOW() - INTERVAL '30 days'
       RETURNING id`
    );
    console.log(`Desactivadas ${activeResult.rowCount} sesiones viejas`);

    await client.query('COMMIT');

    return {
      tokensRemoved: tokensResult.rowCount,
      sessionsRemoved: sessionsResult.rowCount,
      sessionsDeactivated: activeResult.rowCount
    };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en limpieza: ', error);
    throw error;
  } finally {
    client.release();
  }
};