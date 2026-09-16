import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { pool } from '../../../../config/db.js';
import { PgPeriodsRepository } from '../../infrastructure/pg-periods.repository.js';
import type { PeriodInput } from '../../periods.schemas.js';
import type { PeriodRow } from '../../periods.types.js';
import { PeriodNotFoundError } from '../../periods.errors.js';

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

  it('lista solo los períodos del usuario en orden descendente por fecha de inicio', async () => {
    const userId = await createTestUser('period-list-owner@example.com');
    const otherUserId = await createTestUser('period-list-other@example.com');
    const olderPeriod = await createTestPeriod(repository, userId, {
      name: 'Enero-Junio 2026',
      startDate: '2026-01-10',
      endDate: '2026-06-30',
      color: '#2563EB',
    });
    const newerPeriod = await createTestPeriod(repository, userId, {
      name: 'Agosto-Diciembre 2026',
      startDate: '2026-08-01',
      endDate: '2026-12-15',
      color: '#DC2626',
    });
    await createTestPeriod(repository, otherUserId, {
      name: 'Periodo de otro usuario',
      startDate: '2026-09-01',
      endDate: '2026-12-20',
      color: '#16A34A',
    });

    const periods = await repository.listPeriods(userId);

    expect(periods.map((period) => period.id))
      .toEqual([newerPeriod.id, olderPeriod.id]);
    expect(periods.every((period) => period.user_id === userId)).toBe(true);
  });

  it('obtiene un período únicamente cuando pertenece al usuario', async () => {
    const ownerId = await createTestUser('period-owner@example.com');
    const otherUserId = await createTestUser('period-not-owner@example.com');
    const createdPeriod = await createTestPeriod(repository, ownerId);

    const period = await repository.getOwnedPeriod(createdPeriod.id, ownerId);

    expect(period).toMatchObject({
      id: createdPeriod.id,
      user_id: ownerId,
      name: createdPeriod.name,
    });
    await expect(repository.getOwnedPeriod(createdPeriod.id, otherUserId))
      .rejects.toBeInstanceOf(PeriodNotFoundError);
  });

  it('actualiza un período real en PostgreSQL', async () => {
    const userId = await createTestUser('period-update@example.com');
    const createdPeriod = await createTestPeriod(repository, userId);
    const input: PeriodInput = {
      name: 'Enero-Junio 2027',
      startDate: '2027-01-08',
      endDate: '2027-06-29',
      color: '#16A34A',
    };

    const updatedPeriod = await repository.updatePeriod(createdPeriod.id, input);

    expect(updatedPeriod).toMatchObject({
      id: createdPeriod.id,
      name: input.name,
      color: input.color,
      user_id: userId,
    });
    expectDatabaseDate(updatedPeriod!.start_date, input.startDate);
    expectDatabaseDate(updatedPeriod!.end_date, input.endDate);
  });

  it('devuelve null al actualizar un período inexistente', async () => {
    const input: PeriodInput = {
      name: 'Enero-Junio 2027',
      startDate: '2027-01-08',
      endDate: '2027-06-29',
      color: '#16A34A',
    };

    const updatedPeriod = await repository.updatePeriod(999999, input);

    expect(updatedPeriod).toBeNull();
  });

  it('elimina un período real en PostgreSQL', async () => {
    const userId = await createTestUser('period-delete@example.com');
    const createdPeriod = await createTestPeriod(repository, userId);

    await repository.deletePeriod(createdPeriod.id);

    const result = await pool.query<PeriodRow>(
      'SELECT id FROM academic_periods WHERE id = $1',
      [createdPeriod.id],
    );
    expect(result.rows).toEqual([]);
  });
});

async function createTestUser(email: string): Promise<number> {
  const result = await pool.query<{ id: number }>(
    `
      INSERT INTO users (first_name, last_name, email, password_hash)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `,
    ['Test', 'User', email, 'fake-password-hash'],
  );

  return result.rows[0]!.id;
}

async function createTestPeriod(
  repository: PgPeriodsRepository,
  userId: number,
  input: PeriodInput = {
    name: 'Agosto-Diciembre 2026',
    startDate: '2026-08-01',
    endDate: '2026-12-15',
    color: '#2563EB',
  },
): Promise<PeriodRow> {
  return repository.createPeriod(input, userId);
}

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
