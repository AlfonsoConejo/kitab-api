import { z } from 'zod';
import { isoDateSchema } from '../../shared/validation/iso-date.schema.js';
import { positiveIdSchema } from '../../shared/validation/positive-id.schema.js';

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
  periodId: positiveIdSchema('El ID del período no es válido.')
});

export const calendarEventsQuerySchema = z
  .object({
    startDate: isoDateSchema(
      'La fecha inicial es obligatoria.',
      'La fecha inicial no es válida.',
    ),
    endDate: isoDateSchema(
      'La fecha final es obligatoria.',
      'La fecha final no es válida.',
    ),
  })
  .superRefine((value, context) => {
    if (value.startDate > value.endDate) {
      context.addIssue({
        code: 'custom',
        path: ['endDate'],
        message: 'La fecha final no puede ser anterior a la fecha inicial.',
      });
    }
  });

export type CalendarEventsQuery = z.infer<typeof calendarEventsQuerySchema>;

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

    startDate: isoDateSchema(
      'La fecha de inicio es obligatoria.',
      'Formato de fecha inválido.'
    ),

    endDate: isoDateSchema(
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

export type PeriodInput = z.infer<typeof periodSchema>;
