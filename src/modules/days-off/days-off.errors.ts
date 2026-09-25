import { NotFoundError } from '../../shared/http/app-error.js';

export class DayOffPeriodNotFoundError extends NotFoundError {
  constructor() {
    super('El período no existe o no te pertenece.', 'DAY_OFF_PERIOD_NOT_FOUND');
    this.name = 'DayOffPeriodNotFoundError';
  }
}

export class DayOffNotFoundError extends NotFoundError {
  constructor() {
    super('El descanso no existe o no te pertenece.', 'DAY_OFF_NOT_FOUND');
    this.name = 'DayOffNotFoundError';
  }
}
