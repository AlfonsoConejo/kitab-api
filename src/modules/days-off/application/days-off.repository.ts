import type { CreateDayOffInput } from '../days-off.schemas.js';
import type { DayOffRow, OwnedDayOffRow, PeriodDateRangeRow } from '../days-off.types.js';

/** Contract required by days-off use cases to access persisted data. */
export interface DaysOffRepository {
  getOwnedPeriod(periodId: number, userId: number): Promise<PeriodDateRangeRow>;
  listByPeriod(periodId: number): Promise<DayOffRow[]>;
  getOwnedDayOff(dayOffId: number, userId: number): Promise<OwnedDayOffRow>;
  create(periodId: number, input: CreateDayOffInput): Promise<DayOffRow>;
  updateById(
    dayOffId: number,
    input: CreateDayOffInput,
  ): Promise<DayOffRow>;
  deleteById(dayOffId: number): Promise<void>;
}
