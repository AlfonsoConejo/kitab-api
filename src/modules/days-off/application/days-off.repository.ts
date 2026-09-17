import type { CreateDayOffInput } from '../days-off.schemas.js';
import type { DayOffRow, PeriodDateRangeRow } from '../days-off.types.js';

/** Contract required by days-off use cases to access persisted data. */
export interface DaysOffRepository {
  getOwnedPeriod(periodId: number, userId: number): Promise<PeriodDateRangeRow>;
  listByPeriod(periodId: number): Promise<DayOffRow[]>;
  getByIdAndPeriod(dayOffId: number, periodId: number): Promise<DayOffRow>;
  create(periodId: number, input: CreateDayOffInput): Promise<DayOffRow>;
  updateByIdAndPeriod(
    dayOffId: number,
    periodId: number,
    input: CreateDayOffInput,
  ): Promise<DayOffRow>;
  deleteByIdAndPeriod(dayOffId: number, periodId: number): Promise<void>;
}
