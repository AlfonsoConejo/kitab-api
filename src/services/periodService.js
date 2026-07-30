import { pool } from "../config/db.js";

export const assertPeriodOwnership = async (periodId, userId, client) => {
  const result = await client.query(
    `SELECT id, start_date::text AS start_date, end_date::text AS end_date
     FROM academic_periods
     WHERE id = $1
       AND user_id = $2`,
    [periodId, userId]
  );

  if (result.rowCount === 0) {
    const error = new Error("El periodo no existe o no te pertenece");
    error.code = "PERIOD_NOT_FOUND";
    error.status = 404;
    error.name = "NotFoundError"; // ← Para identificar en el catch
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