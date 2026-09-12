import type { Pool, PoolClient } from 'pg';
import type { ClassRow, SubjectRow } from '../../subjects/subjects.types.js';
import type { CreateSubjectInput, PeriodInput } from '../periods.schemas.js';
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
  listSubjects(periodId: number): Promise<SubjectRow[]>;
  listClasses(periodId: number): Promise<ClassRow[]>;
  listCalendarClasses(periodId: number): Promise<CalendarClassRow[]>;
  createSubject(
    periodId: number,
    input: CreateSubjectInput,
    client: PoolClient,
  ): Promise<SubjectRow>;
  createClasses(
    subjectId: number,
    classes: CreateSubjectInput['classes'],
    client: PoolClient,
  ): Promise<void>;
}
