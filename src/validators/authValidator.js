const throwValidationError = (message) => {
  const error = new Error(message);
  error.status = 400;
  error.name = 'ValidationError';
  throw error;
};

export const validateUser = (user) => {
    let { firstName, lastName, email, password } = user;

    firstName = firstName?.trim();
    lastName = lastName?.trim();
    email = email?.trim().toLowerCase();

    // Validations
		if (!firstName?.trim()) {
			throwValidationError("El nombre es obligatorio.");
		}

		if (!lastName?.trim()) {
			throwValidationError("El apellido es obligatorio.");
		}

		if (!email?.trim()) {
			throwValidationError("El correo electrónico es obligatorio.");
		}

		if (!password?.trim()) {
			throwValidationError("La contraseña es obligatoria.");
		}

    if (lastName.length < 2) {
      throwValidationError("El apellido debe contener al menos 2 caracteres.");
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      throwValidationError("El correo electrónico es inválido.");
    }

    if (password.length < 6) {
      throwValidationError("La contraseña debe contener al menos 6 caracteres.");
    }

		// Return clean data
		return { firstName, lastName, email, password };
};

export const normalizeAndValidateUser = (user) => {
	// Verify if data exists
  if (!user) {
    throwValidationError("Los datos del usuario son requeridos.");
  }

	// Normalize from frontend to BD format
	const normalized = normalizeUserToDB(user);
	
	// Validate
	const validated = validateUser(normalized);
		
	return validated;
}

export function normalizeUserToDB(frontData, forUpdate = false) {
  if (!frontData) return null;

  const result = {
    first_name: frontData.firstName?.trim() || '',
    last_name: frontData.lastName?.trim() || '',
    email: frontData.email?.trim().toLowerCase() || '',
    password_hash: frontData.password || null,
  };

  // Para UPDATE, eliminar campos undefined
  if (forUpdate) {
    Object.keys(result).forEach(key => {
      if (result[key] === undefined) delete result[key];
    });
  }

  return result;
}

export function normalizeUserFromDB(dbUser) {
  if (!dbUser) return null;

  return {
    id: dbUser.id,
    firstName: dbUser.first_name?.trim() || '',
    lastName: dbUser.last_name?.trim() || '',
    email: dbUser.email?.trim().toLowerCase() || '',
    fullName: `${dbUser.first_name?.trim() || ''} ${dbUser.last_name?.trim() || ''}`.trim(),
    createdAt: dbUser.created_at || null,
    updatedAt: dbUser.updated_at || null,
  };
}

export function normalizeUsersFromDB(dbUsers) {
  if (!Array.isArray(dbUsers)) return [];
  return dbUsers.map(normalizeUserFromDB);
}