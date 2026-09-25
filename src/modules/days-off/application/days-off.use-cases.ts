import { toDayOffDto } from '../days-off.mapper.js';
import { parseDayOffForPeriod } from '../days-off.schemas.js';
import type { DaysOffRepository } from './days-off.repository.js';

export class DaysOffUseCases {
  constructor(private readonly daysOff: DaysOffRepository) {}

  // Comprueba la propiedad del período y devuelve sus días libres.
  async listByPeriod(userId: number, periodId: number) {
    await this.daysOff.getOwnedPeriod(periodId, userId);

    const daysOff = await this.daysOff.listByPeriod(periodId);

    return daysOff.map(toDayOffDto);
  }

  // Devuelve un descanso solo si su período pertenece al usuario autenticado.
  async getById(userId: number, dayOffId: number) {
    const dayOff = await this.daysOff.getOwnedDayOff(dayOffId, userId);

    return toDayOffDto(dayOff);
  }

  // Crea un día libre después de validarlo contra el rango del período.
  async create(userId: number, periodId: number, payload: unknown) {
    const period = await this.daysOff.getOwnedPeriod(periodId, userId);
    const input = parseDayOffForPeriod(payload, period);
    const dayOff = await this.daysOff.create(periodId, input);

    return toDayOffDto(dayOff);
  }

  // Infiere el período del descanso, valida sus fechas y lo actualiza.
  async update(
    userId: number,
    dayOffId: number,
    payload: unknown,
  ) {
    const dayOff = await this.daysOff.getOwnedDayOff(dayOffId, userId);
    const input = parseDayOffForPeriod(payload, {
      start_date: dayOff.period_start_date,
      end_date: dayOff.period_end_date,
    });
    const updatedDayOff = await this.daysOff.updateById(dayOffId, input);

    return toDayOffDto(updatedDayOff);
  }

  // Comprueba la propiedad inferida del descanso y lo elimina.
  async delete(userId: number, dayOffId: number) {
    await this.daysOff.getOwnedDayOff(dayOffId, userId);
    await this.daysOff.deleteById(dayOffId);
  }
}
