import { pool } from "../../config/db.js"

export const newPeriod = async (req, res) => {
  try {
    const { name, startDate, endDate, color } = req.body;
    const userId = req.user.id;

    // Validations
    if (!name?.trim() || !startDate || !endDate || !color) {
      return res.status(400).json({
        message: "Todos los campos son obligatorios."
      });
    }
    
    const cleanName = name.trim();

    if (cleanName.length > 30) {
      return res.status(400).json({
        message: "El nombre del periodo debe tener máximo 30 caracteres."
      });
    }

    if (startDate >= endDate) {
      return res.status(400).json({
        message: "La fecha de inicio debe ser anterior a la fecha de finalización."
      });
    }

    const result = await pool.query(
      `INSERT INTO academic_periods
      (name, start_date, end_date, color, user_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [cleanName, startDate, endDate, color, userId]
    );

    return res.status(201).json({
      message: "Period created successfully",
      period: result.rows[0]
    });
  } catch (error) {
    console.error(error);

    if (error.code === "23505") {
      return res.status(409).json({
        message: "Ya existe un periodo con ese nombre."
      });
    }

    return res.status(500).json({
      message: "Server error"
    });
  }
};