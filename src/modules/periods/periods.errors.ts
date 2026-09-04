export class PeriodNotFoundError extends Error {
  readonly code = 'PERIOD_NOT_FOUND';
  readonly status = 404;

  constructor(message = 'El periodo no existe o no te pertenece.') {
    super(message);
    this.name = 'PeriodNotFoundError';
  }
}
