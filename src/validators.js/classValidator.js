const VALID_TYPES  = ["theory", "laboratory", "workshop"];
const VALID_MODES  = ["onsite", "online"];
const TIME_REGEX  = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const normalizeAndValidateClasses = (classes) => {

  const normalized = classes.map(normalizeClass);

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
      startTime,
      endTime,
    } = classItem;

    if (!Array.isArray(days)) {
      throwValidationError("Los días deben estar dentro de un arreglo.");
    }

    if (
      !days.length ||
      !type ||
      !mode ||
      !startTime ||
      !endTime
    ) {
      throwValidationError("Todos los campos son obligatorios, excepto el aula.");
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

    if (classroom && classroom.length > 10) {
      throwValidationError("El salón no puede tener más de 10 caracteres.");
    }

    if (!TIME_REGEX.test(startTime)) {
      throwValidationError("La hora de inicio debe tener el formato HH:mm.");
    }

    if (!TIME_REGEX.test(endTime)) {
      throwValidationError("La hora de término debe tener el formato HH:mm.");
    }

    if (endTime <= startTime) {
      throwValidationError("La hora de término debe ser posterior a la hora de inicio.");
    }
  }
}

const throwValidationError = (message) => {
  const error = new Error(message);
  error.status = 400;
  throw error;
};

export const normalizeClass = (classItem) => ({
  days: classItem.days,
  type: classItem.type?.trim(),
  mode: classItem.mode?.trim(),
  classroom: classItem.classroom?.trim() || null,
  startTime: classItem.startTime?.trim(),
  endTime: classItem.endTime?.trim(),
});