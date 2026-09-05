import { pool } from '../config/db.js';
import { withTransaction } from '../shared/database/transaction.js';

export type CleanupResult = {
  tokensRemoved: number;
  sessionsRemoved: number;
  sessionsDeactivated: number;
};

// Elimina tokens y sesiones expiradas, y desactiva sesiones inactivas antiguas.
export async function cleanupExpiredData(): Promise<CleanupResult> {
  return withTransaction(pool, async (client) => {
    const tokensResult = await client.query(
      `DELETE FROM refresh_tokens
       WHERE expires_at < NOW() - INTERVAL '30 days'
       RETURNING id`,
    );
    const tokensRemoved = tokensResult.rowCount ?? 0;
    console.log(`Eliminados ${tokensRemoved} refresh tokens expirados`);

    const sessionsResult = await client.query(
      `DELETE FROM sessions
       WHERE is_active = false
         AND last_seen_at < NOW() - INTERVAL '30 days'
       RETURNING id`,
    );
    const sessionsRemoved = sessionsResult.rowCount ?? 0;
    console.log(`Eliminadas ${sessionsRemoved} sesiones inactivas`);

    const activeResult = await client.query(
      `UPDATE sessions
       SET is_active = false
       WHERE is_active = true
         AND last_seen_at < NOW() - INTERVAL '30 days'
       RETURNING id`,
    );
    const sessionsDeactivated = activeResult.rowCount ?? 0;
    console.log(`Desactivadas ${sessionsDeactivated} sesiones viejas`);

    return {
      tokensRemoved,
      sessionsRemoved,
      sessionsDeactivated,
    };
  });
}
