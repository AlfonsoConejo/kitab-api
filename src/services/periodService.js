import { pool } from "../config/db.js";
export const assertPeriodOwnership = async (periodId, userId) => {
  const result = await pool.query(
    `SELECT id
     FROM academic_periods
     WHERE id = $1
       AND user_id = $2`,
    [periodId, userId]
  );

  if (result.rowCount === 0) {
    const error = new Error("PERIOD_NOT_FOUND");
    error.status = 404;
    throw error;
  }

  return result.rows[0];
};