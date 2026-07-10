import { normalizeClass } from "../validators.js/classValidator.js";

export const insertClasses = async (
  client,
  subjectId,
  normalizedClasses
) => {

  const insertedClasses = [];

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
      RETURNING id, subject_id, days, start_time, end_time, mode, classroom, type`,
      [
        subjectId,
        days,
        startTime,
        endTime,
        mode,
        classroom,
        type,
      ]
    );

    insertedClasses.push(normalizeClass(result.rows[0]));
  }

  return insertedClasses;
};