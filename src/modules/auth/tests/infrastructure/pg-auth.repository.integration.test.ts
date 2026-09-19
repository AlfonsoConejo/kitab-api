import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { pool } from '../../../../config/db.js';
import { withTransaction } from '../../../../shared/database/transaction.js';
import { hashToken } from '../../../../services/token.service.js';
import { PgAuthRepository } from '../../infrastructure/pg-auth.repository.js';

let createdSessionIds: number[] = [];
let createdUserIds: number[] = [];
let emailSequence = 0;

const metadata = {
  userAgent: 'Vitest integration test',
  ipAddress: '127.0.0.1',
  city: 'Test city',
  state: 'Test state',
  country: 'MX',
};

describe('PgAuthRepository - integración', () => {
  const repository = new PgAuthRepository(pool);

  beforeEach(() => {
    createdSessionIds = [];
    createdUserIds = [];
  });

  afterEach(async () => {
    await deleteCreatedRecords();
  });

  afterAll(async () => {
    await pool.end();
  });

  it('crea usuarios y los busca por correo o ID', async () => {
    const user = await createTestUser();

    const byEmail = await repository.findUserByEmail(user.email);
    const byId = await repository.findUserById(user.id);

    expect(byEmail).toMatchObject({
      id: user.id,
      email: user.email,
      password_hash: user.passwordHash,
    });
    expect(byId).toMatchObject({
      id: user.id,
      email: user.email,
      first_name: 'Test',
      last_name: 'User',
    });
    expect(byId).not.toHaveProperty('password_hash');
  });

  it('devuelve null cuando el usuario no existe', async () => {
    await expect(repository.findUserByEmail('missing@example.com')).resolves.toBeNull();
    await expect(repository.findUserById(999999)).resolves.toBeNull();
  });

  it('rechaza la creación de un usuario con correo duplicado mediante 23505', async () => {
    const user = await createTestUser();

    await expect(repository.createUser({
      first_name: 'Another',
      last_name: 'User',
      email: user.email,
      password_hash: 'another-fake-password-hash',
    })).rejects.toMatchObject({ code: '23505' });
  });

  it('crea una sesión con su refresh token hasheado y bloqueable', async () => {
    const user = await createTestUser();
    const refreshToken = 'refresh-token-for-lock-test';
    const sessionId = await createSessionWithRefresh(user.id, refreshToken);

    const refreshTokenRow = await withTransaction(pool, (client) => {
      return repository.getRefreshTokenForUpdate(refreshToken, client);
    });
    const sessionResult = await pool.query<{
      user_agent: string | null;
      ip_address: string | null;
      city: string | null;
      state: string | null;
      country: string | null;
    }>(
      `SELECT user_agent, ip_address, city, state, country
       FROM sessions WHERE id = $1`,
      [sessionId],
    );
    const hashResult = await pool.query<{ token_hash: string }>(
      'SELECT token_hash FROM refresh_tokens WHERE session_id = $1',
      [sessionId],
    );

    expect(refreshTokenRow).toMatchObject({
      session_id: sessionId,
      user_id: user.id,
      is_used: false,
      is_revoked: false,
      is_active: true,
    });
    expect(sessionResult.rows[0]).toEqual({
      user_agent: metadata.userAgent,
      ip_address: metadata.ipAddress,
      city: metadata.city,
      state: metadata.state,
      country: metadata.country,
    });
    expect(hashResult.rows[0]?.token_hash).toBe(hashToken(refreshToken));
  });

  it('crea refresh tokens con expiración aproximada de siete días', async () => {
    const user = await createTestUser();
    const beforeCreation = Date.now();
    const sessionId = await createSessionWithRefresh(user.id, 'refresh-token-expiration');
    const afterCreation = Date.now();
    const result = await pool.query<{ expires_at: Date | string }>(
      'SELECT expires_at FROM refresh_tokens WHERE session_id = $1',
      [sessionId],
    );
    const expiresAt = new Date(result.rows[0]!.expires_at).getTime();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const tolerance = 2_000;

    expect(expiresAt).toBeGreaterThanOrEqual(beforeCreation + sevenDays - tolerance);
    expect(expiresAt).toBeLessThanOrEqual(afterCreation + sevenDays + tolerance);
  });

  it('bloquea un refresh token mientras otra transacción lo está consumiendo', async () => {
    const user = await createTestUser();
    const refreshToken = 'refresh-token-concurrent-lock';
    await createSessionWithRefresh(user.id, refreshToken);
    const firstClient = await pool.connect();
    const secondClient = await pool.connect();

    try {
      await firstClient.query('BEGIN');
      await repository.getRefreshTokenForUpdate(refreshToken, firstClient);

      await secondClient.query('BEGIN');
      await secondClient.query("SET LOCAL lock_timeout = '100ms'");

      await expect(repository.getRefreshTokenForUpdate(refreshToken, secondClient))
        .rejects.toMatchObject({ code: '55P03' });
    } finally {
      await secondClient.query('ROLLBACK');
      secondClient.release();
      await firstClient.query('ROLLBACK');
      firstClient.release();
    }
  });

  it('devuelve null al intentar bloquear un refresh token inexistente', async () => {
    const token = await withTransaction(pool, (client) => {
      return repository.getRefreshTokenForUpdate('missing-refresh-token', client);
    });

    expect(token).toBeNull();
  });

  it('marca, revoca y desactiva una sesión con sus refresh tokens', async () => {
    const user = await createTestUser();
    const firstToken = 'refresh-token-first';
    const sessionId = await createSessionWithRefresh(user.id, firstToken);
    const secondToken = 'refresh-token-second';

    const updatedRefreshToken = await withTransaction(pool, async (client) => {
      await repository.createRefreshToken(sessionId, secondToken, client);
      const token = await repository.getRefreshTokenForUpdate(firstToken, client);

      await repository.markRefreshTokenUsed(token!.id, client);
      await repository.revokeSessionRefreshTokens(sessionId, client);
      await repository.deactivateSession(sessionId, client);

      return repository.getRefreshTokenForUpdate(firstToken, client);
    });

    const tokens = await pool.query<{ is_used: boolean; is_revoked: boolean }>(
      `SELECT is_used, is_revoked FROM refresh_tokens
       WHERE session_id = $1 ORDER BY id`,
      [sessionId],
    );
    const session = await pool.query<{ is_active: boolean }>(
      'SELECT is_active FROM sessions WHERE id = $1',
      [sessionId],
    );

    expect(tokens.rows).toEqual([
      { is_used: true, is_revoked: true },
      { is_used: false, is_revoked: true },
    ]);
    expect(session.rows[0]?.is_active).toBe(false);
    expect(updatedRefreshToken).toMatchObject({
      is_used: true,
      is_revoked: true,
      is_active: false,
    });
  });

  it('encuentra y revoca un refresh token activo de forma individual', async () => {
    const user = await createTestUser();
    const refreshToken = 'refresh-token-revoke';
    const sessionId = await createSessionWithRefresh(user.id, refreshToken);

    const activeToken = await withTransaction(pool, async (client) => {
      const found = await repository.findActiveRefreshToken(refreshToken, client);
      const activeUserId = await repository.getActiveRefreshTokenUserId(refreshToken, client);
      const revoked = await repository.revokeRefreshToken(refreshToken, client);

      return { found, activeUserId, revoked };
    });
    const afterRevocation = await withTransaction(pool, async (client) => ({
      active: await repository.findActiveRefreshToken(refreshToken, client),
      userId: await repository.getActiveRefreshTokenUserId(refreshToken, client),
    }));

    expect(activeToken.found).toEqual({ session_id: sessionId, user_id: user.id });
    expect(activeToken.activeUserId).toBe(user.id);
    expect(activeToken.revoked).toEqual({ session_id: sessionId });
    expect(afterRevocation).toEqual({ active: null, userId: null });
  });

  it('devuelve null al revocar un refresh token inexistente o ya revocado', async () => {
    const missingToken = await withTransaction(pool, (client) => {
      return repository.revokeRefreshToken('missing-refresh-token', client);
    });
    const user = await createTestUser();
    const refreshToken = 'refresh-token-already-revoked';
    await createSessionWithRefresh(user.id, refreshToken);

    const secondRevocation = await withTransaction(pool, async (client) => {
      await repository.revokeRefreshToken(refreshToken, client);
      return repository.revokeRefreshToken(refreshToken, client);
    });

    expect(missingToken).toBeNull();
    expect(secondRevocation).toBeNull();
  });

  it('no devuelve el usuario de un refresh token cuando su sesión está inactiva', async () => {
    const user = await createTestUser();
    const refreshToken = 'refresh-token-inactive-session';
    const sessionId = await createSessionWithRefresh(user.id, refreshToken);

    const activeUserId = await withTransaction(pool, async (client) => {
      await repository.deactivateSession(sessionId, client);
      return repository.getActiveRefreshTokenUserId(refreshToken, client);
    });

    expect(activeUserId).toBeNull();
  });

  it('revoca todos los refresh tokens y desactiva todas las sesiones del usuario', async () => {
    const user = await createTestUser();
    const firstSessionId = await createSessionWithRefresh(user.id, 'refresh-token-all-first');
    const secondSessionId = await createSessionWithRefresh(user.id, 'refresh-token-all-second');

    const deactivatedSessions = await withTransaction(pool, async (client) => {
      await repository.revokeAllUserRefreshTokens(user.id, client);
      return repository.deactivateAllUserSessions(user.id, client);
    });
    const tokenResult = await pool.query<{ is_revoked: boolean; is_used: boolean }>(
      `SELECT is_revoked, is_used FROM refresh_tokens
       WHERE session_id = ANY($1::int[]) ORDER BY session_id`,
      [[firstSessionId, secondSessionId]],
    );
    const sessionResult = await pool.query<{ is_active: boolean }>(
      `SELECT is_active FROM sessions
       WHERE id = ANY($1::int[]) ORDER BY id`,
      [[firstSessionId, secondSessionId]],
    );

    expect(deactivatedSessions).toBe(2);
    expect(tokenResult.rows).toEqual([
      { is_revoked: true, is_used: true },
      { is_revoked: true, is_used: true },
    ]);
    expect(sessionResult.rows).toEqual([
      { is_active: false },
      { is_active: false },
    ]);
  });
});

