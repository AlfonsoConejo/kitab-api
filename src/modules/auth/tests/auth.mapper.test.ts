import { describe, expect, it } from 'vitest';
import { toUserDto, toUserRecord } from '../auth.mapper.js';

describe('auth mapper', () => {
  it('convierte una fila de PostgreSQL al DTO público normalizado', () => {
    const createdAt = new Date('2026-08-01T00:00:00.000Z');
    const result = toUserDto({
      id: 10,
      first_name: '  Ada  ',
      last_name: '  Lovelace  ',
      email: '  ADA@EXAMPLE.COM  ',
      password_hash: 'private-password-hash',
      created_at: createdAt,
      updated_at: null,
    });

    expect(result).toEqual({
      id: 10,
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      fullName: 'Ada Lovelace',
      createdAt,
      updatedAt: null,
    });
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('convierte los datos de registro al formato de columnas de PostgreSQL', () => {
    const result = toUserRecord({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      password: 'secure-password',
    }, 'hashed-password');

    expect(result).toEqual({
      first_name: 'Ada',
      last_name: 'Lovelace',
      email: 'ada@example.com',
      password_hash: 'hashed-password',
    });
    expect(result).not.toHaveProperty('password');
  });
});
