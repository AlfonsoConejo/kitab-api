import type { PeriodDto, PeriodRow } from './periods.types.js';
import type { PeriodInput } from './periods.schemas.js';
import { toDateOnly } from '../../shared/utils/date.js';

export { toClassDto, toSubjectDto, toSubjectRecord } from '../subjects/subjects.mapper.js';

// Transforma una fila de academic_periods en el DTO público de un período.
export const toPeriodDto = (period: PeriodRow): PeriodDto => ({
  id: period.id,
  name: period.name.trim(),
  startDate: toDateOnly(period.start_date),
  endDate: toDateOnly(period.end_date),
  color: period.color || '#EF4444',
  userId: period.user_id,
  createdAt: period.created_at,
});

// Convierte un período validado al formato snake_case que espera la base de datos.
export const toPeriodRecord = (input: PeriodInput) => ({
  name: input.name,
  start_date: input.startDate,
  end_date: input.endDate,
  color: input.color,
});
