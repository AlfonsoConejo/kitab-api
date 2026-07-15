import { pool } from "../config/db.js";
import { normalizeClass } from "../validators.js/classValidator.js";

export const insertClasses = async (
  client,
  subjectId,
  normalizedClasses
) => {

  const insertedClasses = [];

  for (const classItem of normalizedClasses) {
    const {
      days,
      type,
      mode,
      classroom,
      startTime,
      endTime,
    } = classItem;

    const result = await client.query(
      `INSERT INTO classes
      (subject_id, days, start_time, end_time, mode, classroom, type)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, subject_id, days, start_time, end_time, mode, classroom, type`,
      [
        subjectId,
        days,
        startTime,
        endTime,
        mode,
        classroom,
        type,
      ]
    );

    insertedClasses.push(normalizeClass(result.rows[0]));
  }

  return insertedClasses;
};

export const readClassesByPeriod = async (client, periodId) => {
  const result = await client.query(
    `
    SELECT
      c.id,
      c.subject_id,
      c.days,
      c.start_time,
      c.end_time,
      c.mode,
      c.classroom,
      c.type
    FROM classes c
    JOIN subjects s
      ON c.subject_id = s.id
    JOIN academic_periods p
      ON s.period_id = p.id
    WHERE p.id = $1
    `,
    [periodId]
  );

  return result.rows.map(normalizeClass);
};

export const readClassesBySubject = async (subjectId, client) => {
  const result = await client.query(
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
    ORDER BY id
    `,
    [subjectId]
  );

  return result.rows.map(normalizeClass);
};