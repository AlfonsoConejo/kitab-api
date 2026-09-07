import type { Pool } from 'pg';
import { pool } from '../../../config/db.js';
import { DayOffPeriodNotFoundError } from '../days-off.errors.js';
import type { DayOffRow } from '../days-off.types.js';

export class PgDaysOffRepository {
  // Recibe el pool para poder sustituirlo por un doble en pruebas.
  constructor(private readonly database: Pool = pool) {}

  // Confirma que el período solicitado pertenece al usuario autenticado.
  async ensureOwnedPeriod(periodId: number, userId: number): Promise<void> {
    const result = await this.database.query(
      `SELECT id
       FROM academic_periods
       WHERE id = $1 AND user_id = $2`,
      [periodId, userId],
    );

    if (!result.rowCount) {
      throw new DayOffPeriodNotFoundError();
    }
  }

  // Lista los días libres de un período en orden cronológico.
  async listByPeriod(periodId: number): Promise<DayOffRow[]> {
    const result = await this.database.query<DayOffRow>(
      `SELECT id, period_id, name, start_date, end_date, notes, created_at, updated_at
       FROM days_off
       WHERE period_id = $1
       ORDER BY start_date, end_date, id`,
      [periodId],
    );

    return result.rows;
  }
}
