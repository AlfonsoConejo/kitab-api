import { pool } from "../../config/db.js"
import { assertPeriodOwnership } from "../../services/periodService.js";

export const createPeriod = async (req, res) => {
  try {
    const { name, startDate, endDate, color } = req.body;
    const userId = req.user.id;

    // Validations
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

    if (startDate >= endDate) {
      return res.status(400).json({
        success: false,
        message: "La fecha de inicio debe ser anterior a la fecha de finalización."
      });
    }

    const result = await pool.query(
      `INSERT INTO academic_periods
      (name, start_date, end_date, color, user_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, start_date, end_date, color`,
      [cleanName, startDate, endDate, color, userId]
    );

    return res.status(201).json({
      success: true,
      message: "Periodo creado correctamente.",
      data: normalizePeriod(result.rows[0])
    });
  } catch (error) {
    console.error(error);

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

export const getPeriods = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `
      SELECT *
      FROM academic_periods
      WHERE user_id = $1
      `,
      [userId]
    );

    return res.status(200).json({
      success: true,
      data: result.rows.map(normalizePeriod),
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor."
    });
  }
};

export const getPeriod = async (req, res) => {
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

    const period = result.rows[0];

    return res.status(200).json({
      success: true,
      data: normalizePeriod(period),
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
      RETURNING id, name, start_date, end_date, color`,
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
      data: normalizePeriod(result.rows[0]),
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

export const getPeriodSubjects = async (req, res) => {
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

export const createSubject = async (req, res) => {
  const { periodId } = req.params;
  const { name, teacher, color } = req.body;
  const userId = req.user.id;

  const parsedPeriodId = Number(periodId);

  // Validations
  if (!Number.isInteger(parsedPeriodId) || parsedPeriodId <= 0) {
    return res.status(400).json({
      message: "El ID del período no es válido."
    });
  }

  if (!name?.trim()) {
    return res.status(400).json({
      message: "El nombre es obligatorio."
    });
  }

  if (!color?.trim()) {
    return res.status(400).json({
      message: "El color es obligatorio."
    });
  }
    
  const cleanSubjectName = name.trim();

  if (cleanSubjectName.length > 50) {
    return res.status(400).json({
      message: "El nombre de la materia debe tener máximo 50 caracteres."
    });
  }

  if (teacher && teacher.trim().length > 50) {
    return res.status(400).json({
      message: "El nombre del profesor debe tener máximo 50 caracteres."
    });
  }

  const cleanTeacherName = teacher?.trim() || null;

  try {

    await assertPeriodOwnership(parsedPeriodId, userId);

    const result = await pool.query(
      `INSERT INTO subjects
      (period_id, name, teacher, color)
      VALUES ($1, $2, $3, $4)
      RETURNING *`,
      [parsedPeriodId, cleanSubjectName, cleanTeacherName, color]
    );

    return res.status(201).json({
      success: true,
      message: "Materia creada correctamente.",
      subject: result.rows[0]
    });

  } catch (error) {
    console.error(error);

    if (
      error.code === "23505" &&
      error.constraint === "period_subject_unique"
    ) {
      return res.status(409).json({
        message: "Ya existe una materia con ese nombre en este período."
      });
    }

    return res.status(500).json({
      message: "Error en el servidor."
    });
  }
}


function normalizePeriod(period) {
  return {
    id: period.id,
    name: period.name,
    startDate: period.start_date.toISOString().slice(0, 10),
    endDate: period.end_date.toISOString().slice(0, 10),
    color: period.color,
  };
}