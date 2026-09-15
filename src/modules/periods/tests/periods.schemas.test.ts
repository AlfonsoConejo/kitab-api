import { describe, expect, it } from 'vitest';
import { periodIdSchema, periodSchema } from '../periods.schemas.js';

const validPeriod = {
  name: 'Agosto-Diciembre 2026',
  startDate: '2026-08-01',
  endDate: '2026-12-15',
  color: '#2563EB',
};

describe('periodSchema', () => {
  it('acepta un payload de período válido y elimina espacios del nombre', () => {
    const result = periodSchema.safeParse({
      ...validPeriod,
      name: '  Agosto-Diciembre 2026  ',
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.name).toBe('Agosto-Diciembre 2026');
    }
  });

  it('rechaza un nombre vacío', () => {
    const result = periodSchema.safeParse({
      ...validPeriod,
      name: '   ',
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]?.message)
        .toBe('El nombre del periodo es obligatorio.');
    }
  });

  it('rechaza un nombre de más de 30 caracteres', () => {
    const result = periodSchema.safeParse({
      ...validPeriod,
      name: 'a'.repeat(31),
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]?.message)
        .toBe('El nombre del periodo debe tener máximo 30 caracteres.');
    }
  });

  it('rechaza fechas de calendario inválidas', () => {
    const result = periodSchema.safeParse({
      ...validPeriod,
      startDate: '2026-02-29',
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]?.message)
        .toBe('Formato de fecha inválido.');
    }
  });

  it('rechaza una fecha de término igual o anterior a la fecha de inicio', () => {
    const result = periodSchema.safeParse({
      ...validPeriod,
      endDate: validPeriod.startDate,
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['endDate']);
      expect(result.error.issues[0]?.message)
        .toBe('La fecha de inicio debe ser anterior a la fecha de finalización.');
    }
  });

  it('rechaza un color que no es hexadecimal de seis dígitos', () => {
    const result = periodSchema.safeParse({
      ...validPeriod,
      color: '#FFF',
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]?.message)
        .toBe('El color debe ser un código hexadecimal válido.');
    }
  });
});

describe('periodIdSchema', () => {
  it('convierte un ID de ruta válido a número', () => {
    const result = periodIdSchema.safeParse({ periodId: '12' });

    expect(result).toEqual({
      success: true,
      data: { periodId: 12 },
    });
  });

  it.each([
    ['cero', '0'],
    ['número negativo', '-12'],
    ['número decimal', '12.5'],
    ['valor no numérico', 'abc'],
  ])('rechaza un ID de período con %s', (_description, periodId) => {
    const result = periodIdSchema.safeParse({ periodId });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]?.message)
        .toBe('El ID del período no es válido.');
    }
  });
});
