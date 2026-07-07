import { pool } from "../../config/db.js"
import { assertSubjectOwnership } from "../../services/subjectServices.js";

const VALID_TYPES  = ["theory", "laboratory", "workshop"];
const VALID_MODES  = ["onsite", "online"];
const TIME_REGEX  = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const createClasses= async (req, res) => {

  const { classes } = req.body;
  const {subjectId} = req.params;
  const userId = req.user.id;
  let transactionStarted = false;

  // Validate subjectId
  const parsedSubjectId = Number(subjectId);

  if (!Number.isInteger(parsedSubjectId) || parsedSubjectId <= 0) {
    return res.status(400).json({
      success: false,
      message: "El ID de la materia no es válido."
    });
  }

  // Validate that classes are an array with at least one element
  if (!Array.isArray(classes) || classes.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Debe enviar al menos una clase."
    });
  }

  let client

  try{

    client = await pool.connect();

    // Verifiy subject ownerShip
    await assertSubjectOwnership(parsedSubjectId, userId, client);

    const normalizedClasses = classes.map(normalizeClass);

    //Validate each normalized class
    for (const classItem of normalizedClasses) {
      const {
        days,
        type,
        mode,
        classroom,
        startTime,
        endTime,
      } = classItem;

      // Days validation
      if (!Array.isArray(days)) {
        return res.status(400).json({
          success: false,
          message: "Los días deben estar dentro de un arreglo."
        });
      }

      // Validations
      if (
        !days?.length ||
        !type ||
        !mode ||
        !startTime ||
        !endTime
      ) {
        return res.status(400).json({
          success: false,
          message: "Todos los campos son obligatorios, excepto el aula."
        });
      }

      const hasInvalidDay = days.some(
        day => !Number.isInteger(day) || day < 1 || day > 7
      );

      if (hasInvalidDay) {
        return res.status(400).json({
          success: false,
          message: "Los días deben ser números enteros del 1 al 7."
        });
      }

      const uniqueDays = new Set(days);

      if (uniqueDays.size !== days.length) {
        return res.status(400).json({
          success: false,
          message: "No se pueden repetir días."
        });
      }

      // Type validation
      if (!VALID_TYPES.includes(type)) {
        return res.status(400).json({
          success: false,
          message: "Las clases solo pueden ser de tipo 'theory', 'laboratory' o 'workshop'."
        });
      }

      // Mode validation
      if (!VALID_MODES.includes(mode)) {
        return res.status(400).json({
          success: false,
          message: "Las modalidades solo pueden ser 'onsite' o 'online'."
        });
      }

      // Classroom validation
      if (classroom && classroom.length > 10) {
        return res.status(400).json({
          success: false,
          message: "El salón no puede tener más de 10 caracteres."
        });
      }

      // Validate time formats
      if (!TIME_REGEX.test(startTime)) {
        return res.status(400).json({
          success: false,
          message: "La hora de inicio debe tener el formato HH:mm."
        });
      }

      if (!TIME_REGEX.test(endTime)) {
        return res.status(400).json({
          success: false,
          message: "La hora de término debe tener el formato HH:mm."
        });
      }

      if (endTime <= startTime) {
        return res.status(400).json({
          success: false,
          message: "La hora de término debe ser posterior a la hora de inicio."
        });
      }
    }

    // En el futuro acá estará el algoritmo de detección de choques (primero en local y luego en la base de datos).

    await client.query("BEGIN");
    transactionStarted = true;

    //Array of inserted classes
    const insertedClasses = [];

    // Insert classes on DB
    for (const classItem of normalizedClasses) {
      const {
        days,
        type,
        mode,
        classroom,
        startTime,
        endTime,
      } = classItem;

      const result = await client.query(
        `INSERT INTO classes
        (subject_id, days, start_time, end_time, mode, classroom, type)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [parsedSubjectId, days, startTime, endTime, mode, classroom, type]
      );

      insertedClasses.push(result.rows[0]);
    }

    await client.query("COMMIT");
    transactionStarted = false;

    return res.status(201).json({
      success: true,
      message: "Clases creadas correctamente.",
      classes: insertedClasses
    });

  } catch (error) {
    console.error(error);

    if (client && transactionStarted) {
      await client.query("ROLLBACK");
    }

    if (error.code === 'SUBJECT_ACCESS_DENIED') {
      return res.status(403).json({
        success: false,
        message: "No tienes acceso a esta materia."
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

const normalizeClass = (classItem) => ({
  days: classItem.days,
  type: classItem.type?.trim(),
  mode: classItem.mode?.trim(),
  classroom: classItem.classroom?.trim() || null,
  startTime: classItem.startTime?.trim(),
  endTime: classItem.endTime?.trim(),
});