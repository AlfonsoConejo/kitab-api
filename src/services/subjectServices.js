import { pool } from "../config/db.js"
import { normalizeSubject } from "../validators.js/subjectValidator.js";

export const assertSubjectOwnership = async (subjectId, userId, client) => {
  const { rowCount } = await client.query(
    `
    SELECT 1
    FROM subjects s
    JOIN periods p ON s.period_id = p.id
    WHERE s.id = $1 AND p.user_id = $2
    `,
    [subjectId, userId]
  );

  if (rowCount === 0) {
    const error = new Error("SUBJECT_ACCESS_DENIED");
    error.code = "SUBJECT_ACCESS_DENIED";
    error.status = 403;
    throw error;
  }

  return true;
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