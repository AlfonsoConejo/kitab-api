import type { Pool } from 'pg';
import { pool } from '../../../config/db.js';
import { DayOffPeriodNotFoundError } from '../days-off.errors.js';
import { toDayOffRecord } from '../days-off.mapper.js';
import type { CreateDayOffInput } from '../days-off.schemas.js';
import type { DayOffRow, PeriodDateRangeRow } from '../days-off.types.js';

export class PgDaysOffRepository {
  // Recibe el pool para poder sustituirlo por un doble en pruebas.
  constructor(private readonly database: Pool = pool) {}

  // Obtiene el rango de un período solo cuando pertenece al usuario autenticado.
  async getOwnedPeriod(periodId: number, userId: number): Promise<PeriodDateRangeRow> {
    const result = await this.database.query<PeriodDateRangeRow>(
      `SELECT start_date, end_date
       FROM academic_periods
       WHERE id = $1 AND user_id = $2`,
      [periodId, userId],
    );

    if (!result.rowCount) {
      throw new DayOffPeriodNotFoundError();
    }

    return result.rows[0]!;
  }

  // Lista los días libres de un período en orden cronológico.
  async listByPeriod(periodId: number): Promise<DayOffRow[]> {
    const result = await this.database.query<DayOffRow>(
      `SELECT id, period_id, name, start_date, end_date, notes, created_at, updated_at
      FROM days_off
      WHERE period_id = $1
      ORDER BY start_date DESC, end_date DESC, id DESC`,
      [periodId],
    );

    return result.rows;
  }

  // Inserta un día libre dentro del período indicado.
  async create(periodId: number, input: CreateDayOffInput): Promise<DayOffRow> {
    const dayOff = toDayOffRecord(input);
    const result = await this.database.query<DayOffRow>(
      `INSERT INTO days_off (period_id, name, start_date, end_date, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, period_id, name, start_date, end_date, notes, created_at, updated_at`,
      [
        periodId,
        dayOff.name,
        dayOff.start_date,
        dayOff.end_date,
        dayOff.notes,
      ],
    );

    return result.rows[0]!;
  }
}
