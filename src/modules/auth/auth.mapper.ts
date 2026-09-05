import type { RegisterInput } from './auth.schemas.js';
import type { UserDto, UserRow } from './auth.types.js';

// Transforma una fila de users en el formato público de la API.
export const toUserDto = (user: UserRow): UserDto => ({
  id: user.id,
  firstName: user.first_name.trim(),
  lastName: user.last_name.trim(),
  email: user.email.trim().toLowerCase(),
  fullName: `${user.first_name.trim()} ${user.last_name.trim()}`,
  createdAt: user.created_at,
  updatedAt: user.updated_at,
});

// Convierte los datos validados de registro al formato de columnas de la base de datos.
export const toUserRecord = (input: RegisterInput, passwordHash: string) => ({
  first_name: input.firstName,
  last_name: input.lastName,
  email: input.email,
  password_hash: passwordHash,
});