async function createTestUser() {
  const email = createUniqueEmail('auth-integration@example.com');
  const passwordHash = 'fake-password-hash';
  const user = await new PgAuthRepository(pool).createUser({
    first_name: 'Test',
    last_name: 'User',
    email,
    password_hash: passwordHash,
  });
  createdUserIds.push(user.id);

  return { id: user.id, email, passwordHash };
}

async function createSessionWithRefresh(userId: number, refreshToken: string) {
  return withTransaction(pool, async (client) => {
    const repository = new PgAuthRepository(pool);
    const session = await repository.createSession(userId, metadata, client);
    createdSessionIds.push(session.id);
    await repository.createRefreshToken(session.id, refreshToken, client);

    return session.id;
  });
}

async function deleteCreatedRecords() {
  if (createdSessionIds.length) {
    await pool.query(
      'DELETE FROM refresh_tokens WHERE session_id = ANY($1::int[])',
      [createdSessionIds],
    );
    await pool.query(
      'DELETE FROM sessions WHERE id = ANY($1::int[])',
      [createdSessionIds],
    );
  }

  if (createdUserIds.length) {
    await pool.query(
      'DELETE FROM users WHERE id = ANY($1::int[])',
      [createdUserIds],
    );
  }
}

function createUniqueEmail(email: string): string {
  const [localPart, domain] = email.split('@');

  return `${localPart}+${process.pid}-${Date.now()}-${emailSequence++}@${domain}`;
}
