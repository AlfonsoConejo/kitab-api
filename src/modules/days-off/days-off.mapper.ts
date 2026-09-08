import { toDateOnly } from '../../shared/utils/date.js';
import type { CreateDayOffInput } from './days-off.schemas.js';
import type { DayOffDto, DayOffRow } from './days-off.types.js';

// Transforma una fila de days_off al formato público de la API.
export const toDayOffDto = (dayOff: DayOffRow): DayOffDto => ({
  id: dayOff.id,
  periodId: dayOff.period_id,
  name: dayOff.name.trim(),
  startDate: toDateOnly(dayOff.start_date),
  endDate: toDateOnly(dayOff.end_date),
  notes: dayOff.notes?.trim() || null,
  createdAt: dayOff.created_at,
  updatedAt: dayOff.updated_at,
});

// Convierte un día libre validado al formato snake_case de PostgreSQL.
export const toDayOffRecord = (input: CreateDayOffInput) => ({
  name: input.name,
  start_date: input.startDate,
  end_date: input.endDate,
  notes: input.notes,
});
