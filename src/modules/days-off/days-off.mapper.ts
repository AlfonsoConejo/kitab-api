import { toDateOnly } from '../../shared/utils/date.js';
import type { DayOffDto, DayOffRow } from './days-off.types.js';

// Transforma una fila de days_off al formato público de la API.
export const toDayOffDto = (dayOff: DayOffRow): DayOffDto => ({
  id: dayOff.id,
  periodId: dayOff.period_id,
  name: dayOff.name?.trim() || null,
  startDate: toDateOnly(dayOff.start_date),
  endDate: toDateOnly(dayOff.end_date),
  notes: dayOff.notes?.trim() || null,
  createdAt: dayOff.created_at,
  updatedAt: dayOff.updated_at,
});
