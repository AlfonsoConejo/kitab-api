const VALID_TYPES  = ["theory", "laboratory", "workshop"];
const VALID_MODES  = ["onsite", "online"];
const TIME_REGEX  = /^([01]\d|2[0-3]):([0-5]\d)$/;

const throwValidationError = (message) => {
  const error = new Error(message);
  error.status = 400;
  error.name = 'ValidationError';
  throw error;
};

export const normalizeAndValidateClasses = (classes) => {

  const normalized = classes.map(normalizeClassToDB);
  
  validateClasses(normalized);

  return normalized;
}

export const validateClasses = (classes) => {
  
  for (const classItem of classes) {
    const {
      days,
      type,
      mode,
      classroom,
      start_time,
      end_time,
    } = classItem;

    if (!Array.isArray(days)) {
      throwValidationError("Los días deben estar dentro de un arreglo.");
    }

    if(!days.length) {
      throwValidationError("Las clases deben ocurrir al menos un día.");
    }

    if(!type) {
      throwValidationError("El tipo de clase es obligatorio.");
    }

    if(!mode) {
      throwValidationError("La modalidades de las clases es obligatoria.");
    }

    if (!start_time) {
      throwValidationError("La hora de inicio es obligatoria.");
    }

    if (!end_time) {
      throwValidationError("La hora de término es obligatoria.");
    }

    const hasInvalidDay = days.some(
      day => !Number.isInteger(day) || day < 1 || day > 7
    );

    if (hasInvalidDay) {
      throwValidationError("Los días deben ser números enteros del 1 al 7.");
    }

    if (new Set(days).size !== days.length) {
      throwValidationError("No se pueden repetir días.");
    }

    if (!VALID_TYPES.includes(type)) {
      throwValidationError("Las clases solo pueden ser de tipo 'theory', 'laboratory' o 'workshop'.");
    }

    if (!VALID_MODES.includes(mode)) {
      throwValidationError("Las modalidades solo pueden ser 'onsite' o 'online'.");
    }

    if (mode === "online" && classroom) {
      throwValidationError("Las clases en línea no pueden tener aula.");
    }

    if (classroom && classroom.length > 10) {
      throwValidationError("El salón no puede tener más de 10 caracteres.");
    }

    if (!TIME_REGEX.test(start_time)) {
      throwValidationError("La hora de inicio debe tener el formato HH:mm.");
    }

    if (!TIME_REGEX.test(end_time)) {
      throwValidationError("La hora de término debe tener el formato HH:mm.");
    }

    if (end_time <= start_time) {
      throwValidationError("La hora de término debe ser posterior a la hora de inicio.");
    }
  }
}

// Normalize data coming from the frontend
export function normalizeClassToDB(frontData, forUpdate = false) {
  if (!frontData) return null;

  const result = {
    id: frontData.id || null,
    subject_id: frontData.subjectId || null,
    days: frontData.days || [],
    start_time: frontData.startTime || null,
    end_time: frontData.endTime || null,
    mode: frontData.mode?.trim() || null,
    classroom: frontData.classroom?.trim() || null,
    type: frontData.type?.trim() || null
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
export function normalizeClassFromDB(dbClass) {
  if (!dbClass) return null;

  return {
    id: dbClass.id,
    subjectId: dbClass.subject_id,
    subjectName: dbClass.subject_name,
    days: dbClass.days || [],
    startTime: dbClass.start_time?.slice(0, 5) || null,
    endTime: dbClass.end_time?.slice(0, 5) || null,
    mode: dbClass.mode || null,
    classroom: dbClass.classroom || null,
    type: dbClass.type || null
  };
}

// Normalize array of classes coming from the database
export function normalizeClassesFromDB(dbClasses) {
  if (!Array.isArray(dbClasses)) return [];
  return dbClasses.map(normalizeClassFromDB);
}