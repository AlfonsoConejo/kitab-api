import { z } from 'zod';

// Crea un esquema para IDs positivos, conservando un mensaje propio de cada recurso.
export function positiveIdSchema(message: string) {
  return z.coerce
    .number({ error: message })
    .int(message)
    .positive(message);
}
