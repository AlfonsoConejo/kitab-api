import type { Pool } from 'pg';
import { vi, type Mock } from 'vitest';
import type { PeriodsRepository } from '../application/periods.repository.js';

/** Repository shape with Vitest mocks exposed for assertions and configuration. */
export type PeriodsRepositoryMock = {
  [Key in keyof PeriodsRepository]: PeriodsRepository[Key] extends (
    ...args: infer Args
  ) => infer Result
    ? Mock<(...args: Args) => Result>
    : PeriodsRepository[Key];
};

export type PeriodsRepositoryMockOverrides = Partial<PeriodsRepositoryMock>;

/**
 * Creates a complete repository double, allowing each test to replace only
 * the collaborators it needs.
 */
export function createPeriodsRepositoryMock(
  overrides: PeriodsRepositoryMockOverrides = {},
): PeriodsRepositoryMock {
  // Pool is a large runtime interface; only connect is relevant to these unit
  // tests. The cast stays here so tests can replace database when exercising
  // the transactional use case without constructing every Pool member.
  const database = {
    connect: vi.fn<Pool['connect']>(),
  } as unknown as Pool;

  return {
    database,
    createPeriod: vi.fn<PeriodsRepository['createPeriod']>(),
    listPeriods: vi.fn<PeriodsRepository['listPeriods']>(),
    getOwnedPeriod: vi.fn<PeriodsRepository['getOwnedPeriod']>(),
    updatePeriod: vi.fn<PeriodsRepository['updatePeriod']>(),
    deletePeriod: vi.fn<PeriodsRepository['deletePeriod']>(),
    listClasses: vi.fn<PeriodsRepository['listClasses']>(),
    listCalendarClasses: vi.fn<PeriodsRepository['listCalendarClasses']>(),
    ...overrides,
  };
}
