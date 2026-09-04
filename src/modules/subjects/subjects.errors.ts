import { NotFoundError } from '../../shared/http/app-error.js';

export class SubjectNotFoundError extends NotFoundError {
  constructor(message = 'La materia no existe o no te pertenece.') {
    super(message, 'SUBJECT_NOT_FOUND');
    this.name = 'SubjectNotFoundError';
  }
}

export class ClassNotFoundError extends NotFoundError {
  constructor(message = 'Una o más clases no pertenecen a la materia.') {
    super(message, 'CLASS_NOT_FOUND');
    this.name = 'ClassNotFoundError';
  }
}

export class PeriodNotFoundError extends NotFoundError {
  constructor(message = 'El periodo no existe o no te pertenece.') {
    super(message, 'PERIOD_NOT_FOUND');
    this.name = 'PeriodNotFoundError';
  }
}
