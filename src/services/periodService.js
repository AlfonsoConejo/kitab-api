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
    const error = new Error("PERIOD_NOT_FOUND");
    error.code = "PERIOD_NOT_FOUND"
    error.status = 404;
    throw error;
  }

  return result.rows[0];
};