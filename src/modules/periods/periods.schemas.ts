import { z } from 'zod';
import type { PeriodRow } from './periods.types.js';
import { toDateOnly } from './periods.mapper.js';

// Crea un esquema Zod para fechas obligatorias en formato YYYY-MM-DD y con fecha calendario válida.
function dateString( requiredMessage: string, invalidMessage: string) {
  return z
    .string({
      error: requiredMessage
    })
    .trim()
    .min(1, {
      error: requiredMessage
    })
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      {
        error: invalidMessage
      }
    )
    .refine(
      (value) => {
        const [year, month, day] = value
          .split('-')
          .map(Number);

        const date = new Date(
          Date.UTC(year, month - 1, day)
        );

        return (
          date.getUTCFullYear() === year &&
          date.getUTCMonth() === month - 1 &&
          date.getUTCDate() === day
        );
      },
      {
        error: invalidMessage
      }
    );
}

// Comprueba que una fecha de inicio sea anterior a la fecha de término dentro de un esquema.
const dateRange = <T extends {startDate: string; endDate: string;}>(
  value: T,
  ctx: z.RefinementCtx,
  endMessage: string
) => {
  const startDate = new Date(value.startDate);
  const endDate = new Date(value.endDate);

  if (startDate >= endDate) {
    ctx.addIssue({
      code: 'custom',
      path: ['endDate'],
      message: endMessage
    });
  }
};

// Valida el identificador de período recibido como parámetro de ruta.
export const periodIdSchema = z.object({
  periodId: z
    .coerce
    .number({
      error: 'El ID del período no es válido.'
    })
    .int('El ID del período no es válido.')
    .positive('El ID del período no es válido.')
});

// Valida los datos necesarios para crear o actualizar un período académico.
export const periodSchema = z
  .object({
    name: z
      .string({
        error: 'El nombre del periodo es obligatorio.'
      })
      .trim()
      .min(1, {
        error: 'El nombre del periodo es obligatorio.'
      })
      .max(30, {
        error: 'El nombre del periodo debe tener máximo 30 caracteres.'
      }),

    startDate: dateString(
      'La fecha de inicio es obligatoria.',
      'Formato de fecha inválido.'
    ),

    endDate: dateString(
      'La fecha de finalización es obligatoria.',
      'Formato de fecha inválido.'
    ),

    color: z
      .string({
        error: 'El color es obligatorio.'
      })
      .trim()
      .regex(
        /^#[0-9A-Fa-f]{6}$/,
        {
          error: 'El color debe ser un código hexadecimal válido.'
        }
      ),
  })
  .superRefine((value, ctx) => {
    dateRange(
      value,
      ctx,
      'La fecha de inicio debe ser anterior a la fecha de finalización.'
    );
  });

// Valida una clase asociada a una materia, incluidos horario, modalidad y días.
const classSchema = z
  .object({
    days: z
      .array(
        z
          .number()
          .int(
            'Los días deben ser números enteros del 1 al 7.'
          )
          .min(
            1,
            'Los días deben ser números enteros del 1 al 7.'
          )
          .max(
            7,
            'Los días deben ser números enteros del 1 al 7.'
          )
      )
      .min(1, {
        error: 'Las clases deben ocurrir al menos un día.'
      })
      .refine(
        (days) => {
          return new Set(days).size === days.length;
        },
        {
          error: 'No se pueden repetir días.'
        }
      ),

    type: z.enum(
      [
        'theory',
        'laboratory',
        'workshop'
      ],
      {
        error:
          "Las clases solo pueden ser de tipo 'theory', 'laboratory' o 'workshop'."
      }
    ),

    mode: z.enum(
      [
        'onsite',
        'online'
      ],
      {
        error:
          "Las modalidades solo pueden ser 'onsite' o 'online'."
      }
    ),

    classroom: z
      .string()
      .trim()
      .max(10, {
        error: 'El salón no puede tener más de 10 caracteres.'
      })
      .nullable()
      .optional()
      .transform((value) => {
        return value || null;
      }),

    startTime: z
      .string({
        error: 'La hora de inicio es obligatoria.'
      })
      .regex(
        /^([01]\d|2[0-3]):([0-5]\d)$/,
        {
          error:
            'La hora de inicio debe tener el formato HH:mm.'
        }
      ),

    endTime: z
      .string({
        error: 'La hora de término es obligatoria.'
      })
      .regex(
        /^([01]\d|2[0-3]):([0-5]\d)$/,
        {
          error:
            'La hora de término debe tener el formato HH:mm.'
        }
      )
  })
  .superRefine((value, ctx) => {
    if (value.endTime <= value.startTime) {
      ctx.addIssue({
        code: 'custom',
        path: ['endTime'],
        message:
          'La hora de término debe ser posterior a la hora de inicio.'
      });
    }

    if (
      value.mode === 'online' &&
      value.classroom
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['classroom'],
        message:
          'Las clases en línea no pueden tener aula.'
      });
    }
  });

// Valida una materia y la lista opcional de clases que se crearán con ella.
export const createSubjectSchema = z
  .object({
    name: z
      .string({
        error: 'El nombre es obligatorio.'
      })
      .trim()
      .min(1, {
        error: 'El nombre es obligatorio.'
      })
      .max(40, {
        error: 'El nombre de la materia debe tener máximo 40 caracteres.'
      }),

    teacher: z
      .string()
      .trim()
      .max(50, {
        error: 'El nombre del profesor debe tener máximo 50 caracteres.'
      })
      .nullable()
      .optional()
      .transform((value) => {
        return value || null;
      }),

    color: z
      .string({
        error: 'El color es obligatorio.'
      })
      .trim()
      .regex(
        /^#[0-9A-Fa-f]{6}$/,
        {
          error: 'El color debe ser un código hexadecimal válido.'
        }
      ),

    startDate: dateString(
      'La fecha de inicio es obligatoria.',
      'La fecha de inicio no es válida.'
    ),

    endDate: dateString(
      'La fecha de término es obligatoria.',
      'La fecha de término no es válida.'
    ),

    classes: z
      .array(classSchema)
      .default([])
  })
  .superRefine((value, ctx) => {
    dateRange(
      value,
      ctx,
      'La fecha de inicio debe ser anterior a la fecha de término.'
    );
  });

export type PeriodInput = z.infer<typeof periodSchema>;
export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;

export function parseSubjectForPeriod(input: unknown, period: PeriodRow): CreateSubjectInput {
  const subject = createSubjectSchema.parse(input);

  const periodStart = toDateOnly(period.start_date);
  const periodEnd = toDateOnly(period.end_date);

  const subjectStart = subject.startDate;
  const subjectEnd = subject.endDate;

  if (
    subjectStart < periodStart ||
    subjectEnd > periodEnd
  ) {
    throw new z.ZodError([
      {
        code: 'custom',
        path: ['startDate'],
        message:
          'Las fechas de la materia deben estar dentro del periodo académico.'
      }
    ]);
  }

  return subject;
}