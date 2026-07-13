import { pool } from "../config/db.js"
import { normalizeSubject } from "../validators.js/subjectValidator.js";

export const assertSubjectOwnership = async (subjectId, userId, client) => {
  const { rowCount } = await client.query(
    `
    SELECT 1
    FROM subjects s
    JOIN academic_periods p ON s.period_id = p.id
    WHERE s.id = $1 AND p.user_id = $2
    `,
    [subjectId, userId]
  );

  if (rowCount === 0) {
    const error = new Error("SUBJECT_NOT_FOUND");
    error.code = "SUBJECT_NOT_FOUND";
    error.status = 404;
    throw error;
  }

  return true;
};

export const readSubjectsByPeriod = async (periodId, client = pool) => {
  const result = await client.query(
    `SELECT
      id,
      period_id,
      name,
      teacher,
      color,
      start_date,
      end_date
    FROM subjects
    WHERE period_id = $1
    ORDER BY name;`,
    [periodId]
  );

  return result.rows.map(normalizeSubject);
};

export const insertSubject = async (periodId, normalizedSubject, client) => {
  const {
    name,
    teacher,
    color,
    startDate,
    endDate
  } = normalizedSubject;

  const result = await client.query(
    `INSERT INTO subjects
    (period_id, name, teacher, color, start_date, end_date)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, period_id, name, teacher, color, start_date, end_date`,
    [periodId, name, teacher, color, startDate, endDate]
  );

  return normalizeSubject(result.rows[0]);
}

export const deleteSubject = async(subjectId, client) => {
  const { rowCount } = await client.query(
    `DELETE FROM subjects
    WHERE id = $1`,
    [subjectId]
  );
}