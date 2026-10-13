import type { Pool, PoolClient } from 'pg';
import type { ClassInput, CreateSubjectInput, SubjectUpdateInput } from '../subjects.schemas.js';
import type { ClassRow, SubjectRow } from '../subjects.types.js';

type DatabaseClient = Pool | PoolClient;

/** Contract required by subject use cases to access persisted subjects and classes. */
export interface SubjectsRepository {
  readonly database: Pool;

  getOwnedSubject(
    subjectId: number,
    userId: number,
    client?: DatabaseClient,
  ): Promise<SubjectRow>;
  ensureOwnedPeriod(
    periodId: number,
    userId: number,
    client?: DatabaseClient,
  ): Promise<{ start_date: string | Date; end_date: string | Date }>;
  listSubjectsByPeriod(periodId: number): Promise<SubjectRow[]>;
  listClassesBySubject(subjectId: number): Promise<ClassRow[]>;
  listClassesByPeriod(periodId: number): Promise<ClassRow[]>;
  listClassesByPeriodExcludingSubject(
    periodId: number,
    subjectId: number | null,
  ): Promise<ClassRow[]>;
  createSubject(
    periodId: number,
    input: CreateSubjectInput,
    client: PoolClient,
  ): Promise<SubjectRow>;
  createClasses(
    subjectId: number,
    classes: ClassInput[],
    client: PoolClient,
  ): Promise<ClassRow[]>;
  updateSubject(
    subjectId: number,
    input: SubjectUpdateInput,
    client: PoolClient,
  ): Promise<SubjectRow>;
  ensureClassesOwnership(
    classIds: number[],
    subjectId: number,
    client: PoolClient,
  ): Promise<void>;
  updateClasses(
    classes: Array<ClassInput & { id: number }>,
    client: PoolClient,
  ): Promise<ClassRow[]>;
  deleteClasses(classIds: number[], client: PoolClient): Promise<number[]>;
  deleteSubject(subjectId: number): Promise<void>;
}
