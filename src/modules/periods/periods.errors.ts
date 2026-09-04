import { NotFoundError } from '../../shared/http/app-error.js';

export class PeriodNotFoundError extends NotFoundError {
  constructor(message = 'El periodo no existe o no te pertenece.') {
    super(message, 'PERIOD_NOT_FOUND');
    this.name = 'PeriodNotFoundError';
  }
}
