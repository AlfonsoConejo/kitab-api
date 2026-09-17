import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { pool } from '../../../../config/db.js';
import { DayOffNotFoundError, DayOffPeriodNotFoundError } from '../../days-off.errors.js';
import { PgDaysOffRepository } from '../../infrastructure/pg-days-off.repository.js';
import type { CreateDayOffInput } from '../../days-off.schemas.js';
import type { DayOffRow } from '../../days-off.types.js';

let createdDayOffIds: number[] = [];
let createdPeriodIds: number[] = [];
let createdUserIds: number[] = [];
let emailSequence = 0;

describe('PgDaysOffRepository - integración', () => {
  const repository = new PgDaysOffRepository(pool);

  beforeEach(() => {
    createdDayOffIds = [];
    createdPeriodIds = [];
    createdUserIds = [];
  });

  afterEach(async () => {
    await deleteCreatedRecords();
  });

  afterAll(async () => {
    await pool.end();
  });

  it('obtiene el rango de un período solo para su propietario', async () => {
    const ownerId = await createTestUser('days-off-owner@example.com');
    const otherUserId = await createTestUser('days-off-other@example.com');
    const periodId = await createTestPeriod(ownerId);

    const period = await repository.getOwnedPeriod(periodId, ownerId);

    expectDatabaseDate(period.start_date, '2026-08-01');
    expectDatabaseDate(period.end_date, '2026-12-15');
    await expect(repository.getOwnedPeriod(periodId, otherUserId))
      .rejects.toBeInstanceOf(DayOffPeriodNotFoundError);
  });

  it('crea y lista los descansos de un período en orden cronológico descendente', async () => {
    const userId = await createTestUser('days-off-list@example.com');
    const periodId = await createTestPeriod(userId);
    const otherPeriodId = await createTestPeriod(userId, 'Otro período', '2027-01-01', '2027-06-30');
    const olderDayOff = await createTestDayOff(repository, periodId, {
      name: 'Consejo técnico',
      type: 'day_off',
      startDate: '2026-09-10',
      endDate: '2026-09-10',
      notes: null,
    });
    const newerDayOff = await createTestDayOff(repository, periodId, {
      name: 'Vacaciones de invierno',
      type: 'vacation',
      startDate: '2026-12-01',
      endDate: '2026-12-10',
      notes: 'Sin clases',
    });
    await createTestDayOff(repository, otherPeriodId);

    const daysOff = await repository.listByPeriod(periodId);

    expect(daysOff.map((dayOff) => dayOff.id))
      .toEqual([newerDayOff.id, olderDayOff.id]);
    expect(daysOff.every((dayOff) => dayOff.period_id === periodId)).toBe(true);
  });

  it('obtiene un descanso únicamente dentro de su período', async () => {
    const userId = await createTestUser('days-off-get@example.com');
    const periodId = await createTestPeriod(userId);
    const otherPeriodId = await createTestPeriod(userId, 'Otro período', '2027-01-01', '2027-06-30');
    const createdDayOff = await createTestDayOff(repository, periodId);

    const dayOff = await repository.getByIdAndPeriod(createdDayOff.id, periodId);

    expect(dayOff).toMatchObject({
      id: createdDayOff.id,
      period_id: periodId,
      name: createdDayOff.name,
    });
    await expect(repository.getByIdAndPeriod(createdDayOff.id, otherPeriodId))
      .rejects.toBeInstanceOf(DayOffNotFoundError);
  });

  it('crea un descanso real en PostgreSQL', async () => {
    const userId = await createTestUser('days-off-create@example.com');
    const periodId = await createTestPeriod(userId);
    const input: CreateDayOffInput = {
      name: 'Vacaciones de invierno',
      type: 'vacation',
      startDate: '2026-12-01',
      endDate: '2026-12-10',
      notes: 'Sin clases',
    };

    const createdDayOff = await repository.create(periodId, input);

    expect(createdDayOff).toMatchObject({
      period_id: periodId,
      name: input.name,
      type: input.type,
      notes: input.notes,
    });
    expectDatabaseDate(createdDayOff.start_date, input.startDate);
    expectDatabaseDate(createdDayOff.end_date, input.endDate);
  });

  it('actualiza un descanso real en PostgreSQL', async () => {
    const userId = await createTestUser('days-off-update@example.com');
    const periodId = await createTestPeriod(userId);
    const createdDayOff = await createTestDayOff(repository, periodId);
    const input: CreateDayOffInput = {
      name: 'Vacaciones de invierno',
      type: 'vacation',
      startDate: '2026-12-01',
      endDate: '2026-12-10',
      notes: 'Sin clases',
    };

    const updatedDayOff = await repository.updateByIdAndPeriod(
      createdDayOff.id,
      periodId,
      input,
    );

    expect(updatedDayOff).toMatchObject({
      id: createdDayOff.id,
      period_id: periodId,
      name: input.name,
      type: input.type,
      notes: input.notes,
    });
    expectDatabaseDate(updatedDayOff.start_date, input.startDate);
    expectDatabaseDate(updatedDayOff.end_date, input.endDate);
  });

  it('no actualiza ni elimina un descanso de otro período', async () => {
    const userId = await createTestUser('days-off-mismatch@example.com');
    const periodId = await createTestPeriod(userId);
    const otherPeriodId = await createTestPeriod(userId, 'Otro período', '2027-01-01', '2027-06-30');
    const createdDayOff = await createTestDayOff(repository, periodId);
    const input: CreateDayOffInput = {
      name: 'Vacaciones de invierno',
      type: 'vacation',
      startDate: '2026-12-01',
      endDate: '2026-12-10',
      notes: 'Sin clases',
    };

    await expect(repository.updateByIdAndPeriod(createdDayOff.id, otherPeriodId, input))
      .rejects.toBeInstanceOf(DayOffNotFoundError);
    await expect(repository.deleteByIdAndPeriod(createdDayOff.id, otherPeriodId))
      .rejects.toBeInstanceOf(DayOffNotFoundError);

    expect(await repository.getByIdAndPeriod(createdDayOff.id, periodId))
      .toMatchObject({ id: createdDayOff.id });
  });

  it('elimina un descanso real en PostgreSQL', async () => {
    const userId = await createTestUser('days-off-delete@example.com');
    const periodId = await createTestPeriod(userId);
    const createdDayOff = await createTestDayOff(repository, periodId);

    await repository.deleteByIdAndPeriod(createdDayOff.id, periodId);

    const result = await pool.query<DayOffRow>(
      'SELECT id FROM days_off WHERE id = $1',
      [createdDayOff.id],
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
    ['Test', 'User', createUniqueEmail(email), 'fake-password-hash'],
  );

  const userId = result.rows[0]!.id;
  createdUserIds.push(userId);

  return userId;
}

async function createTestPeriod(
  userId: number,
  name = 'Agosto-Diciembre 2026',
  startDate = '2026-08-01',
  endDate = '2026-12-15',
): Promise<number> {
  const result = await pool.query<{ id: number }>(
    `
      INSERT INTO academic_periods (name, start_date, end_date, color, user_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `,
    [name, startDate, endDate, '#2563EB', userId],
  );

  const periodId = result.rows[0]!.id;
  createdPeriodIds.push(periodId);

  return periodId;
}

async function createTestDayOff(
  repository: PgDaysOffRepository,
  periodId: number,
  input: CreateDayOffInput = {
    name: 'Consejo técnico',
    type: 'day_off',
    startDate: '2026-09-10',
    endDate: '2026-09-10',
    notes: null,
  },
): Promise<DayOffRow> {
  const dayOff = await repository.create(periodId, input);
  createdDayOffIds.push(dayOff.id);

  return dayOff;
}

async function deleteCreatedRecords() {
  if (createdDayOffIds.length) {
    await pool.query(
      'DELETE FROM days_off WHERE id = ANY($1::int[])',
      [createdDayOffIds],
    );
  }

  if (createdPeriodIds.length) {
    await pool.query(
      'DELETE FROM academic_periods WHERE id = ANY($1::int[])',
      [createdPeriodIds],
    );
  }

  if (createdUserIds.length) {
    await pool.query(
      'DELETE FROM users WHERE id = ANY($1::int[])',
      [createdUserIds],
    );
  }
}

function createUniqueEmail(email: string): string {
  const [localPart, domain] = email.split('@');

  return `${localPart}+${process.pid}-${Date.now()}-${emailSequence++}@${domain}`;
}

function expectDatabaseDate(
  value: string | Date,
  expectedDate: string,
) {
  expect(value).toBeInstanceOf(Date);

  if (!(value instanceof Date)) {
    throw new Error('PostgreSQL no devolvió la fecha como Date');
  }

  expect(value.toISOString().slice(0, 10)).toBe(expectedDate);
}
