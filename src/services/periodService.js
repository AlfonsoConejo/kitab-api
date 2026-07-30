import { pool } from "../config/db.js";

export const assertPeriodOwnership = async (periodId, userId, client) => {
  const result = await client.query(
    `SELECT id, name, start_date, end_date, color, user_id, created_at
    FROM academic_periods
    WHERE id = $1 AND user_id = $2`,
    [periodId, userId]
  );

  if (result.rowCount === 0) {
    const error = new Error("El periodo no existe o no te pertenece.");
    error.code = "PERIOD_NOT_FOUND";
    error.status = 404;
    error.name = "NotFoundError";
    throw error;
  }

  return result.rows[0];
};

export const insertPeriod = async (period, userId, client = pool) => {
  const { name, start_date, end_date, color } = period;

  const db = client || pool;

  const result = await db.query(
    `INSERT INTO academic_periods
    (name, start_date, end_date, color, user_id)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, name, start_date, end_date, color, user_id, created_at`,
    [name, start_date, end_date, color, userId]
  );

  return result.rows[0];
};

export const readPeriodsByUser = async (userId, client = pool) => {
  const db = client || pool;

  const result = await db.query(
    `SELECT id, name, start_date, end_date, color, user_id, created_at
    FROM academic_periods
    WHERE user_id = $1
    ORDER BY start_date DESC`,
    [userId]
  );

  return result.rows;
};

export const deletePeriodDB = async (periodId, client = pool) => {
  const db = client || pool;

  const result = await db.query(
    `DELETE FROM academic_periods
    WHERE id = $1
    RETURNING id`, // ← Confirma qué se eliminó
    [periodId]
  );

  if (result.rowCount === 0) {
    const error = new Error("El periodo no existe");
    error.code = "PERIOD_NOT_FOUND";
    error.status = 404;
    throw error;
  }

  return result.rows[0];
};

export const updatePeriodDB = async (periodId, period, client = pool) => {
  const { name, start_date, end_date, color } = period;
  const db = client || pool;

  const result = await db.query(
    `UPDATE academic_periods
    SET name = $1,
        start_date = $2,
        end_date = $3,
        color = $4
    WHERE id = $5
    RETURNING id, name, start_date, end_date, color, user_id, created_at`,
    [name, start_date, end_date, color, periodId]
  );

  // Check if there were rows affected
  if (result.rowCount === 0) {
    return null; 
  }

  return result.rows[0];
};