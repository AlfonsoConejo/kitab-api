import { z } from 'zod';

// Crea un esquema para una fecha calendario válida en formato YYYY-MM-DD.
export function isoDateSchema(requiredMessage: string, invalidMessage: string) {
  return z.string({ error: requiredMessage })
    .trim()
    .min(1, { error: requiredMessage })
    .regex(/^\d{4}-\d{2}-\d{2}$/, { error: invalidMessage })
    .refine((value) => {
      const [year, month, day] = value.split('-').map(Number);
      const date = new Date(Date.UTC(year, month - 1, day));

      return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
    }, { error: invalidMessage });
}
