import { describe, expect, it } from 'vitest';
import { loginSchema, registerSchema } from '../auth.schemas.js';

const validRegistration = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  password: 'secure-password',
};

describe('registerSchema', () => {
  it('acepta un registro válido y normaliza nombres y correo', () => {
    const result = registerSchema.parse({
      ...validRegistration,
      firstName: '  Ada  ',
      lastName: '  Lovelace  ',
      email: '  ADA@EXAMPLE.COM  ',
    });

    expect(result).toEqual(validRegistration);
  });

  it.each([
    ['nombre vacío', { firstName: '   ' }, 'El nombre es obligatorio.'],
    ['apellido de un carácter', { lastName: 'L' }, 'El apellido debe contener al menos 2 caracteres.'],
    ['correo vacío', { email: '   ' }, 'El correo electrónico es obligatorio.'],
    ['correo inválido', { email: 'ada-at-example' }, 'El correo electrónico es inválido.'],
    ['contraseña vacía', { password: '      ' }, 'La contraseña es obligatoria.'],
    ['contraseña corta', { password: '12345' }, 'La contraseña debe contener al menos 6 caracteres.'],
  ])('rechaza un registro con %s', (_description, overrides, message) => {
    const result = registerSchema.safeParse({
      ...validRegistration,
      ...overrides,
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(message);
    }
  });

  it.each([
    ['nombre', { firstName: undefined }, 'El nombre es obligatorio.'],
    ['apellido', { lastName: undefined }, 'El apellido es obligatorio.'],
    ['correo', { email: undefined }, 'El correo electrónico es obligatorio.'],
    ['contraseña', { password: undefined }, 'La contraseña es obligatoria.'],
  ])('rechaza un registro sin %s', (_description, overrides, message) => {
    const result = registerSchema.safeParse({
      ...validRegistration,
      ...overrides,
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(message);
    }
  });

  it('conserva los espacios alrededor de una contraseña válida', () => {
    const result = registerSchema.parse({
      ...validRegistration,
      password: '  secure-password  ',
    });

    expect(result.password).toBe('  secure-password  ');
  });
});

describe('loginSchema', () => {
  it('acepta credenciales válidas y normaliza el correo', () => {
    const result = loginSchema.parse({
      email: '  ADA@EXAMPLE.COM  ',
      password: 'secure-password',
    });

    expect(result).toEqual({
      email: 'ada@example.com',
      password: 'secure-password',
    });
  });

  it('acepta un correo con formato inválido para no revelar errores de credenciales', () => {
    const result = loginSchema.parse({
      email: 'correo-sin-formato',
      password: 'secure-password',
    });

    expect(result).toEqual({
      email: 'correo-sin-formato',
      password: 'secure-password',
    });
  });

  it.each([
    ['correo vacío', { email: '   ', password: 'secure-password' }],
    ['contraseña vacía', { email: 'ada@example.com', password: '' }],
  ])('rechaza un inicio de sesión con %s', (_description, payload) => {
    const result = loginSchema.safeParse(payload);

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]?.message)
        .toBe('Todos los campos son obligatorios');
    }
  });

  it.each([
    ['correo', { password: 'secure-password' }],
    ['contraseña', { email: 'ada@example.com' }],
  ])('rechaza un inicio de sesión sin %s', (_description, payload) => {
    const result = loginSchema.safeParse(payload);

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]?.message)
        .toBe('Todos los campos son obligatorios');
    }
  });
});
