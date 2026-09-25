import type { Pool, PoolClient } from 'pg';
import type { ClassRow } from '../../subjects/subjects.types.js';
import type { PeriodInput } from '../periods.schemas.js';
import type { CalendarClassRow, PeriodRow } from '../periods.types.js';

/** Contract required by the periods use cases to access persisted period data. */
export interface PeriodsRepository {
  readonly database: Pool;

  createPeriod(input: PeriodInput, userId: number): Promise<PeriodRow>;
  listPeriods(userId: number): Promise<PeriodRow[]>;
  getOwnedPeriod(
    periodId: number,
    userId: number,
    client?: Pool | PoolClient,
  ): Promise<PeriodRow>;
  updatePeriod(periodId: number, input: PeriodInput): Promise<PeriodRow | null>;
  deletePeriod(periodId: number): Promise<void>;
  listClasses(periodId: number): Promise<ClassRow[]>;
  listCalendarClasses(periodId: number): Promise<CalendarClassRow[]>;
}
