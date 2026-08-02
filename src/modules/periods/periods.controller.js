import { pool } from "../../config/db.js"
import { assertPeriodOwnership, insertPeriod, readPeriodsByUser, deletePeriodDB, updatePeriodDB } from "../../services/period.service.js";
import { normalizeAndValidatePeriod, normalizePeriodFromDB, normalizePeriodsFromDB } from "../../validators/period.validator.js";
import { normalizeAndValidateSubject, normalizeSubjectToDB, normalizeSubjectFromDB, normalizeSubjectsFromDB} from "../../validators/subject.validator.js";
import { insertSubject, assertSubjectOwnership, readSubjectsByPeriod } from "../../services/subject.service.js";
import { normalizeAndValidateClasses, normalizeClassesFromDB } from "../../validators/class.validator.js";
import { insertClasses, readClassesByPeriod } from "../../services/class.service.js";

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
    console.error("Error on createPeriod: ", error);

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
    const periodsForFrontend = normalizePeriodsFromDB(periodsRaw);

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
  // Verify user authentication
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
  // Verify user authentication
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
  // Verify authentication
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

  // Validate that at least one field is sent
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({
      success: false,
      message: "Debes enviar al menos un campo para actualizar."
    });
  }

  let client;

  try {
    client = await pool.connect();

    // Verify period ownership
    await assertPeriodOwnership(parsedPeriodId, userId, client);

    // Normalize and validate period
    const normalizedPeriod = normalizeAndValidatePeriod(req.body);

    // Execute update
    const updatedPeriod = await updatePeriodDB(
      parsedPeriodId,
      normalizedPeriod,
      client
    );

    // If updatePeriodDB returns null (nothing was updated)
    if (!updatedPeriod) {
      return res.status(404).json({
        success: false,
        message: "El periodo no existe o no te pertenece."
      });
    }

    const periodForFrontend = normalizePeriodFromDB(updatedPeriod);

    return res.status(200).json({
      success: true,
      message: "Periodo actualizado correctamente.",
      data: periodForFrontend,
    });

  } catch (error) {
    console.error("Error en updatePeriod:", error);

    if (error.code === "PERIOD_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

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

export const getSubjectsByPeriod = async (req, res) => {

  // Verify authentication
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
    
    await assertPeriodOwnership(parsedPeriodId, userId, client);

    const subjects = await readSubjectsByPeriod(parsedPeriodId, client);

    const subjectsForFrontend = normalizeSubjectsFromDB(subjects);

    return res.status(200).json({
      success: true,
      data: subjectsForFrontend
    });

  } catch (error) {
    console.error("Error en getSubjectsByPeriod:", error);

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

export const getClassesByPeriod = async (req, res) => {
  // Verify authentication
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

    await assertPeriodOwnership(parsedPeriodId, userId, client);

    // Get all classes from the period
    const classes = await readClassesByPeriod(parsedPeriodId, client);

    // Normalize data for frontend
    const classesForFrontend = normalizeClassesFromDB(classes);

    return res.status(200).json({
      success: true,
      data: classesForFrontend
    });
  } catch (error) {
    console.error("Error en getClassesByPeriod:", error);

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
}

export const createSubject = async (req, res) => {
  // Verify authentication
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

  const {
    classes = [],
    ...subjectData
  } = req.body;

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

    // Insert subject on DB
    const createdSubject  = await insertSubject(parsedPeriodId, normalizedSubject, client);

    // Normalize subject for frontend
    const subjectForFrontend = normalizeSubjectFromDB(createdSubject);

    let classesForFrontend;

    // It there are classes
    if(classes.length > 0){
      // Normalize and validate classes
      const normalizedClasses = normalizeAndValidateClasses(classes);

      // Normalize subject for frontend
      classesForFrontend = normalizeClassesFromDB(normalizedClasses);

      // Insert classes on DB
      await insertClasses(
        client,
        createdSubject.id,
        normalizedClasses
      );
    }

    await client.query("COMMIT");
    transactionStarted = false;

    return res.status(201).json({
      success: true,
      message: "Materia creada correctamente.",
      subject: subjectForFrontend,
      classes: classesForFrontend
    });

  } catch (error) {
    console.error(error);

    if (client && transactionStarted) {
      await client.query("ROLLBACK");
    }

    if (error.code === "PERIOD_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    // Validation error
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: error.message
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
      message: "Error interno del servidor."
    });
  } finally {
    if (client) {
      client.release();
    }
  }
}