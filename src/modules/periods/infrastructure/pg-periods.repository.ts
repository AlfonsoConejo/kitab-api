import type { Pool, PoolClient } from 'pg';
import { pool } from '../../../config/db.js';
import { PeriodNotFoundError } from '../periods.errors.js';
import type { ClassRow, PeriodRow, SubjectRow } from '../periods.types.js';
import type { CreateSubjectInput, PeriodInput } from '../periods.schemas.js';
import { toPeriodRecord, toSubjectRecord } from '../periods.mapper.js';

type DatabaseClient = Pool | PoolClient;

export class PgPeriodsRepository {
  // Recibe el pool de PostgreSQL; permite sustituirlo por un doble en pruebas.
  constructor(private readonly database: Pool = pool) {}

  // Ejecuta una operación dentro de una transacción y confirma o revierte sus cambios.
  async withTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.database.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Inserta un período académico y devuelve la fila creada.
  async createPeriod(input: PeriodInput, userId: number): Promise<PeriodRow> {
    const period = toPeriodRecord(input);

    const query = `
      INSERT INTO academic_periods (name, start_date, end_date, color, user_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, start_date, end_date, color, user_id, created_at`;

    const values = [
      period.name,
      period.start_date,
      period.end_date,
      period.color,
      userId
    ];

    const result = await this.database.query<PeriodRow>(query, values);

    return result.rows[0]!;
  }

  // Obtiene todos los períodos de un usuario ordenados por fecha de inicio descendente.
  async listPeriods(userId: number): Promise<PeriodRow[]> {
    const result = await this.database.query<PeriodRow>(
      `SELECT id, name, start_date, end_date, color, user_id, created_at
       FROM academic_periods 
       WHERE user_id = $1 
       ORDER BY start_date DESC`,
      [userId],
    );
    return result.rows;
  }

  // Busca un período del usuario indicado o lanza un error cuando no existe o no le pertenece.
  async getOwnedPeriod(periodId: number, userId: number, client: DatabaseClient = this.database): Promise<PeriodRow> {
    const result = await client.query<PeriodRow>(
      `SELECT id, name, start_date, end_date, color, user_id, created_at
       FROM academic_periods 
       WHERE id = $1 AND user_id = $2`,
      [periodId, userId],
    );

    if (!result.rowCount) {
      throw new PeriodNotFoundError();
    }
    return result.rows[0]!;
  }

  // Actualiza los datos de un período y devuelve la fila resultante, si existe.
  async updatePeriod(periodId: number, input: PeriodInput): Promise<PeriodRow | null> {
    const period = toPeriodRecord(input);
    const result = await this.database.query<PeriodRow>(
      `UPDATE academic_periods 
       SET name = $1, start_date = $2, end_date = $3, color = $4
       WHERE id = $5
       RETURNING id, name, start_date, end_date, color, user_id, created_at`,
      [period.name, period.start_date, period.end_date, period.color, periodId],
    );
    return result.rows[0] ?? null;
  }

  // Elimina un período por su identificador.
  async deletePeriod(periodId: number): Promise<void> {
    await this.database.query(
      `DELETE FROM academic_periods 
       WHERE id = $1`, 
      [periodId]
    );
  }

  // Obtiene las materias que pertenecen a un período.
  async listSubjects(periodId: number): Promise<SubjectRow[]> {
    const result = await this.database.query<SubjectRow>(
      `SELECT id, period_id, name, teacher, color, start_date, end_date
       FROM subjects 
       WHERE period_id = $1 
       ORDER BY unaccent(name)`,
      [periodId],
    );
    return result.rows;
  }

  // Obtiene todas las clases de las materias de un período en orden de horario.
  async listClasses(periodId: number): Promise<ClassRow[]> {
    const result = await this.database.query<ClassRow>(
      `SELECT c.id, c.subject_id, s.name AS subject_name, c.days, c.start_time, c.end_time, c.mode, c.classroom, c.type
       FROM classes c JOIN subjects s ON c.subject_id = s.id
       WHERE s.period_id = $1
       ORDER BY (SELECT MIN(day) FROM unnest(c.days) AS day), c.start_time, s.name, c.id`,
      [periodId],
    );
    return result.rows;
  }

  // Inserta una materia usando el cliente activo de una transacción.
  async createSubject(periodId: number, input: CreateSubjectInput, client: PoolClient): Promise<SubjectRow> {
    const subject = toSubjectRecord(input);
    const result = await client.query<SubjectRow>(
      `INSERT INTO subjects (period_id, name, teacher, color, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, period_id, name, teacher, color, start_date, end_date`,
      [periodId, subject.name, subject.teacher, subject.color, subject.start_date, subject.end_date],
    );
    return result.rows[0]!;
  }

  // Inserta las clases de una materia usando el cliente activo de una transacción.
  async createClasses(subjectId: number, classes: CreateSubjectInput['classes'], client: PoolClient): Promise<void> {
    for (const classItem of classes) {
      await client.query(
        `INSERT INTO classes (subject_id, days, start_time, end_time, mode, classroom, type)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [subjectId, classItem.days, classItem.startTime, classItem.endTime, classItem.mode, classItem.classroom, classItem.type],
      );
    }
  }
}
