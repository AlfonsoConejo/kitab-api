import { describe, expect, it } from 'vitest';
import {
  classSchema,
  createClassesSchema,
  createSubjectSchema,
  externalConflictsSchema,
  internalConflictsSchema,
  parseSubjectCreateForPeriod,
  parseSubjectUpdateForPeriod,
  periodIdParamsSchema,
  subjectIdParamsSchema,
  updateSubjectSchema,
} from '../subjects.schemas.js';
import type { SubjectRow } from '../subjects.types.js';

const validClass = {
  days: [1, 3],
  type: 'theory',
  mode: 'onsite',
  classroom: 'A-101',
  startTime: '09:00',
  endTime: '10:30',
};

const validSubject = {
  name: 'Matemáticas',
  teacher: 'Taylor Swift',
  color: '#2563EB',
  startDate: '2026-08-01',
  endDate: '2026-12-15',
};

const period = {
  start_date: '2026-08-01',
  end_date: '2026-12-15',
};

describe('classSchema', () => {
  it('acepta una clase válida y normaliza los campos opcionales', () => {
    const result = classSchema.parse({
      ...validClass,
      classroom: '  A-101  ',
      id: null,
    });

    expect(result).toEqual({
      ...validClass,
      classroom: 'A-101',
      id: undefined,
    });
  });

  it('normaliza un salón vacío como null', () => {
    const result = classSchema.parse({
      ...validClass,
      classroom: '   ',
    });

    expect(result.classroom).toBeNull();
  });

  it.each([
    ['sin días', { days: [] }, 'Las clases deben ocurrir al menos un día.'],
    ['con días repetidos', { days: [1, 1] }, 'No se pueden repetir días.'],
    ['con un día fuera de rango', { days: [8] }, 'Los días deben ser números enteros del 1 al 7.'],
    ['con tipo inválido', { type: 'seminar' }, "Las clases solo pueden ser de tipo 'theory', 'laboratory' o 'workshop'."],
    ['con modalidad inválida', { mode: 'hybrid' }, "Las modalidades solo pueden ser 'onsite' o 'online'."],
    ['con salón mayor de 10 caracteres', { classroom: 'a'.repeat(11) }, 'El salón no puede tener más de 10 caracteres.'],
    ['con hora inicial inválida', { startTime: '24:00' }, 'La hora de inicio debe tener el formato HH:mm.'],
  ])('rechaza una clase %s', (_description, overrides, message) => {
    const result = classSchema.safeParse({
      ...validClass,
      ...overrides,
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(message);
    }
  });

  it('rechaza una clase que termina antes de que inicia', () => {
    const result = classSchema.safeParse({
      ...validClass,
      endTime: '09:00',
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]).toMatchObject({
        path: ['endTime'],
        message: 'La hora de término debe ser posterior a la hora de inicio.',
      });
    }
  });

  it('rechaza un salón asignado a una clase en línea', () => {
    const result = classSchema.safeParse({
      ...validClass,
      mode: 'online',
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]).toMatchObject({
        path: ['classroom'],
        message: 'Las clases en línea no pueden tener aula.',
      });
    }
  });
});

describe('subject schemas', () => {
  it('crea una materia válida, normaliza texto y aplica clases vacías por defecto', () => {
    const result = createSubjectSchema.parse({
      ...validSubject,
      name: '  Matemáticas  ',
      teacher: '   ',
    });

    expect(result).toEqual({
      ...validSubject,
      name: 'Matemáticas',
      teacher: null,
      classes: [],
    });
  });

  it.each([
    ['nombre vacío', { name: '   ' }, 'El nombre es obligatorio.'],
    ['nombre mayor de 40 caracteres', { name: 'a'.repeat(41) }, 'El nombre de la materia debe tener máximo 40 caracteres.'],
    ['profesor mayor de 50 caracteres', { teacher: 'a'.repeat(51) }, 'El nombre del profesor debe tener máximo 50 caracteres.'],
    ['color inválido', { color: '#FFF' }, 'El color debe ser un código hexadecimal válido.'],
    ['fecha inicial inválida', { startDate: '2026-02-29' }, 'La fecha de inicio no es válida.'],
  ])('rechaza una materia con %s', (_description, overrides, message) => {
    const result = createSubjectSchema.safeParse({
      ...validSubject,
      ...overrides,
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(message);
    }
  });

  it('rechaza una materia cuya fecha final no es posterior a la inicial', () => {
    const result = createSubjectSchema.safeParse({
      ...validSubject,
      endDate: validSubject.startDate,
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]).toMatchObject({
        path: ['endDate'],
        message: 'La fecha de inicio debe ser anterior a la fecha de término.',
      });
    }
  });

  it('requiere las colecciones de clases al actualizar una materia', () => {
    const result = updateSubjectSchema.safeParse(validSubject);

    expect(result.success).toBe(false);
  });

  it('acepta una actualización válida con cambios de clases', () => {
    const result = updateSubjectSchema.parse({
      ...validSubject,
      classes: [{ ...validClass, id: 8 }],
      deletedClassIds: [4],
    });

    expect(result.classes[0]?.id).toBe(8);
    expect(result.deletedClassIds).toEqual([4]);
  });
});

