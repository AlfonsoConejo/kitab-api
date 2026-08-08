import { pool } from "../config/db.js"

export const assertSubjectOwnership = async (subjectId, userId, client = pool) => {
  const db = client || pool;

  const result = await db.query(
    `
    SELECT s.id, s.period_id, s.name, s.teacher, s.color, s.created_at, s.updated_at, s.start_date, s.end_date, p.start_date AS period_start_date,
      p.end_date AS period_end_date
    FROM subjects s
    JOIN academic_periods p ON s.period_id = p.id
    WHERE s.id = $1 AND p.user_id = $2
    `,
    [subjectId, userId]
  );

  if (result.rowCount === 0) {
    const error = new Error("La materia no existe o no te pertenece.");
    error.code = "SUBJECT_NOT_FOUND";
    error.status = 404;
    error.name = "NotFoundError";
    throw error;
  }

  return result.rows[0];
};

export const readSubjectsByPeriod = async (periodId, client = pool) => {
  const db = client || pool;

  const result = await db.query(
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

  return result.rows;
};

export const readSubject = async (subjectId, client = pool) => {
  const db = client || pool;
  const result = await db.query(
    `SELECT
      id,
      period_id,
      name,
      teacher,
      color,
      start_date,
      end_date
    FROM subjects
    WHERE id = $1`,
    [subjectId]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return result.rows[0];
}

export const insertSubject = async (periodId, subject, client = pool) => {
  const db = client || pool;
  const {
    name,
    teacher,
    color,
    start_date,
    end_date  
  } = subject;

  const result = await db.query(
    `INSERT INTO subjects
    (period_id, name, teacher, color, start_date, end_date)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, period_id, name, teacher, color, start_date, end_date`,
    [periodId, name, teacher, color, start_date, end_date]
  );

  return result.rows[0];
};

export const updateSubjectDB = async ( subjectId, subject, client = pool ) => {
  const db = client || pool;

  const {
    name,
    teacher,
    color,
    start_date,
    end_date
  } = subject;

  const result = await db.query(
    `
    UPDATE subjects
    SET name = $1,
        teacher = $2,
        color = $3,
        start_date = $4,
        end_date = $5
    WHERE id = $6
    RETURNING id, period_id, name, teacher, color, start_date, end_date, created_at, updated_at
    `,
    [
      name,
      teacher,
      color,
      start_date,
      end_date,
      subjectId
    ]
  );

  // Check if there were rows affected
  if (result.rowCount === 0) {
    return null;
  }

  return result.rows[0];
};

export const deleteSubjectDB = async (subjectId, client = pool) => {
  const db = client || pool;

  const result = await db.query(
    `DELETE FROM subjects
    WHERE id = $1
    RETURNING id`,
    [subjectId]
  );

  if (result.rowCount === 0) {
    const error = new Error("La materia no existe");
    error.code = "SUBJECT_NOT_FOUND";
    error.status = 404;
    throw error;
  }

  return result.rows[0];
};