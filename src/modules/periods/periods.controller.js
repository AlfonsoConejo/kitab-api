import { pool } from "../../config/db.js"
import { assertPeriodOwnership } from "../../services/periodService.js";
import { normalizePeriod } from "../../validators.js/periodValidator.js";
import { normalizeAndValidateSubject, normalizeSubject} from "../../validators.js/subjectValidator.js";
import { insertSubject, assertSubjectOwnership, readSubjectsByPeriod } from "../../services/subjectServices.js";
import { normalizeAndValidateClasses } from "../../validators.js/classValidator.js";
import { insertClasses, readClasses } from "../../services/classService.js";

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

  const { periodId } = req.params;
  const userId = req.user.id;
  const parsedPeriodId = Number(periodId);

  // Validate period id
  if (!Number.isInteger(parsedPeriodId) || parsedPeriodId <= 0) {
    return res.status(400).json({
      success: false,
      message: "El ID del período no es válido."
    });
  }

  let client;

  try {
    client = await pool.connect();
    
    await assertPeriodOwnership(parsedPeriodId, userId, client);

    const subjects = await readSubjectsByPeriod(parsedPeriodId, client);

    return res.status(200).json({
      success: true,
      data: subjects,
    });

  } catch (error) {
    console.error("Error al obtener las materias:", error);

    if (error.status === 404 && error.code === "PERIOD_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Periodo no encontrado."
      });
    }

    return res.status(500).json({
      success: false,
      message: "Error interno del servidor."
    });
  } finally {
    if (client) {
      client.release();
    }
  }
};

export const createSubject = async (req, res) => {
  const { periodId } = req.params;
  const userId = req.user.id;
  const {
    classes = [],
    ...subjectData
  } = req.body;

  const parsedPeriodId = Number(periodId);

  // Validate period id
  if (!Number.isInteger(parsedPeriodId) || parsedPeriodId <= 0) {
    return res.status(400).json({
      success: false,
      message: "El ID del período no es válido."
    });
  }

  let client;
  let transactionStarted = false;

  try {
    client = await pool.connect();

    await client.query("BEGIN");
    transactionStarted = true;

    // Verifiy period ownership
    const period = await assertPeriodOwnership(parsedPeriodId, userId, client);

    // // Normalize and validate subject
    const normalizedSubject = normalizeAndValidateSubject(subjectData, period);

    //Insert subject on DB
    const createdSubject  = await insertSubject(parsedPeriodId, normalizedSubject, client);

    let createdClasses = [];

    // It there are classes
    if(classes.length > 0){
      // // Normalize and validate classes
      const normalizedClasses = normalizeAndValidateClasses(classes);

      // Insert classes on DB
      createdClasses =
        await insertClasses(
          client,
          createdSubject.id,
          normalizedClasses);
    }

    await client.query("COMMIT");
    transactionStarted = false;

    return res.status(201).json({
      success: true,
      message: "Materia creada correctamente.",
      subject: createdSubject,
      classes: createdClasses
    });

  } catch (error) {
    console.error(error);

    if (client && transactionStarted) {
      await client.query("ROLLBACK");
    }

    if (error.status === 404 && error.code === "PERIOD_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Periodo no encontrado."
      });
    }

    if (error.status === 400) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (
      error.code === "23505" &&
      error.constraint === "period_subject_unique"
    ) {
      return res.status(409).json({
        success: false,
        message: "Ya existe una materia con ese nombre en este periodo."
      });
    }

    return res.status(500).json({
      success: false,
      message: "Error en el servidor."
    });
  } finally {
    if (client) {
      client.release();
    }
  }
}

export const getClasses = async (req, res) => {

  const { periodId } = req.params;
  const userId = req.user.id;

  const parsedPeriodId = Number(periodId);

  // Validate period id
  if (!Number.isInteger(parsedPeriodId) || parsedPeriodId <= 0) {
    return res.status(400).json({
      success: false,
      message: "El ID del período no es válido."
    });
  }

  let client;

  try {
    client = await pool.connect();

    await assertPeriodOwnership(parsedPeriodId, userId, client);

    // Get all classes from the period
    const classes = await readClasses(client, parsedPeriodId);

    return res.status(200).json({
      success: true,
      data: classes
    });
  } catch (error) {
    console.error(error);

    if (error.status === 404 && error.code === "PERIOD_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Periodo no encontrado."
      });
    }

    return res.status(500).json({
      success: false,
      message: "Error interno del servidor."
    });
  } finally {
    if (client) {
      client.release();
    }
  }
}