describe('class collection and conflict schemas', () => {
  it('requiere al menos una clase al crear clases', () => {
    const result = createClassesSchema.safeParse({ classes: [] });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Debes enviar al menos una clase.');
    }
  });

  it('aplica una lista vacía por defecto para conflictos', () => {
    expect(externalConflictsSchema.parse({ classes: undefined })).toEqual({ classes: [] });
    expect(internalConflictsSchema.parse({})).toEqual({ classes: [] });
  });

  it('rechaza una clase de conflicto con horario inválido', () => {
    const result = externalConflictsSchema.safeParse({
      classes: [{ days: [1], startTime: '10:00', endTime: '09:00' }],
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]).toMatchObject({
        path: ['classes', 0, 'endTime'],
        message: 'La hora de término debe ser posterior a la hora de inicio.',
      });
    }
  });
});

describe('subject route parameter schemas', () => {
  it('convierte los IDs válidos de ruta a números', () => {
    expect(subjectIdParamsSchema.parse({ subjectId: '12' })).toEqual({ subjectId: 12 });
    expect(periodIdParamsSchema.parse({ periodId: '24' })).toEqual({ periodId: 24 });
  });

  it.each([
    ['cero', '0'],
    ['número negativo', '-12'],
    ['número decimal', '12.5'],
    ['valor no numérico', 'abc'],
  ])('rechaza un subjectId con %s', (_description, subjectId) => {
    const result = subjectIdParamsSchema.safeParse({ subjectId });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('El ID de la materia no es válido.');
    }
  });

  it('rechaza un periodId inválido', () => {
    const result = periodIdParamsSchema.safeParse({ periodId: '0' });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('El ID del período no es válido.');
    }
  });
});

describe('period-bound subject parsing', () => {
  it('acepta una materia creada dentro de los límites del período', () => {
    const result = parseSubjectCreateForPeriod({
      ...validSubject,
      classes: [],
    }, period);

    expect(result.name).toBe(validSubject.name);
  });

  it('acepta límites de período recibidos como Date', () => {
    const result = parseSubjectCreateForPeriod({
      ...validSubject,
      classes: [],
    }, {
      start_date: new Date('2026-08-01T00:00:00.000Z'),
      end_date: new Date('2026-12-15T00:00:00.000Z'),
    });

    expect(result.startDate).toBe('2026-08-01');
  });

  it.each([
    ['inicia antes del período', { startDate: '2026-07-31' }],
    ['termina después del período', { endDate: '2026-12-16' }],
  ])('rechaza una materia que %s al crearla', (_description, overrides) => {
    expect(() => parseSubjectCreateForPeriod({
      ...validSubject,
      ...overrides,
      classes: [],
    }, period)).toThrow('Las fechas de la materia deben estar dentro del periodo académico.');
  });

  it('rechaza una actualización fuera de los límites del período', () => {
    const subject: SubjectRow = {
      id: 1,
      period_id: 12,
      ...validSubject,
      start_date: validSubject.startDate,
      end_date: validSubject.endDate,
      period_start_date: period.start_date,
      period_end_date: period.end_date,
    };

    expect(() => parseSubjectUpdateForPeriod({
      ...validSubject,
      startDate: '2026-07-31',
      classes: [],
      deletedClassIds: [],
    }, subject)).toThrow('Las fechas de la materia deben estar dentro del periodo académico.');
  });
});
