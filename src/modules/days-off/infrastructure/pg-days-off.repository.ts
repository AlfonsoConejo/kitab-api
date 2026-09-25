import type { Pool } from 'pg';
import { pool } from '../../../config/db.js';
import { DayOffNotFoundError, DayOffPeriodNotFoundError } from '../days-off.errors.js';
import { toDayOffRecord } from '../days-off.mapper.js';
import type { CreateDayOffInput } from '../days-off.schemas.js';
import type { DayOffRow, OwnedDayOffRow, PeriodDateRangeRow } from '../days-off.types.js';
import type { DaysOffRepository } from '../application/days-off.repository.js';

export class PgDaysOffRepository implements DaysOffRepository {
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
      `SELECT id, period_id, name, type, start_date, end_date, notes, created_at, updated_at
      FROM days_off
      WHERE period_id = $1
      ORDER BY start_date DESC, end_date DESC, id DESC`,
      [periodId],
    );

    return result.rows;
  }

  // Obtiene un descanso y el rango de su período solo si ambos pertenecen al usuario.
  async getOwnedDayOff(dayOffId: number, userId: number): Promise<OwnedDayOffRow> {
    const result = await this.database.query<OwnedDayOffRow>(
      `SELECT d.id, d.period_id, d.name, d.type, d.start_date, d.end_date, d.notes,
              d.created_at, d.updated_at,
              p.start_date AS period_start_date, p.end_date AS period_end_date
       FROM days_off d
       JOIN academic_periods p ON p.id = d.period_id
       WHERE d.id = $1 AND p.user_id = $2`,
      [dayOffId, userId],
    );

    if (!result.rowCount) {
      throw new DayOffNotFoundError();
    }

    return result.rows[0]!;
  }

  // Inserta un día libre dentro del período indicado.
  async create(periodId: number, input: CreateDayOffInput): Promise<DayOffRow> {
    const dayOff = toDayOffRecord(input);
    const result = await this.database.query<DayOffRow>(
      `INSERT INTO days_off (period_id, name, type, start_date, end_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, period_id, name, type, start_date, end_date, notes, created_at, updated_at`,
      [
        periodId,
        dayOff.name,
        dayOff.type,
        dayOff.start_date,
        dayOff.end_date,
        dayOff.notes,
      ],
    );

    return result.rows[0]!;
  }

  // Actualiza un descanso cuya propiedad ya fue comprobada por el caso de uso.
  async updateById(
    dayOffId: number,
    input: CreateDayOffInput,
  ): Promise<DayOffRow> {
    const dayOff = toDayOffRecord(input);
    const result = await this.database.query<DayOffRow>(
      `UPDATE days_off
       SET name = $1,
           type = $2,
           start_date = $3,
           end_date = $4,
           notes = $5,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING id, period_id, name, type, start_date, end_date, notes, created_at, updated_at`,
      [
        dayOff.name,
        dayOff.type,
        dayOff.start_date,
        dayOff.end_date,
        dayOff.notes,
        dayOffId,
      ],
    );

    if (!result.rowCount) {
      throw new DayOffNotFoundError();
    }

    return result.rows[0]!;
  }

  // Elimina un descanso cuya propiedad ya fue comprobada por el caso de uso.
  async deleteById(dayOffId: number): Promise<void> {
    const result = await this.database.query(
      `DELETE FROM days_off
       WHERE id = $1
       RETURNING id`,
      [dayOffId],
    );

    if (!result.rowCount) {
      throw new DayOffNotFoundError();
    }
  }
}
