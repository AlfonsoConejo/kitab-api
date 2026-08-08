import { pool } from "../config/db.js";

export const assertClassesOwnership = async (classIds, subjectId, client = pool) => {
  const db = client || pool;

  if (!Array.isArray(classIds) || classIds.length === 0) {
    return;
  }

 const result = await db.query(
    `
    SELECT id
    FROM classes
    WHERE id = ANY($1)
      AND subject_id = $2
    `,
    [classIds, subjectId]
  );

  if (result.rowCount !== classIds.length) {
    const error = new Error("Una o más clases no pertenecen a la materia.");
    error.code = "CLASS_NOT_FOUND";
    error.status = 404;
    error.name = "NotFoundError";
    throw error;
  }

  return;
};

export const insertClasses = async ( client = pool, subjectId, normalizedClasses ) => {
  const db = client || pool;
  const insertedClasses = [];

  for (const classItem of normalizedClasses) {
    // Desestructurar en snake_case
    const {
      days,
      type,
      mode,
      classroom,
      start_time,
      end_time,
    } = classItem;

    const result = await db.query(
      `INSERT INTO classes
      (subject_id, days, start_time, end_time, mode, classroom, type)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, subject_id, days, start_time, end_time, mode, classroom, type`,
      [
        subjectId,
        days,
        start_time,
        end_time,
        mode,
        classroom,
        type,
      ]
    );

    insertedClasses.push(result.rows[0]);
  }

  return insertedClasses;
};

export const updateClassesDB = async (classes, client = pool) => {
  console.log("Estas son las clases enviadas a edición: ", classes)
  const db = client || pool;
  const updatedClasses = [];

  for (const classItem of classes) {
    const {
      id,
      days,
      start_time,
      end_time,
      mode,
      classroom,
      type
    } = classItem;

    const result = await db.query(
      `
      UPDATE classes
      SET days = $1,
          start_time = $2,
          end_time = $3,
          mode = $4,
          classroom = $5,
          type = $6
      WHERE id = $7
      RETURNING id, subject_id, days, start_time, end_time, mode, classroom, type
      `,
      [ days, start_time, end_time, mode, classroom, type, id ]
    );

    if (result.rowCount === 0) {
      const error = new Error("La clase a actualizar no existe.");
      error.code = "CLASS_NOT_FOUND";
      error.status = 404;
      error.name = "NotFoundError";
      throw error;
    }

    updatedClasses.push(result.rows[0]);
  }

  return updatedClasses;
}

export const readClassesByPeriod = async (periodId, client = pool) => {
  const db = client || pool;
  const result = await db.query(
    `
    SELECT
      c.id,
      c.subject_id,
      s.name AS subject_name,
      c.days,
      c.start_time,
      c.end_time,
      c.mode,
      c.classroom,
      c.type
    FROM classes c
    JOIN subjects s ON c.subject_id = s.id
    JOIN academic_periods p ON s.period_id = p.id
    WHERE p.id = $1
    ORDER BY s.name, c.start_time ASC  -- ← Ordenar por materia y hora
    `,
    [periodId]
  );

  return result.rows;
};

export const readClassesBySubject = async (subjectId, client = pool) => {
  const db = client || pool;
  const result = await db.query(
    `
    SELECT
      id,
      subject_id,
      days,
      start_time,
      end_time,
      mode,
      classroom,
      type
    FROM classes
    WHERE subject_id = $1
    ORDER BY start_time ASC
    `,
    [subjectId]
  );

  return result.rows;
};

export const deleteClassesDB = async ( deletedClassIds, client = pool ) => {
  const db = client || pool;

  const result = await db.query(
    `
    DELETE FROM classes
    WHERE id = ANY($1)
    RETURNING id;
    `,
    [deletedClassIds]
  );

  
  return result.rows.map(row => row.id);
};