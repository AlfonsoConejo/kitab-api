import type { Pool } from 'pg';
import { vi, type Mock } from 'vitest';
import type { AuthRepository } from '../application/auth.repository.js';

/** Repository shape with Vitest mocks exposed for assertions and configuration. */
export type AuthRepositoryMock = {
  [Key in keyof AuthRepository]: AuthRepository[Key] extends (
    ...args: infer Args
  ) => infer Result
    ? Mock<(...args: Args) => Result>
    : AuthRepository[Key];
};

export type AuthRepositoryMockOverrides = Partial<AuthRepositoryMock>;

/** Creates a complete auth repository double for unit tests. */
export function createAuthRepositoryMock(
  overrides: AuthRepositoryMockOverrides = {},
): AuthRepositoryMock {
  // Pool is a large runtime interface; transaction tests only need a value
  // that can be passed to the mocked withTransaction helper.
  const database = {} as Pool;

  return {
    database,
    findUserByEmail: vi.fn<AuthRepository['findUserByEmail']>(),
    findUserById: vi.fn<AuthRepository['findUserById']>(),
    createUser: vi.fn<AuthRepository['createUser']>(),
    createSession: vi.fn<AuthRepository['createSession']>(),
    createRefreshToken: vi.fn<AuthRepository['createRefreshToken']>(),
    getRefreshTokenForUpdate: vi.fn<AuthRepository['getRefreshTokenForUpdate']>(),
    markRefreshTokenUsed: vi.fn<AuthRepository['markRefreshTokenUsed']>(),
    revokeSessionRefreshTokens: vi.fn<AuthRepository['revokeSessionRefreshTokens']>(),
    deactivateSession: vi.fn<AuthRepository['deactivateSession']>(),
    findActiveRefreshToken: vi.fn<AuthRepository['findActiveRefreshToken']>(),
    revokeRefreshToken: vi.fn<AuthRepository['revokeRefreshToken']>(),
    getActiveRefreshTokenUserId: vi.fn<AuthRepository['getActiveRefreshTokenUserId']>(),
    revokeAllUserRefreshTokens: vi.fn<AuthRepository['revokeAllUserRefreshTokens']>(),
    deactivateAllUserSessions: vi.fn<AuthRepository['deactivateAllUserSessions']>(),
    ...overrides,
  };
}
