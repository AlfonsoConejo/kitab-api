import { pool } from "../../config/db.js"
import { readClassesBySubject } from "../../services/classService.js";
import { assertSubjectOwnership, deleteSubject as deleteSubjectService, readSubject } from "../../services/subjectServices.js";

export const deleteSubject = async (req, res) => {
  const userId = req.user.id;
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
		await deleteSubjectService(parsedSubjectId, client)

		// Subject deleted successfully
    return res.status(200).json({
      success: true,
      message: "Materia eliminada correctamente."
    });
	} catch (error) {
		console.error("Error al eliminar la materia:", error);

		if (error.status === 404 && error.code === "SUBJECT_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "La materia no fue encontrada."
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

  const userId = req.user.id;
  const {subjectId} = req.params;

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
    client = await pool.connect();

    // Verify subject ownership
    await assertSubjectOwnership(parsedSubjectId, userId, client);

    // Get requested subject and its classes
    const [subject, classes] = await Promise.all([
      readSubject(parsedSubjectId, client),
      readClassesBySubject(parsedSubjectId, client),
    ]);

    // Subject retrieved successfully
    return res.status(200).json({
      success: true,
      data: {
        ...subject,
        classes,
      },
    });
  } catch (error) {
    console.error("Error al obtener la materia y sus clases:", error);

		if (error.code === "SUBJECT_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "La materia no fue encontrada."
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