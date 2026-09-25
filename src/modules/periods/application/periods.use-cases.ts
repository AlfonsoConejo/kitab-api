import type {
  CalendarEventsQuery,
  PeriodInput,
} from '../periods.schemas.js';
import { toPeriodDto } from '../periods.mapper.js';
import type { PeriodsRepository } from './periods.repository.js';
import { PgDaysOffRepository } from '../../days-off/infrastructure/pg-days-off.repository.js';
import { toDayOffDto } from '../../days-off/days-off.mapper.js';
import { buildCalendarEvents } from './calendar-events.service.js';

export class PeriodsUseCases {
  // Repositorios utilizados por los casos de uso.
  private readonly periods: PeriodsRepository;
  private readonly daysOff: PgDaysOffRepository;

  // Recibe los repositorios que proporcionan acceso a los datos.
  constructor(
    periods: PeriodsRepository,
    daysOff: PgDaysOffRepository = new PgDaysOffRepository(),
  ) {
    this.periods = periods;
    this.daysOff = daysOff;
  }

  // Crea un período y lo transforma al formato público de la API.
  async createPeriod(userId: number, input: PeriodInput) {
    const createdPeriod = await this.periods.createPeriod(input, userId);

    return toPeriodDto(createdPeriod);
  }

  // Obtiene y transforma todos los períodos del usuario autenticado.
  async listPeriods(userId: number) {
    const periods = await this.periods.listPeriods(userId); 

    return periods.map(toPeriodDto);
  }

  // Obtiene un período del usuario autenticado y lo transforma a DTO.
  async getPeriod(userId: number, periodId: number) {
    const period = await this.periods.getOwnedPeriod(periodId, userId);

    return toPeriodDto(period);
  }

  // Comprueba la propiedad, actualiza un período y devuelve su DTO actualizado.
  async updatePeriod(userId: number, periodId: number, input: PeriodInput) {
    await this.periods.getOwnedPeriod(periodId, userId);

    const updatedPeriod = await this.periods.updatePeriod(periodId, input);

    if (!updatedPeriod) {
      return null;
    }

    return toPeriodDto(updatedPeriod);
  }

  // Comprueba la propiedad y elimina un período del usuario autenticado.
  async deletePeriod(userId: number, periodId: number) {
    await this.periods.getOwnedPeriod(periodId, userId);

    await this.periods.deletePeriod(periodId);
  }

  // Devuelve ocurrencias de clases y descansos resueltos para el rango solicitado.
  async listCalendarEvents(
    userId: number,
    periodId: number,
    range: CalendarEventsQuery,
  ) {
    const period = await this.periods.getOwnedPeriod(periodId, userId);
    const [classes, daysOff] = await Promise.all([
      this.periods.listCalendarClasses(periodId),
      this.daysOff.listByPeriod(periodId),
    ]);

    return buildCalendarEvents({
      period,
      classes,
      breaks: daysOff.map(toDayOffDto),
      range,
    });
  }

}
