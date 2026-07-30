const throwValidationError = (message) => {
  const error = new Error(message);
  error.status = 400;
  error.name = 'ValidationError';
  throw error;
};

export const validatePeriod = (period) => {
  const { name, start_date, end_date, color } = period;

  // Validations
  if (!name?.trim()) {
    throwValidationError("El nombre del periodo es obligatorio.");
  }

  if (!start_date) {
    throwValidationError("La fecha de inicio es obligatoria.");
  }

  if (!end_date) {
    throwValidationError("La fecha de finalización es obligatoria.");
  }

  if (!color) {
    throwValidationError("El color es obligatorio.");
  }

  const cleanName = name.trim();
  if (cleanName.length > 30) {
    throwValidationError("El nombre del periodo debe tener máximo 30 caracteres.");
  }

  // Compare dates
  const start = new Date(start_date);
  const end = new Date(end_date);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throwValidationError("Formato de fecha inválido.");
  }

  if (start >= end) {
    throwValidationError("La fecha de inicio debe ser anterior a la fecha de finalización.");
  }

  // Return cleanName
  return { ...period, name: cleanName };
};

export const normalizeAndValidatePeriod = (period) => {
  // Verify if data exists
  if (!period) {
    throwValidationError("Los datos del periodo son requeridos.");
  }

  // Normalize from frontend to BD format
  const normalized = normalizePeriodToDB(period);
  
  // Validate
  const validated = validatePeriod(normalized);
  
  return validated;
};

export function normalizePeriodFromDB(dbPeriod) {
  if (!dbPeriod) return null

  return {
    id: dbPeriod.id,
    name: dbPeriod.name?.trim() || '',
    startDate: dbPeriod.start_date ? new Date(dbPeriod.start_date).toISOString().slice(0, 10) : null,
    endDate: dbPeriod.end_date ? new Date(dbPeriod.end_date).toISOString().slice(0, 10) : null,
    color: dbPeriod.color || '#EF4444',
  }
}

export function normalizePeriodToDB(frontData, forUpdate = false) {
  if (!frontData) return null

  const result = {
    name: frontData.name?.trim() || '',
    start_date: frontData.startDate || null,
    end_date: frontData.endDate || null,
    color: frontData.color || '#EF4444'
  };

  // For UPDATE, delete undefined fields
  if (forUpdate) {
    Object.keys(result).forEach(key => {
      if (result[key] === undefined) delete result[key];
    });
  }

  return result;
}