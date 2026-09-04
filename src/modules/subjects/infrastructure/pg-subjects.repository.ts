import type { Pool, PoolClient } from 'pg';
import { pool } from '../../../config/db.js';
import { ClassNotFoundError, PeriodNotFoundError, SubjectNotFoundError } from '../subjects.errors.js';
import { toSubjectRecord } from '../subjects.mapper.js';
import type { ClassInput, SubjectUpdateInput } from '../subjects.schemas.js';
import type { ClassRow, SubjectRow } from '../subjects.types.js';

type DatabaseClient = Pool | PoolClient;

export class PgSubjectsRepository {
  constructor(readonly database: Pool = pool) {}

  async getOwnedSubject(
    subjectId: number,
    userId: number,
    client: DatabaseClient = this.database,
  ): Promise<SubjectRow> {
    const result = await client.query<SubjectRow>(
      `SELECT
         s.id, s.period_id, s.name, s.teacher, s.color, s.created_at, s.updated_at, s.start_date, s.end_date,
         p.start_date AS period_start_date, p.end_date AS period_end_date
       FROM subjects s
       JOIN academic_periods p ON p.id = s.period_id
       WHERE s.id = $1 AND p.user_id = $2`,
      [subjectId, userId],
    );

    if (!result.rowCount) {
      throw new SubjectNotFoundError();
    }

    return result.rows[0]!;
  }

  async ensureOwnedPeriod(periodId: number, userId: number): Promise<void> {
    const result = await this.database.query(
      'SELECT id FROM academic_periods WHERE id = $1 AND user_id = $2',
      [periodId, userId],
    );

    if (!result.rowCount) {
      throw new PeriodNotFoundError();
    }
  }

  async getSubject(subjectId: number): Promise<SubjectRow | null> {
    const result = await this.database.query<SubjectRow>(
      `SELECT id, period_id, name, teacher, color, start_date, end_date, created_at, updated_at
       FROM subjects
       WHERE id = $1`,
      [subjectId],
    );

    return result.rows[0] ?? null;
  }

  async listClassesBySubject(subjectId: number): Promise<ClassRow[]> {
    const result = await this.database.query<ClassRow>(
      `SELECT id, subject_id, days, start_time, end_time, mode, classroom, type
       FROM classes
       WHERE subject_id = $1
       ORDER BY (SELECT MIN(day) FROM unnest(days) AS day), start_time, id`,
      [subjectId],
    );

    return result.rows;
  }

  async createClasses(
    subjectId: number,
    classes: ClassInput[],
    client: PoolClient,
  ): Promise<ClassRow[]> {
    const insertedClasses: ClassRow[] = [];

    for (const classItem of classes) {
      const result = await client.query<ClassRow>(
        `INSERT INTO classes (subject_id, days, start_time, end_time, mode, classroom, type)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, subject_id, days, start_time, end_time, mode, classroom, type`,
        [
          subjectId,
          classItem.days,
          classItem.startTime,
          classItem.endTime,
          classItem.mode,
          classItem.classroom,
          classItem.type,
        ],
      );

      insertedClasses.push(result.rows[0]!);
    }

    return insertedClasses;
  }

  async updateSubject(
    subjectId: number,
    input: SubjectUpdateInput,
    client: PoolClient,
  ): Promise<SubjectRow> {
    const subject = toSubjectRecord(input);
    const result = await client.query<SubjectRow>(
      `UPDATE subjects
       SET name = $1, teacher = $2, color = $3, start_date = $4, end_date = $5
       WHERE id = $6
       RETURNING id, period_id, name, teacher, color, start_date, end_date, created_at, updated_at`,
      [subject.name, subject.teacher, subject.color, subject.start_date, subject.end_date, subjectId],
    );

    return result.rows[0]!;
  }

  async ensureClassesOwnership(
    classIds: number[],
    subjectId: number,
    client: PoolClient,
  ): Promise<void> {
    if (!classIds.length) {
      return;
    }

    const result = await client.query(
      'SELECT id FROM classes WHERE id = ANY($1) AND subject_id = $2',
      [classIds, subjectId],
    );

    if (result.rowCount !== classIds.length) {
      throw new ClassNotFoundError();
    }
  }

  async updateClasses(
    classes: Array<ClassInput & { id: number }>,
    client: PoolClient,
  ): Promise<ClassRow[]> {
    const updatedClasses: ClassRow[] = [];

    for (const classItem of classes) {
      const result = await client.query<ClassRow>(
        `UPDATE classes
         SET days = $1, start_time = $2, end_time = $3, mode = $4, classroom = $5, type = $6
         WHERE id = $7
         RETURNING id, subject_id, days, start_time, end_time, mode, classroom, type`,
        [
          classItem.days,
          classItem.startTime,
          classItem.endTime,
          classItem.mode,
          classItem.classroom,
          classItem.type,
          classItem.id,
        ],
      );

      if (!result.rowCount) {
        throw new ClassNotFoundError('La clase a actualizar no existe.');
      }

      updatedClasses.push(result.rows[0]!);
    }

    return updatedClasses;
  }

  async deleteClasses(classIds: number[], client: PoolClient): Promise<number[]> {
    if (!classIds.length) {
      return [];
    }

    const result = await client.query<{ id: number }>(
      'DELETE FROM classes WHERE id = ANY($1) RETURNING id',
      [classIds],
    );

    return result.rows.map((row) => row.id);
  }

  async deleteSubject(subjectId: number): Promise<void> {
    await this.database.query('DELETE FROM subjects WHERE id = $1', [subjectId]);
  }

  async listClassesByPeriodExcludingSubject(
    periodId: number,
    subjectId: number | null,
  ): Promise<ClassRow[]> {
    const result = await this.database.query<ClassRow>(
      `SELECT c.id, c.subject_id, s.name AS subject_name, c.days, c.start_time, c.end_time, c.mode, c.classroom, c.type
       FROM classes c
       JOIN subjects s ON s.id = c.subject_id
       WHERE s.period_id = $1 AND ($2::integer IS NULL OR s.id <> $2)
       ORDER BY s.name, c.start_time`,
      [periodId, subjectId],
    );

    return result.rows;
  }
}
