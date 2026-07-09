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

  if (Number.isNaN(start.getTime())) {
    throwValidationError("La fecha de inicio no es válida.");
  }
  
  if (Number.isNaN(end.getTime())) {
    throwValidationError("La fecha de término no es válida.");
  }
  
  if (start >= end) {
    throwValidationError("La fecha de inicio debe ser anterior a la fecha de término.");
  }

  if (start  < period.start_date || end > period.end_date) {
    throwValidationError("Las fechas de la materia deben estar dentro del periodo académico.");
  }
}

const throwValidationError = (message) => {
  const error = new Error(message);
  error.status = 400;
  throw error;
};

// Normalize object coming from the frontend.
export const normalizeSubjectInput = (subject) => ({
  name: subject.name?.trim(),
  teacher: subject.teacher?.trim() || null,
  color: subject.color?.trim(),
  startDate: new Date(subject.startDate),
  endDate: new Date(subject.endDate)
});

// Normalize object coming from the DataBase
export const normalizeSubject = (subject) => ({
  id: subject.id,
  periodId: subject.period_id,
  name: subject.name,
  teacher: subject.teacher,
  color: subject.color,
  startDate: subject.start_date.toISOString().slice(0, 10),
  endDate: subject.end_date.toISOString().slice(0, 10),
});