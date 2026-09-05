import { ConflictError, ForbiddenError, NotFoundError, UnauthorizedError } from '../../shared/http/app-error.js';

export class UserAlreadyExistsError extends ConflictError {
  constructor() {
    super('El usuario ya existe', 'USER_ALREADY_EXISTS');
    this.name = 'UserAlreadyExistsError';
  }
}

export class InvalidCredentialsError extends UnauthorizedError {
  constructor() {
    super('Usuario o contraseña incorrectos', 'INVALID_CREDENTIALS');
    this.name = 'InvalidCredentialsError';
  }
}

export class UserNotFoundError extends NotFoundError {
  constructor() {
    super('Usuario no encontrado', 'USER_NOT_FOUND');
    this.name = 'UserNotFoundError';
  }
}

export class RefreshTokenError extends UnauthorizedError {
  constructor(message: string, code: string) {
    super(message, code);
    this.name = 'RefreshTokenError';
  }
}

export class LogoutForbiddenError extends ForbiddenError {
  constructor(message: string) {
    super(message, 'LOGOUT_FORBIDDEN');
    this.name = 'LogoutForbiddenError';
  }
}
