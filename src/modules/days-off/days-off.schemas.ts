import { z } from 'zod';
import { positiveIdSchema } from '../../shared/validation/positive-id.schema.js';

// Valida el identificador de período recibido como parámetro de ruta.
export const daysOffPeriodIdSchema = z.object({
  periodId: positiveIdSchema('El ID del período no es válido.'),
});
