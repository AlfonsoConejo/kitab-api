import { assertSubjectOwnership } from "../../services/subjectServices.js";
import { normalizeClass, normalizeAndValidateClasses } from "../../validators.js/classValidator.js";
import { insertClasses } from "../../services/classService.js";

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

  let client

  try{

    // Verifiy subject ownerShip
    await assertSubjectOwnership(parsedSubjectId, userId, client);

    // Normalize data and validate each class
    const normalizedClasses = normalizeAndValidateClasses(classes);

    // En el futuro acá estará el algoritmo de detección de choques (primero en local y luego en la base de datos).

    await client.query("BEGIN");
    transactionStarted = true;


    // Insert classes on DB
    const insertedClasses = await insertClasses(
      client,
      parsedSubjectId,
      normalizedClasses
    );

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

    if (error.status === 400) {
      return res.status(400).json({
        success: false,
        message: error.message,
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