export const assertSubjectOwnership = async (subjectId, userId, client) => {
  const { rowCount } = await client.query(
    `
    SELECT 1
    FROM subjects s
    JOIN periods p ON s.period_id = p.id
    WHERE s.id = $1 AND p.user_id = $2
    `,
    [subjectId, userId]
  );

  if (rowCount === 0) {
    const error = new Error("SUBJECT_ACCESS_DENIED");
    error.code = "SUBJECT_ACCESS_DENIED";
    error.status = 403;
    throw error;
  }

  return true;
};