import { pool } from "../../config/db.js"
import { assertClassesOwnership, readClassesBySubject, insertClasses, updateClassesDB, deleteClassesDB } from "../../services/class.service.js";
import { normalizeAndValidateClasses, normalizeClassesFromDB } from "../../validators/class.validator.js";
import { assertSubjectOwnership, deleteSubjectDB, readSubject, updateSubjectDB } from "../../services/subject.service.js";
import { normalizeAndValidateSubject, normalizeSubjectFromDB } from "../../validators/subject.validator.js";
import { assertPeriodOwnership } from "../../services/period.service.js";

// De este endpoint aún no estoy seguro de cómo se utilizará porque al momento de crear una materia, 
// se crean sus clases al mismo tiempo. Pero lo dejo por si acaso.
export const createClasses = async (req, res) => {

  const { classes } = req.body;
  
  // Validate that classes is an array and not empty
  if (!classes || !Array.isArray(classes) || classes.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Debes enviar al menos una clase."
    });
  }

  // Verify user authentication
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Usuario no autenticado"
    });
  }

  // Validate subjectId
  const {subjectId} = req.params;

  const parsedSubjectId = Number(subjectId);

  if (!Number.isInteger(parsedSubjectId) || parsedSubjectId <= 0) {
    return res.status(400).json({
      success: false,
      message: "El ID de la materia no es válido."
    });
  }

  let transactionStarted = false;
  let client;

  try{
    client = await pool.connect();

    await client.query("BEGIN");
    transactionStarted = true;

    // Verifiy subject ownership
    await assertSubjectOwnership(parsedSubjectId, userId, client);

    // Normalize data and validate each class
    const normalizedClasses = normalizeAndValidateClasses(classes);

    // En el futuro acá estará el algoritmo de detección de choques (primero en local y luego en la base de datos).

    // Insert classes on DB
    const insertedClasses = await insertClasses(
      client,
      parsedSubjectId,
      normalizedClasses
    );

    // Normalize classes for frontend
    const classesForFrontend = normalizeClassesFromDB(insertedClasses);

    await client.query("COMMIT");
    transactionStarted = false;

    return res.status(201).json({
      success: true,
      message: "Clases creadas correctamente.",
      classes: classesForFrontend
    });

  } catch (error) {
    console.error("Error en createClasses: ", error);

    if (client && transactionStarted) {
      await client.query("ROLLBACK");
    }

    if (error.code === "SUBJECT_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    if (error.name === 'ValidationError') {
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

export const updateSubject = async (req, res) => {

  console.log('Estos son los datos enviados por el front: ', req.body)
  const { classes, deletedClassIds, ...subjectData } = req.body;

  // Validate that classes is an array
  if (!Array.isArray(classes)) {
    return res.status(400).json({
      success: false,
      message: "Las clases deben estar dentro de un arreglo"
    });
  }

  // Validate that deletedClassIds is an array
  if (!Array.isArray(deletedClassIds)) {
    return res.status(400).json({
      success: false,
      message: "Las clases a eliminar deben estar dentro de un arreglo"
    });
  }

  // Verify user authentication
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Usuario no autenticado"
    });
  }

  // Validate subjectId
  const {subjectId} = req.params;

  const parsedSubjectId = Number(subjectId);

  if (!Number.isInteger(parsedSubjectId) || parsedSubjectId <= 0) {
    return res.status(400).json({
      success: false,
      message: "El ID de la materia no es válido."
    });
  }

  let transactionStarted = false;
  let client;

  try{
    client = await pool.connect();

    await client.query("BEGIN");
    transactionStarted = true;

    // Verifiy subject ownership
    const currentSubject = await assertSubjectOwnership(parsedSubjectId, userId, client);
    const { period_start_date, period_end_date } = currentSubject;

    // Create new period object
    const period = {
      start_date: period_start_date,
      end_date: period_end_date
    };

    // Normalize and validate subject 
    const normalizedSubject = normalizeAndValidateSubject(subjectData, period);

    // Update subject
    const updatedSubject = await updateSubjectDB(parsedSubjectId, normalizedSubject, client);

    const subjectForFrontend = normalizeSubjectFromDB(updatedSubject);

    let insertedClassesForFrontend = []
    let updatedClassesForFrontend = []

    if(classes.length > 0){

      const normalizedClasses = normalizeAndValidateClasses(classes);

      // Divide classes depending on if they have an id or not
      const existingClasses = normalizedClasses.filter(classItem => classItem.id);
      const newClasses = normalizedClasses.filter(classItem => !classItem.id);

      // Edit classes on DB
      if (existingClasses.length > 0) {
        //Get id of all the existing classes
        const existingClassIds = existingClasses.map(
          classItem => classItem.id
        );
        
        // Verify classes ownership
        await assertClassesOwnership(existingClassIds, parsedSubjectId, client);

        const updatedClasses = await updateClassesDB(
          existingClasses,
          client
        );

        updatedClassesForFrontend = normalizeClassesFromDB(updatedClasses);
      }

      // Insert classes into DB
      if (newClasses.length > 0) {
        const insertedClasses = await insertClasses(client, parsedSubjectId, newClasses);
          
        // Normalize classes for frontend
        insertedClassesForFrontend = normalizeClassesFromDB(insertedClasses);
      }
    }

    let deletedClasses = [];

    // If there are classes to delete
    if (deletedClassIds.length > 0) {

      // Verifiy classes ownership
      await assertClassesOwnership(
        deletedClassIds,
        parsedSubjectId,
        client
      );

      // Delete classes
      deletedClasses = await deleteClassesDB(
        deletedClassIds,
        client
      );
    }

    await client.query("COMMIT");
    transactionStarted = false;

    return res.status(200).json({
      success: true,
      message: "Materia actualizada correctamente.",
      updatedSubject: subjectForFrontend,
      insertedClasses: insertedClassesForFrontend,
      updatedClasses: updatedClassesForFrontend,
      deletedClasses: deletedClasses
    });
  } catch (error) {
    console.error("Error en updateSubject: ", error);

    if (client && transactionStarted) {
      await client.query("ROLLBACK");
    }

    if (error.code === "SUBJECT_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    if (error.code === "CLASS_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    if (error.name === 'ValidationError') {
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

export const deleteSubject = async (req, res) => {
  // Verify user authentication
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Usuario no autenticado"
    });
  }

  const { subjectId } = req.params;

  const parsedSubjectId = Number(subjectId);

  // Validate subject id
  if (!Number.isInteger(parsedSubjectId) || parsedSubjectId <= 0) {
    return res.status(400).json({
      success: false,
      message: "El ID de la materia no es válido."
    });
  }

	let client;

	try{
		client = await pool.connect();

		// Verify that the subject belongs to the user
		 await assertSubjectOwnership(parsedSubjectId, userId, client)

		// Delete subject
		await deleteSubjectDB(parsedSubjectId, client)

		// Subject deleted successfully
    return res.status(200).json({
      success: true,
      message: "Materia eliminada correctamente."
    });
	} catch (error) {
		console.error("Error en deleteSubject:", error);

    if (error.code === "SUBJECT_NOT_FOUND") {
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

export const getSubjectWithClasses = async (req, res) => {
  // Verify user authentication
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Usuario no autenticado"
    });
  }

  // Validate subjectId
  const {subjectId} = req.params;

  const parsedSubjectId = Number(subjectId);

  if (!Number.isInteger(parsedSubjectId) || parsedSubjectId <= 0) {
    return res.status(400).json({
      success: false,
      message: "El ID de la materia no es válido."
    });
  }

  let client;

  try{
    client = await pool.connect();

    // Verify subject ownership
    await assertSubjectOwnership(parsedSubjectId, userId, client);

    // Get requested subject and its classes
    const [subject, classes] = await Promise.all([
      readSubject(parsedSubjectId, client),
      readClassesBySubject(parsedSubjectId, client),
    ]);

    // Normalize subject for frontend
    const subjectForFrontend = normalizeSubjectFromDB(subject);

    // Normalize classes for frontend
    const classesForFrontend = normalizeClassesFromDB(classes);

    // Subject retrieved successfully
    return res.status(200).json({
      success: true,
      data: {
        ...subjectForFrontend,
        classes: classesForFrontend,
      },
    });
  } catch (error) {
    console.error("Error en getSubjectWithClasses: ", error);

		if (error.code === "SUBJECT_NOT_FOUND") {
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