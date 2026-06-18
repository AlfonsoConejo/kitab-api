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
      message: "Periodo creado exitosamente",
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

export const periods = async (req, res) => {
  try{
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT *
      FROM academic_periods
      WHERE user_id = $1
      `,
      [userId]
    );

    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error){
    console.error("Error al obtener periodos:", error);
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor."
    });
  }
};

export const requestedPeriod = async (req, res) => {
  try{
    const userId = req.user.id;
    const {periodId} = req.params;

    const result = await pool.query(
      `SELECT *
      FROM academic_periods
      WHERE id = $1 
      AND user_id = $2
      `,
      [periodId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Periodo no encontrado."
      });
    }

    return res.status(200).json({
      success: true,
      data: result.rows[0]
    });

  } catch (error){
    console.error("Error al obtener el periodo especificado:", error);
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor."
    });
  }
}

export const deletePeriod = async (req, res) => {
  try {
    const userId = req.user.id;
    const { periodId } = req.params;

    const result = await pool.query(
      `DELETE FROM academic_periods
      WHERE id = $1
      AND user_id = $2`,
      [periodId, userId]
    );

    // Verify if ID exists
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "El periodo académico no existe."
      });
    }

    // Period deleted successfully
    return res.status(200).json({
      success: true,
      message: "Periodo eliminado correctamente."
    });
  } catch (error) {
    console.error("Error al eliminar el periodo:", error);

    return res.status(500).json({
      success: false,
      message: "Error interno del servidor."
    });
  }
};

export const updatePeriod = async (req, res) => {
  try {
    const userId = req.user.id;
    const periodId = Number(req.params.periodId);
    const { name, startDate, endDate, color } = req.body;

    // Validations

    if (!Number.isInteger(periodId) || periodId <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID de periodo inválido."
      });
    }

    if (!name?.trim() || !startDate || !endDate || !color) {
      return res.status(400).json({
        success: false,
        message: "Todos los campos son obligatorios."
      });
    }

    const cleanName = name.trim();
    if (cleanName.length > 30) {
      return res.status(400).json({
        success: false,
        message: "El nombre del periodo debe tener máximo 30 caracteres."
      });
    }

    // Date validation
    if (startDate >= endDate) {
      return res.status(400).json({
        success: false,
        message: "La fecha de inicio debe ser anterior a la fecha de finalización."
      });
    }

    // Execute update
    const result = await pool.query(
      `UPDATE academic_periods
      SET name = $1,
          start_date = $2,
          end_date = $3,
          color = $4
      WHERE id = $5
      AND user_id = $6
      RETURNING *`,
      [cleanName, startDate, endDate, color, periodId, userId]
    );

    // Verify if the period exists and belongs to the user
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "El periodo académico no existe."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Periodo actualizado correctamente.",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("Error al actualizar el periodo:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Ya existe un periodo con ese nombre."
      });
    }
    
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor."
    });
  }
};

export const getSubjects = async (req, res) => {
  try {
    const userId = req.user.id;
    const periodId = Number(req.params.periodId);

    // Validate received periodId
    if (!Number.isInteger(periodId) || periodId <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID de periodo inválido."
      });
    }

    // Verify that the period exists and belongs to the user
    const period = await pool.query(
      `SELECT id
        FROM academic_periods
        WHERE id = $1
        AND user_id = $2`,
        [periodId, userId]
      );

    if (period.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Periodo no encontrado."
      });
    }

    // Get information of the subjects in the period
    const result = await pool.query(
      `SELECT
        id,
        name,
        teacher,
        color,
        created_at,
        updated_at
      FROM subjects
      WHERE period_id = $1
      ORDER BY name;`,
      [periodId]
    );

    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error("Error al obtener las materias:", error);

    return res.status(500).json({
      success: false,
      message: "Error interno del servidor."
    });
  }
};