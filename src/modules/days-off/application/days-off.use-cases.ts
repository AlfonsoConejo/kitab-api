import { toDayOffDto } from '../days-off.mapper.js';
import { parseDayOffForPeriod } from '../days-off.schemas.js';
import { PgDaysOffRepository } from '../infrastructure/pg-days-off.repository.js';

export class DaysOffUseCases {
  constructor(private readonly daysOff: PgDaysOffRepository) {}

  // Comprueba la propiedad del período y devuelve sus días libres.
  async listByPeriod(userId: number, periodId: number) {
    await this.daysOff.getOwnedPeriod(periodId, userId);

    const daysOff = await this.daysOff.listByPeriod(periodId);

    return daysOff.map(toDayOffDto);
  }

  // Crea un día libre después de validarlo contra el rango del período.
  async create(userId: number, periodId: number, payload: unknown) {
    const period = await this.daysOff.getOwnedPeriod(periodId, userId);
    const input = parseDayOffForPeriod(payload, period);
    const dayOff = await this.daysOff.create(periodId, input);

    return toDayOffDto(dayOff);
  }
}
