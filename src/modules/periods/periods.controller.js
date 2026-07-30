import { pool } from "../../config/db.js"
import { assertPeriodOwnership, insertPeriod, readPeriodsByUser, deletePeriodDB } from "../../services/periodService.js";
import { normalizeAndValidatePeriod, normalizePeriodFromDB } from "../../validators/periodValidator.js";
import { normalizeAndValidateSubject, normalizeSubject} from "../../validators/subjectValidator.js";
import { insertSubject, assertSubjectOwnership, readSubjectsByPeriod } from "../../services/subjectServices.js";
import { normalizeAndValidateClasses } from "../../validators/classValidator.js";
import { insertClasses, readClassesByPeriod } from "../../services/classService.js";

export const createPeriod = async (req, res) => {

  // Verify user authentication
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Usuario no autenticado"
    });
  }
  
  let client;

  try {
    client = await pool.connect();

    // Normalize and validate period
    const normalizedPeriod = normalizeAndValidatePeriod(req.body);

    // Insert period on DB
    const createdPeriod  = await insertPeriod(normalizedPeriod, userId, client);

    const periodForFrontend = normalizePeriodFromDB(createdPeriod);

    return res.status(201).json({
      success: true,
      message: "Periodo creado correctamente.",
      data: periodForFrontend
    });

  } catch (error) {
    console.error("Error on createPeriod:", error);

    // Validation error
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

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

  } finally {
    if (client) {
      client.release();
    }
  }
};

export const getPeriods = async (req, res) => {
  // Verify user authentication
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Usuario no autenticado"
    });
  }

  let client;

  try {
    client = await pool.connect();

    // Get periods from DB (return array in snake_case)
    const periodsRaw = await readPeriodsByUser(userId, client);

    // Normalize for frontend
    const periodsForFrontend = periodsRaw.map(normalizePeriodFromDB);

    return res.status(200).json({
      success: true,
      data: periodsForFrontend,
    });

  } catch (error) {
    console.error("Error en getPeriods:", error);
    
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

export const getPeriod = async (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Usuario no autenticado"
    });
  }

  const {periodId} = req.params;

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
    
    // assertPeriodOwnership returns the complete period
    const periodRaw = await assertPeriodOwnership(parsedPeriodId, userId, client);
    
    // Normalize period for frontend
    const periodForFrontend = normalizePeriodFromDB(periodRaw);

    return res.status(200).json({
      success: true,
      data: periodForFrontend
    });

  } catch (error){
    console.error("Error en getPeriod:", error);

    if (error.code === "PERIOD_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: "Error interno del servidor."
    });
  }  finally {
    if (client) {
      client.release();
    }
  }
}

export const deletePeriod = async (req, res) => {
    
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Usuario no autenticado"
    });
  }

  const { periodId } = req.params;

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
    
    // Verify period ownership
    await assertPeriodOwnership(parsedPeriodId, userId, client);

    // Delete period from DB
    await deletePeriodDB(parsedPeriodId, client);

    // Period succesfully deleted
    return res.status(200).json({
      success: true,
      message: "Periodo eliminado correctamente."
    });

  } catch (error) {
    console.error("Error en deletePeriod:", error);

    if (error.code === "PERIOD_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: error.message
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

    // Normalize and validate subject
    const normalizedSubject = normalizeAndValidateSubject(subjectData, period);

    //Insert subject on DB
    const createdSubject  = await insertSubject(parsedPeriodId, normalizedSubject, client);

    let createdClasses = [];

    // It there are classes
    if(classes.length > 0){
      // Normalize and validate classes
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
    const classes = await readClassesByPeriod(client, parsedPeriodId);

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