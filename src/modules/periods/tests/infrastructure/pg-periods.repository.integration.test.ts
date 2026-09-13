import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { pool } from '../../../../config/db.js';
import { PgPeriodsRepository } from '../../infrastructure/pg-periods.repository.js';
import type { PeriodInput } from '../../periods.schemas.js';
import type { PeriodRow } from '../../periods.types.js';

describe('PgPeriodsRepository - integración', () => {
  const repository = new PgPeriodsRepository(pool);

  beforeEach(async () => {
    await pool.query('DELETE FROM academic_periods');
    await pool.query('DELETE FROM users');
  });

  afterAll(async () => {
    await pool.end();
  });

  it('crea un período real en PostgreSQL', async () => {
    const userResult = await pool.query<{ id: number }>(
      `
        INSERT INTO users (first_name, last_name, email, password_hash)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `,
      [
        'Timothée',
        'Chalamet',
        'tim.chalamet@hollywood.com',
        'fake-password-hash',
      ],
    );

    const userId = userResult.rows[0]!.id;

    const input: PeriodInput = {
      name: 'Agosto-Diciembre 2026',
      startDate: '2026-08-01',
      endDate: '2026-12-15',
      color: '#2563EB',
    };

    const result = await repository.createPeriod(input, userId);

    expect(result).toMatchObject({
      name: input.name,
      color: input.color,
      user_id: userId,
    });

    expect(result.id).toBeDefined();
    expect(result.created_at).toBeDefined();

    expectDatabaseDate(result.start_date, input.startDate);
    expectDatabaseDate(result.end_date, input.endDate);

    const databaseResult = await pool.query<PeriodRow>(
      `
        SELECT id, name, start_date, end_date, color, user_id, created_at
        FROM academic_periods
        WHERE id = $1
      `,
      [result.id],
    );

    expect(databaseResult.rows).toHaveLength(1);

    const storedPeriod = databaseResult.rows[0]!;

    expect(storedPeriod).toMatchObject({
      id: result.id,
      name: input.name,
      color: input.color,
      user_id: userId,
    });

    expectDatabaseDate(storedPeriod.start_date, input.startDate);
    expectDatabaseDate(storedPeriod.end_date, input.endDate);

    expect(storedPeriod.created_at).toEqual(result.created_at);
  });
});

function expectDatabaseDate(
  value: string | Date,
  expectedDate: string,
) {
  expect(value).toBeInstanceOf(Date);

  if (!(value instanceof Date)) {
    throw new Error('PostgreSQL no devolvió la fecha como Date');
  }

  expect(value.toISOString().slice(0, 10))
    .toBe(expectedDate);
}