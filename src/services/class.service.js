import { pool } from "../config/db.js";

export const insertClasses = async (
  client = pool,
  subjectId,
  normalizedClasses  // ← Ya está en snake_case
) => {
  const db = client || pool;
  const insertedClasses = [];

  for (const classItem of normalizedClasses) {
    // ✅ Desestructurar en snake_case
    const {
      days,
      type,
      mode,
      classroom,
      start_time,  // ← snake_case
      end_time,    // ← snake_case
    } = classItem;

    const result = await db.query(
      `INSERT INTO classes
      (subject_id, days, start_time, end_time, mode, classroom, type)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, subject_id, days, start_time, end_time, mode, classroom, type`,
      [
        subjectId,
        days,
        start_time,  // ← snake_case
        end_time,    // ← snake_case
        mode,
        classroom,
        type,
      ]
    );

    insertedClasses.push(result.rows[0]);
  }

  return insertedClasses;
};

export const readClassesByPeriod = async (periodId, client = pool) => {
  const db = client || pool;
  const result = await db.query(
    `
    SELECT
      c.id,
      c.subject_id,
      s.name AS subject_name,
      c.days,
      c.start_time,
      c.end_time,
      c.mode,
      c.classroom,
      c.type
    FROM classes c
    JOIN subjects s ON c.subject_id = s.id
    JOIN academic_periods p ON s.period_id = p.id
    WHERE p.id = $1
    ORDER BY s.name, c.start_time ASC  -- ← Ordenar por materia y hora
    `,
    [periodId]
  );

  return result.rows;
};

export const readClassesBySubject = async (subjectId, client = pool) => {
  const db = client || pool;
  const result = await db.query(
    `
    SELECT
      id,
      subject_id,
      days,
      start_time,
      end_time,
      mode,
      classroom,
      type
    FROM classes
    WHERE subject_id = $1
    ORDER BY start_time ASC
    `,
    [subjectId]
  );

  return result.rows;
};