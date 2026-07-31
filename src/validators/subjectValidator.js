const COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

export const normalizeAndValidateSubject = (subject, period) => {

  const normalized = normalizeSubjectInput(subject);
  
  validateSubject(normalized, period);
  
  return normalized;
}

export const validateSubject = (subject, period) => {

  const {
    name,
    teacher,
    color,
    startDate,
    endDate,
  } = subject;

  if (!name) {
    throwValidationError("El nombre es obligatorio.");
  }

  if (!color) {
    throwValidationError("El color es obligatorio.");
  }

  if (!COLOR_REGEX.test(color)) {
    throwValidationError("El color debe ser un código hexadecimal válido.");
  }

  if (name.length > 40) {
    throwValidationError("El nombre de la materia debe tener máximo 40 caracteres.");
  }

  if (teacher && teacher.length > 50) {
    throwValidationError("El nombre del profesor debe tener máximo 50 caracteres.");
  }

  if (!startDate) {
    throwValidationError("La fecha de inicio es obligatoria.");
  }

  if (!endDate) {
    throwValidationError("La fecha de término es obligatoria.");
  }

  if (Number.isNaN(startDate.getTime())) {
    throwValidationError("La fecha de inicio no es válida.");
  }
  
  if (Number.isNaN(endDate.getTime())) {
    throwValidationError("La fecha de término no es válida.");
  }
  
  if (startDate >= endDate) {
    throwValidationError("La fecha de inicio debe ser anterior a la fecha de término.");
  }

  if (startDate < period.start_date || endDate > period.end_date) {
    throwValidationError("Las fechas de la materia deben estar dentro del periodo académico.");
  }
}

const throwValidationError = (message) => {
  const error = new Error(message);
  error.status = 400;
  throw error;
};

export function normalizeSubjectToDB(frontData, forUpdate = false) {
  if (!frontData) return null;

  const result = {
    name: frontData.name?.trim() || '',
    teacher: frontData.teacher?.trim() || null,
    color: frontData.color?.trim() || '#EF4444',
    start_date: frontData.startDate || null,
    end_date: frontData.endDate || null,
    period_id: frontData.periodId || null
  };

  // Para UPDATE, eliminar campos undefined
  if (forUpdate) {
    Object.keys(result).forEach(key => {
      if (result[key] === undefined) delete result[key];
    });
  }

  return result;
}

// Normalize object coming from the DataBase
export function normalizeSubjectFromDB(dbSubject) {
  if (!dbSubject) return null;

  return {
    id: dbSubject.id,
    periodId: dbSubject.period_id,
    name: dbSubject.name?.trim() || '',
    teacher: dbSubject.teacher?.trim() || null,
    color: dbSubject.color?.trim() || '#EF4444',
    startDate: dbSubject.start_date 
      ? new Date(dbSubject.start_date).toISOString().slice(0, 10) 
      : null,
    endDate: dbSubject.end_date 
      ? new Date(dbSubject.end_date).toISOString().slice(0, 10) 
      : null,
    createdAt: dbSubject.created_at || null,
    updatedAt: dbSubject.updated_at || null
  };
}

// Normalize an array of subjects
export function normalizeSubjectsFromDB(dbSubjects) {
  if (!Array.isArray(dbSubjects)) return [];
  return dbSubjects.map(normalizeSubjectFromDB);
}