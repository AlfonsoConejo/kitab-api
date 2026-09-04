import { z } from 'zod';
import { positiveIdSchema } from '../../shared/validation/positive-id.schema.js';
import { isoDateSchema } from '../../shared/validation/iso-date.schema.js';
import type { SubjectRow } from './subjects.types.js';
import { toDateOnly } from '../../shared/utils/date.js';

const subjectIdMessage = 'El ID de la materia no es válido.';
const periodIdMessage = 'El ID del periodo no es válido.';

// Valida el rango horario y los datos de una clase antes de guardarla.
export const classSchema = z
  .object({
    id: positiveIdSchema(
      'El ID de la clase no es válido.'
    )
      .nullable()
      .optional()
      .transform((value) => {
        return value ?? undefined;
      }),

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
        error:
          'El salón no puede tener más de 10 caracteres.'
      })
      .nullable()
      .optional()
      .transform((value) => {
        return value || null;
      }),

    startTime: z
      .string({
        error:
          'La hora de inicio es obligatoria.'
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
        error:
          'La hora de término es obligatoria.'
      })
      .regex(
        /^([01]\d|2[0-3]):([0-5]\d)$/,
        {
          error:
            'La hora de término debe tener el formato HH:mm.'
        }
      )
  })
  .superRefine((value, context) => {
    if (value.endTime <= value.startTime) {
      context.addIssue({
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
      context.addIssue({
        code: 'custom',
        path: ['classroom'],
        message:
          'Las clases en línea no pueden tener aula.'
      });
    }
  });

const subjectSchema = z
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
        error:
          'El nombre de la materia debe tener máximo 40 caracteres.'
      }),

    teacher: z
      .string()
      .trim()
      .max(50, {
        error:
          'El nombre del profesor debe tener máximo 50 caracteres.'
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
          error:
            'El color debe ser un código hexadecimal válido.'
        }
      ),

    startDate: isoDateSchema(
      'La fecha de inicio es obligatoria.',
      'La fecha de inicio no es válida.'
    ),

    endDate: isoDateSchema(
      'La fecha de término es obligatoria.',
      'La fecha de término no es válida.'
    )
  })
  .superRefine((value, context) => {
    if (
      new Date(value.startDate) >=
      new Date(value.endDate)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['endDate'],
        message:
          'La fecha de inicio debe ser anterior a la fecha de término.'
      });
    }
  });

export const subjectIdParamsSchema = z.object({
  subjectId: positiveIdSchema(
    subjectIdMessage
  )
});


export const createClassesSchema = z.object({
  classes: z
    .array(
      classSchema
    )
    .min(1, {
      error:
        'Debes enviar al menos una clase.'
    })
});


export const updateSubjectSchema = subjectSchema.extend({
  classes: z.array(
    classSchema
  ),

  deletedClassIds: z.array(
    positiveIdSchema(
      'El ID de la clase no es válido.'
    )
  )
});

const conflictClassSchema = z
  .object({
    id: z
      .union([
        z.number(),
        z.string()
      ])
      .optional(),

    tempId: z
      .union([
        z.number(),
        z.string()
      ])
      .optional(),

    days: z.array(
      z
        .number()
        .int()
        .min(1)
        .max(7)
    ),

    startTime: z
      .string()
      .regex(
        /^([01]\d|2[0-3]):([0-5]\d)$/
      ),

    endTime: z
      .string()
      .regex(
        /^([01]\d|2[0-3]):([0-5]\d)$/
      )
  })
  .refine(
    (value) => {
      return value.endTime > value.startTime;
    },
    {
      path: ['endTime'],
      error:
        'La hora de término debe ser posterior a la hora de inicio.'
    }
  );


export const externalConflictsSchema = z.object({
  periodId: positiveIdSchema(
    periodIdMessage
  ),

  subjectId: positiveIdSchema(
    subjectIdMessage
  )
    .nullable()
    .optional(),

  classes: z
    .array(
      conflictClassSchema
    )
    .default([])
});

export const internalConflictsSchema = z.object({
  classes: z
    .array(
      conflictClassSchema
    )
    .default([])
});

export type ClassInput = z.infer<typeof classSchema>;
export type SubjectUpdateInput = z.infer<typeof updateSubjectSchema>;
export type ConflictClassInput = z.infer<typeof conflictClassSchema>;

// Valida que las fechas de una materia actualizada permanezcan dentro de su período académico.
export function parseSubjectUpdateForPeriod(
  input: unknown,
  subject: SubjectRow
): SubjectUpdateInput {
  const update = updateSubjectSchema.parse(input);

  const periodStart = toDateOnly(
    subject.period_start_date!
  );

  const periodEnd = toDateOnly(
    subject.period_end_date!
  );

  const subjectStart = update.startDate;
  const subjectEnd = update.endDate;

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

  return update;
}