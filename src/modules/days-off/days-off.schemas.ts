import { z } from 'zod';
import { positiveIdSchema } from '../../shared/validation/positive-id.schema.js';
import { isoDateSchema } from '../../shared/validation/iso-date.schema.js';
import { toDateOnly } from '../../shared/utils/date.js';
import type { PeriodDateRangeRow } from './days-off.types.js';

// Valida el identificador de período recibido como parámetro de ruta.
export const daysOffPeriodIdSchema = z.object({
  periodId: positiveIdSchema('El ID del período no es válido.'),
});

// Valida los datos necesarios para crear un día libre o un intervalo sin clases.
export const createDayOffSchema = z
  .object({
    name: z
      .string({ error: 'El nombre es obligatorio.' })
      .trim()
      .min(1, { error: 'El nombre es obligatorio.' })
      .max(60, { error: 'El nombre debe tener máximo 60 caracteres.' }),

    startDate: isoDateSchema(
      'La fecha de inicio es obligatoria.',
      'La fecha de inicio no es válida.',
    ),

    endDate: isoDateSchema(
      'La fecha de término es obligatoria.',
      'La fecha de término no es válida.',
    ),

    notes: z
      .string()
      .trim()
      .max(150, { error: 'Las notas deben tener máximo 150 caracteres.' })
      .nullable()
      .optional()
      .transform((value) => value || null),
  })
  .superRefine((value, context) => {
    if (value.startDate > value.endDate) {
      context.addIssue({
        code: 'custom',
        path: ['endDate'],
        message: 'La fecha de término no puede ser anterior a la fecha de inicio.',
      });
    }
  });

export type CreateDayOffInput = z.infer<typeof createDayOffSchema>;

// Valida que el intervalo sin clases esté contenido en el período académico.
export function parseDayOffForPeriod(
  input: unknown,
  period: PeriodDateRangeRow,
): CreateDayOffInput {
  const dayOff = createDayOffSchema.parse(input);
  const periodStart = toDateOnly(period.start_date);
  const periodEnd = toDateOnly(period.end_date);

  if (dayOff.startDate < periodStart || dayOff.endDate > periodEnd) {
    throw new z.ZodError([
      {
        code: 'custom',
        path: ['startDate'],
        message: 'Las fechas del descanso deben estar dentro del período académico.',
      },
    ]);
  }

  return dayOff;
}
