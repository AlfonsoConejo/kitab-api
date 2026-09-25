import { vi, type Mock } from 'vitest';
import type { DaysOffRepository } from '../application/days-off.repository.js';

/** Repository shape with Vitest mocks exposed for assertions and configuration. */
export type DaysOffRepositoryMock = {
  [Key in keyof DaysOffRepository]: DaysOffRepository[Key] extends (
    ...args: infer Args
  ) => infer Result
    ? Mock<(...args: Args) => Result>
    : DaysOffRepository[Key];
};

export type DaysOffRepositoryMockOverrides = Partial<DaysOffRepositoryMock>;

/** Creates a complete days-off repository double for unit tests. */
export function createDaysOffRepositoryMock(
  overrides: DaysOffRepositoryMockOverrides = {},
): DaysOffRepositoryMock {
  return {
    getOwnedPeriod: vi.fn<DaysOffRepository['getOwnedPeriod']>(),
    listByPeriod: vi.fn<DaysOffRepository['listByPeriod']>(),
    getOwnedDayOff: vi.fn<DaysOffRepository['getOwnedDayOff']>(),
    create: vi.fn<DaysOffRepository['create']>(),
    updateById: vi.fn<DaysOffRepository['updateById']>(),
    deleteById: vi.fn<DaysOffRepository['deleteById']>(),
    ...overrides,
  };
}
