import { toDayOffDto } from '../days-off.mapper.js';
import { PgDaysOffRepository } from '../infrastructure/pg-days-off.repository.js';

export class DaysOffUseCases {
  constructor(private readonly daysOff: PgDaysOffRepository) {}

  // Comprueba la propiedad del período y devuelve sus días libres.
  async listByPeriod(userId: number, periodId: number) {
    await this.daysOff.ensureOwnedPeriod(periodId, userId);

    const daysOff = await this.daysOff.listByPeriod(periodId);

    return daysOff.map(toDayOffDto);
  }
}
