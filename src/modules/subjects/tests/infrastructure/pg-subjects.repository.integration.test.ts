import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { PoolClient } from 'pg';
import { pool } from '../../../../config/db.js';
import {
  ClassNotFoundError,
  PeriodNotFoundError,
  SubjectNotFoundError,
} from '../../subjects.errors.js';
import { PgSubjectsRepository } from '../../infrastructure/pg-subjects.repository.js';
import type { ClassInput, CreateSubjectInput, SubjectUpdateInput } from '../../subjects.schemas.js';
import type { ClassRow, SubjectRow } from '../../subjects.types.js';

type ClassFixtureInput = Omit<ClassInput, 'id'>;

let createdClassIds: number[] = [];
let createdSubjectIds: number[] = [];
let createdPeriodIds: number[] = [];
let createdUserIds: number[] = [];
let emailSequence = 0;

describe('PgSubjectsRepository - integración', () => {
  const repository = new PgSubjectsRepository(pool);

  beforeEach(() => {
    createdClassIds = [];
    createdSubjectIds = [];
    createdPeriodIds = [];
    createdUserIds = [];
  });

  afterEach(async () => {
    await deleteCreatedRecords();
  });

  afterAll(async () => {
    await pool.end();
  });

  it('obtiene una materia y su período únicamente para el propietario', async () => {
    const ownerId = await createTestUser('subjects-owner@example.com');
    const otherUserId = await createTestUser('subjects-other@example.com');
    const periodId = await createTestPeriod(ownerId);
    const subject = await createTestSubject(repository, periodId);

    const result = await repository.getOwnedSubject(subject.id, ownerId);

    expect(result).toMatchObject({ id: subject.id, period_id: periodId, name: subject.name });
    expectDatabaseDate(result.period_start_date!, '2026-08-01');
    expectDatabaseDate(result.period_end_date!, '2026-12-15');
    await expect(repository.getOwnedSubject(subject.id, otherUserId))
      .rejects.toBeInstanceOf(SubjectNotFoundError);
  });

  it('valida que el período pertenezca al usuario', async () => {
    const ownerId = await createTestUser('subjects-period-owner@example.com');
    const otherUserId = await createTestUser('subjects-period-other@example.com');
    const periodId = await createTestPeriod(ownerId);

    const period = await repository.ensureOwnedPeriod(periodId, ownerId);

    expectDatabaseDate(period.start_date, '2026-08-01');
    expectDatabaseDate(period.end_date, '2026-12-15');
    await expect(repository.ensureOwnedPeriod(periodId, otherUserId))
      .rejects.toBeInstanceOf(PeriodNotFoundError);
  });

  it('crea una materia real y la encuentra por ID', async () => {
    const userId = await createTestUser('subjects-create@example.com');
    const periodId = await createTestPeriod(userId);
    const input: CreateSubjectInput = {
      name: 'Literatura',
      teacher: 'Taylor Swift',
      color: '#7C3AED',
      startDate: '2026-08-03',
      endDate: '2026-12-12',
      classes: [],
    };

    const created = await createTestSubject(repository, periodId, input);
    const found = await repository.getSubject(created.id);

    expect(created).toMatchObject({
      period_id: periodId,
      name: input.name,
      teacher: input.teacher,
      color: input.color,
    });
    expectDatabaseDate(created.start_date, input.startDate);
    expectDatabaseDate(created.end_date, input.endDate);
    expect(found).toMatchObject({ id: created.id, name: input.name });
    await expect(repository.getSubject(999999)).resolves.toBeNull();
  });

  it('lista únicamente las materias del período en orden alfabético sin acentos', async () => {
    const userId = await createTestUser('subjects-list@example.com');
    const periodId = await createTestPeriod(userId);
    const otherPeriodId = await createTestPeriod(userId, 'Enero-Junio 2027', '2027-01-01', '2027-06-30');
    const biology = await createTestSubject(repository, periodId, subjectInput({ name: 'Biología' }));
    const algebra = await createTestSubject(repository, periodId, subjectInput({ name: 'Álgebra' }));
    await createTestSubject(repository, otherPeriodId, subjectInput({ name: 'Otra materia' }));

    const subjects = await repository.listSubjectsByPeriod(periodId);

    expect(subjects.map((subject) => subject.id)).toEqual([algebra.id, biology.id]);
    expect(subjects.every((subject) => subject.period_id === periodId)).toBe(true);
  });

  it('crea clases y las lista por materia en orden de día y hora', async () => {
    const userId = await createTestUser('subjects-classes@example.com');
    const periodId = await createTestPeriod(userId);
    const subject = await createTestSubject(repository, periodId);
    const fridayClass = await createTestClass(repository, subject.id, {
      days: [5], startTime: '14:00', endTime: '15:00', mode: 'online', classroom: null, type: 'workshop',
    });
    const mondayClass = await createTestClass(repository, subject.id, {
      days: [1, 3], startTime: '08:00', endTime: '09:00', mode: 'onsite', classroom: 'A-101', type: 'theory',
    });

    const classes = await repository.listClassesBySubject(subject.id);

    expect(classes.map((classItem) => classItem.id)).toEqual([mondayClass.id, fridayClass.id]);
    expect(classes).toEqual(expect.arrayContaining([
      expect.objectContaining({ subject_id: subject.id, days: [1, 3], classroom: 'A-101' }),
    ]));
  });

  it('lista las clases del período y puede excluir una materia', async () => {
    const userId = await createTestUser('subjects-period-classes@example.com');
    const periodId = await createTestPeriod(userId);
    const algebra = await createTestSubject(repository, periodId, subjectInput({ name: 'Álgebra' }));
    const biology = await createTestSubject(repository, periodId, subjectInput({ name: 'Biología' }));
    const algebraClass = await createTestClass(repository, algebra.id, {
      days: [2], startTime: '10:00', endTime: '11:00', mode: 'onsite', classroom: 'A-101', type: 'theory',
    });
    const biologyClass = await createTestClass(repository, biology.id, {
      days: [4], startTime: '11:00', endTime: '12:00', mode: 'onsite', classroom: 'B-202', type: 'laboratory',
    });

    const allClasses = await repository.listClassesByPeriod(periodId);
    const excludingAlgebra = await repository.listClassesByPeriodExcludingSubject(periodId, algebra.id);
    const excludingNothing = await repository.listClassesByPeriodExcludingSubject(periodId, null);

    expect(allClasses.map((classItem) => classItem.id)).toEqual([algebraClass.id, biologyClass.id]);
    expect(allClasses[0]).toMatchObject({ subject_name: 'Álgebra' });
    expect(excludingAlgebra.map((classItem) => classItem.id)).toEqual([biologyClass.id]);
    expect(excludingNothing.map((classItem) => classItem.id)).toEqual(
      expect.arrayContaining([algebraClass.id, biologyClass.id]),
    );
    expect(excludingNothing).toHaveLength(2);
  });

  it('actualiza una materia real en PostgreSQL', async () => {
    const userId = await createTestUser('subjects-update@example.com');
    const periodId = await createTestPeriod(userId);
    const subject = await createTestSubject(repository, periodId);
    const input: SubjectUpdateInput = {
      name: 'Literatura moderna',
      teacher: 'Taylor Swift',
      color: '#DB2777',
      startDate: '2026-08-10',
      endDate: '2026-12-10',
      classes: [],
      deletedClassIds: [],
    };

    const updated = await withClient((client) => repository.updateSubject(subject.id, input, client));

    expect(updated).toMatchObject({ id: subject.id, name: input.name, teacher: input.teacher, color: input.color });
    expectDatabaseDate(updated.start_date, input.startDate);
    expectDatabaseDate(updated.end_date, input.endDate);
  });

  it('valida la propiedad de clases antes de modificarlas', async () => {
    const userId = await createTestUser('subjects-class-ownership@example.com');
    const periodId = await createTestPeriod(userId);
    const subject = await createTestSubject(repository, periodId);
    const otherSubject = await createTestSubject(repository, periodId, subjectInput({ name: 'Otra materia' }));
    const classItem = await createTestClass(repository, subject.id);

    await withClient((client) => repository.ensureClassesOwnership([], subject.id, client));
    await withClient((client) => repository.ensureClassesOwnership([classItem.id], subject.id, client));
    await expect(withClient((client) => repository.ensureClassesOwnership([classItem.id], otherSubject.id, client)))
      .rejects.toBeInstanceOf(ClassNotFoundError);
  });

  it('actualiza y elimina clases reales', async () => {
    const userId = await createTestUser('subjects-update-classes@example.com');
    const periodId = await createTestPeriod(userId);
    const subject = await createTestSubject(repository, periodId);
    const classItem = await createTestClass(repository, subject.id);
    const update = {
      id: classItem.id,
      days: [2, 4],
      startTime: '12:00',
      endTime: '13:30',
      mode: 'online' as const,
      classroom: null,
      type: 'laboratory' as const,
    };

    const updated = await withClient((client) => repository.updateClasses([update], client));
    const deletedIds = await withClient((client) => repository.deleteClasses([classItem.id], client));

    expect(updated[0]).toMatchObject({ id: classItem.id, days: update.days, mode: 'online', type: 'laboratory' });
    expect(deletedIds).toEqual([classItem.id]);
  });

  it('lanza error al actualizar una clase inexistente y elimina una materia', async () => {
    const userId = await createTestUser('subjects-delete@example.com');
    const periodId = await createTestPeriod(userId);
    const subject = await createTestSubject(repository, periodId);
    const classItem = await createTestClass(repository, subject.id);
    const update = {
      id: 999999,
      days: classItem.days,
      startTime: classItem.start_time.slice(0, 5),
      endTime: classItem.end_time.slice(0, 5),
      mode: classItem.mode,
      classroom: classItem.classroom,
      type: classItem.type,
    };

    await expect(withClient((client) => repository.updateClasses([update], client)))
      .rejects.toBeInstanceOf(ClassNotFoundError);

    await repository.deleteSubject(subject.id);

    await expect(repository.getSubject(subject.id)).resolves.toBeNull();
  });
});

