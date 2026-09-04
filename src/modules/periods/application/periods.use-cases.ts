import type { CreateSubjectInput, PeriodInput } from '../periods.schemas.js';
import { parseSubjectForPeriod } from '../periods.schemas.js';
import { toClassDto, toPeriodDto, toSubjectDto } from '../periods.mapper.js';
import { PgPeriodsRepository } from '../infrastructure/pg-periods.repository.js';

export class PeriodsUseCases {
  // Recibe el repositorio que proporciona acceso a los datos de períodos.
  constructor(
    private readonly periods: PgPeriodsRepository
  ) {}

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

  // Comprueba la propiedad del período y lista sus materias en formato público.
  async listSubjects(userId: number, periodId: number) {
    await this.periods.getOwnedPeriod(periodId, userId);

    const subjects = await this.periods.listSubjects(periodId);

    return subjects.map(toSubjectDto);
  }

  // Comprueba la propiedad del período y lista las clases de sus materias.
  async listClasses(userId: number, periodId: number) {
    await this.periods.getOwnedPeriod(periodId, userId);

    const classes = await this.periods.listClasses(periodId);

    return classes.map(toClassDto);
  }

  // Crea una materia y sus clases de forma atómica después de validar sus fechas contra el período.
  async createSubject(userId: number, periodId: number, payload: unknown) {
    return this.periods.withTransaction(
      async (client) => {
        const period = await this.periods.getOwnedPeriod(periodId, userId, client);

        const input: CreateSubjectInput = parseSubjectForPeriod(payload, period);

        const subject = await this.periods.createSubject(periodId, input, client);

        await this.periods.createClasses(subject.id, input.classes, client);

        const classes = input.classes.length
          ? input.classes.map(toClassDto)
          : undefined;

        return {
          subject: toSubjectDto(subject),
          classes
        };
      }
    );
  }
}
