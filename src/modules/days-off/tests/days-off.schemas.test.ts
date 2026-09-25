import { describe, expect, it } from 'vitest';
import {
  createDayOffSchema,
  dayOffIdSchema,
  daysOffPeriodIdSchema,
  parseDayOffForPeriod,
} from '../days-off.schemas.js';

const validDayOff = {
  name: 'Consejo técnico',
  type: 'day_off',
  startDate: '2026-09-10',
  endDate: '2026-09-10',
  notes: null,
};

const period = {
  start_date: '2026-08-01',
  end_date: '2026-12-15',
};

describe('createDayOffSchema', () => {
  it('acepta un día libre válido, aplica valores por defecto y normaliza texto', () => {
    const result = createDayOffSchema.parse({
      name: '  Consejo técnico  ',
      startDate: '2026-09-10',
      endDate: '2026-09-10',
      notes: '   ',
    });

    expect(result).toEqual({
      name: 'Consejo técnico',
      type: 'day_off',
      startDate: '2026-09-10',
      endDate: '2026-09-10',
      notes: null,
    });
  });

  it('acepta un intervalo de vacaciones de varios días', () => {
    const result = createDayOffSchema.safeParse({
      ...validDayOff,
      type: 'vacation',
      startDate: '2026-12-01',
      endDate: '2026-12-10',
    });

    expect(result.success).toBe(true);
  });

  it('elimina espacios alrededor de las notas con contenido', () => {
    const result = createDayOffSchema.parse({
      ...validDayOff,
      notes: '  Sin clases  ',
    });

    expect(result.notes).toBe('Sin clases');
  });

  it.each([
    ['nombre vacío', { name: '   ' }, 'El nombre es obligatorio.'],
    ['nombre mayor de 60 caracteres', { name: 'a'.repeat(61) }, 'El nombre debe tener máximo 60 caracteres.'],
    ['tipo inválido', { type: 'holiday' }, 'El tipo de descanso no es válido.'],
    ['fecha de calendario inválida', { startDate: '2026-02-29' }, 'La fecha de inicio no es válida.'],
    ['notas mayores de 150 caracteres', { notes: 'a'.repeat(151) }, 'Las notas deben tener máximo 150 caracteres.'],
  ])('rechaza un payload con %s', (_description, overrides, message) => {
    const result = createDayOffSchema.safeParse({
      ...validDayOff,
      ...overrides,
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(message);
    }
  });

  it.each([
    ['fecha de inicio ausente', { startDate: undefined }, 'La fecha de inicio es obligatoria.'],
    ['fecha de término ausente', { endDate: undefined }, 'La fecha de término es obligatoria.'],
    ['fecha de término inválida', { endDate: '2026-02-29' }, 'La fecha de término no es válida.'],
  ])('rechaza un payload con %s', (_description, overrides, message) => {
    const result = createDayOffSchema.safeParse({
      ...validDayOff,
      ...overrides,
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(message);
    }
  });

  it('rechaza una fecha de término anterior a la fecha de inicio', () => {
    const result = createDayOffSchema.safeParse({
      ...validDayOff,
      startDate: '2026-09-11',
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]).toMatchObject({
        path: ['endDate'],
        message: 'La fecha de término no puede ser anterior a la fecha de inicio.',
      });
    }
  });

  it('rechaza un día libre que abarca más de un día', () => {
    const result = createDayOffSchema.safeParse({
      ...validDayOff,
      endDate: '2026-09-11',
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]).toMatchObject({
        path: ['endDate'],
        message: 'Un día libre debe iniciar y terminar en la misma fecha.',
      });
    }
  });
});

describe('parseDayOffForPeriod', () => {
  it('acepta un intervalo que coincide exactamente con los límites del período', () => {
    const result = parseDayOffForPeriod({
      ...validDayOff,
      type: 'vacation',
      startDate: '2026-08-01',
      endDate: '2026-12-15',
    }, period);

    expect(result).toMatchObject({
      startDate: '2026-08-01',
      endDate: '2026-12-15',
    });
  });

  it('acepta fechas del período recibidas como objetos Date de PostgreSQL', () => {
    const result = parseDayOffForPeriod({
      ...validDayOff,
      type: 'vacation',
      startDate: '2026-08-01',
      endDate: '2026-12-15',
    }, {
      start_date: new Date('2026-08-01T00:00:00.000Z'),
      end_date: new Date('2026-12-15T00:00:00.000Z'),
    });

    expect(result).toMatchObject({
      startDate: '2026-08-01',
      endDate: '2026-12-15',
    });
  });

  it.each([
    [
      'inicia antes del período',
      { ...validDayOff, type: 'vacation', startDate: '2026-07-31' },
    ],
    [
      'termina después del período',
      { ...validDayOff, type: 'vacation', endDate: '2026-12-16' },
    ],
  ])('rechaza un descanso que %s', (_description, payload) => {
    expect(() => parseDayOffForPeriod(payload, period))
      .toThrow('Las fechas del descanso deben estar dentro del período académico.');
  });
});

describe('days-off route parameter schemas', () => {
  it('convierte IDs válidos de ruta a números', () => {
    expect(daysOffPeriodIdSchema.safeParse({ periodId: '12' })).toEqual({
      success: true,
      data: { periodId: 12 },
    });
    expect(dayOffIdSchema.safeParse({ dayOffId: '24' })).toEqual({
      success: true,
      data: { dayOffId: 24 },
    });
  });

  it.each([
    ['cero', '0'],
    ['número negativo', '-12'],
    ['número decimal', '12.5'],
    ['valor no numérico', 'abc'],
  ])('rechaza un periodId con %s', (_description, periodId) => {
    const result = daysOffPeriodIdSchema.safeParse({ periodId });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]?.message)
        .toBe('El ID del período no es válido.');
    }
  });

  it.each([
    ['cero', '0'],
    ['número negativo', '-24'],
    ['número decimal', '24.5'],
    ['valor no numérico', 'abc'],
  ])('rechaza un dayOffId con %s', (_description, dayOffId) => {
    const result = dayOffIdSchema.safeParse({ dayOffId });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]?.message)
        .toBe('El ID del descanso no es válido.');
    }
  });
});