async function createTestUser(email: string): Promise<number> {
  const result = await pool.query<{ id: number }>(
    `INSERT INTO users (first_name, last_name, email, password_hash)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
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
    `INSERT INTO academic_periods (name, start_date, end_date, color, user_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [name, startDate, endDate, '#2563EB', userId],
  );

  const periodId = result.rows[0]!.id;
  createdPeriodIds.push(periodId);
  return periodId;
}

async function createTestSubject(
  repository: PgSubjectsRepository,
  periodId: number,
  input: CreateSubjectInput = subjectInput(),
): Promise<SubjectRow> {
  const subject = await withClient((client) => repository.createSubject(periodId, input, client));
  createdSubjectIds.push(subject.id);
  return subject;
}

async function createTestClass(
  repository: PgSubjectsRepository,
  subjectId: number,
  input: ClassFixtureInput = {
    days: [1],
    startTime: '09:00',
    endTime: '10:00',
    mode: 'onsite',
    classroom: 'A-101',
    type: 'theory',
  },
): Promise<ClassRow> {
  const classItem = await withClient(async (client) => {
    const classes = await repository.createClasses(subjectId, [{ id: undefined, ...input }], client);
    return classes[0]!;
  });
  createdClassIds.push(classItem.id);
  return classItem;
}

function subjectInput(overrides: Partial<CreateSubjectInput> = {}): CreateSubjectInput {
  return {
    name: 'Matemáticas',
    teacher: 'Taylor Swift',
    color: '#7C3AED',
    startDate: '2026-08-03',
    endDate: '2026-12-12',
    classes: [],
    ...overrides,
  };
}

async function withClient<T>(operation: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();

  try {
    return await operation(client);
  } finally {
    client.release();
  }
}

async function deleteCreatedRecords() {
  if (createdClassIds.length) {
    await pool.query('DELETE FROM classes WHERE id = ANY($1::int[])', [createdClassIds]);
  }

  if (createdSubjectIds.length) {
    await pool.query('DELETE FROM subjects WHERE id = ANY($1::int[])', [createdSubjectIds]);
  }

  if (createdPeriodIds.length) {
    await pool.query('DELETE FROM academic_periods WHERE id = ANY($1::int[])', [createdPeriodIds]);
  }

  if (createdUserIds.length) {
    await pool.query('DELETE FROM users WHERE id = ANY($1::int[])', [createdUserIds]);
  }
}

function createUniqueEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  return `${localPart}+${process.pid}-${Date.now()}-${emailSequence++}@${domain}`;
}

function expectDatabaseDate(value: string | Date, expectedDate: string) {
  expect(value).toBeInstanceOf(Date);

  if (!(value instanceof Date)) {
    throw new Error('PostgreSQL no devolvió la fecha como Date');
  }

  expect(value.toISOString().slice(0, 10)).toBe(expectedDate);
}
