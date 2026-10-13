import type { Pool } from 'pg';
import { vi, type Mock } from 'vitest';
import type { SubjectsRepository } from '../application/subjects.repository.js';

/** Repository shape with Vitest mocks exposed for assertions and configuration. */
export type SubjectsRepositoryMock = {
  [Key in keyof SubjectsRepository]: SubjectsRepository[Key] extends (
    ...args: infer Args
  ) => infer Result
    ? Mock<(...args: Args) => Result>
    : SubjectsRepository[Key];
};

export type SubjectsRepositoryMockOverrides = Partial<SubjectsRepositoryMock>;

/** Creates a complete subjects repository double for unit tests. */
export function createSubjectsRepositoryMock(
  overrides: SubjectsRepositoryMockOverrides = {},
): SubjectsRepositoryMock {
  // Pool is a large runtime interface; transactional unit tests only need a
  // stable value that can be passed to the mocked withTransaction helper.
  const database = {} as Pool;

  return {
    database,
    getOwnedSubject: vi.fn<SubjectsRepository['getOwnedSubject']>(),
    ensureOwnedPeriod: vi.fn<SubjectsRepository['ensureOwnedPeriod']>(),
    listSubjectsByPeriod: vi.fn<SubjectsRepository['listSubjectsByPeriod']>(),
    listClassesBySubject: vi.fn<SubjectsRepository['listClassesBySubject']>(),
    listClassesByPeriod: vi.fn<SubjectsRepository['listClassesByPeriod']>(),
    listClassesByPeriodExcludingSubject: vi.fn<SubjectsRepository['listClassesByPeriodExcludingSubject']>(),
    createSubject: vi.fn<SubjectsRepository['createSubject']>(),
    createClasses: vi.fn<SubjectsRepository['createClasses']>(),
    updateSubject: vi.fn<SubjectsRepository['updateSubject']>(),
    ensureClassesOwnership: vi.fn<SubjectsRepository['ensureClassesOwnership']>(),
    updateClasses: vi.fn<SubjectsRepository['updateClasses']>(),
    deleteClasses: vi.fn<SubjectsRepository['deleteClasses']>(),
    deleteSubject: vi.fn<SubjectsRepository['deleteSubject']>(),
    ...overrides,
  };
}
