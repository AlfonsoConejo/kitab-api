import { describe, expect, it, vi } from 'vitest';
import { DaysOffUseCases } from '../../application/days-off.use-cases.js';
import { DayOffNotFoundError, DayOffPeriodNotFoundError } from '../../days-off.errors.js';
import type { DayOffRow, OwnedDayOffRow, PeriodDateRangeRow } from '../../days-off.types.js';
import { createDaysOffRepositoryMock } from '../days-off.repository.mock.js';

const period: PeriodDateRangeRow = {
  start_date: '2026-08-01',
  end_date: '2026-12-15',
};

const dayOff: DayOffRow = {
  id: 25,
  period_id: 12,
  name: 'Consejo técnico',
  type: 'day_off',
  start_date: '2026-09-10',
  end_date: '2026-09-10',
  notes: null,
  created_at: '2026-08-01T00:00:00.000Z',
  updated_at: '2026-08-01T00:00:00.000Z',
};

const ownedDayOff: OwnedDayOffRow = {
  ...dayOff,
  period_start_date: period.start_date,
  period_end_date: period.end_date,
};

const validPayload = {
  name: 'Consejo técnico',
  type: 'day_off',
  startDate: '2026-09-10',
  endDate: '2026-09-10',
  notes: null,
};

describe('DaysOffUseCases', () => {
  it('lista los descansos después de comprobar la propiedad del período', async () => {
    const repository = createDaysOffRepositoryMock({
      getOwnedPeriod: vi.fn().mockResolvedValue(period),
      listByPeriod: vi.fn().mockResolvedValue([dayOff]),
    });
    const useCases = new DaysOffUseCases(repository);

    await expect(useCases.listByPeriod(100, 12)).resolves.toEqual([toExpectedDto(dayOff)]);
    expect(repository.getOwnedPeriod).toHaveBeenCalledWith(12, 100);
    expect(repository.listByPeriod).toHaveBeenCalledWith(12);
  });

  it('crea un descanso validado contra el rango del período', async () => {
    const repository = createDaysOffRepositoryMock({
      getOwnedPeriod: vi.fn().mockResolvedValue(period),
      create: vi.fn().mockResolvedValue(dayOff),
    });
    const useCases = new DaysOffUseCases(repository);

    await expect(useCases.create(100, 12, validPayload)).resolves.toEqual(toExpectedDto(dayOff));
    expect(repository.create).toHaveBeenCalledWith(12, validPayload);
  });

  it('no crea un descanso fuera del rango del período', async () => {
    const repository = createDaysOffRepositoryMock({
      getOwnedPeriod: vi.fn().mockResolvedValue(period),
    });
    const useCases = new DaysOffUseCases(repository);

    await expect(useCases.create(100, 12, {
      ...validPayload,
      type: 'vacation',
      endDate: '2026-12-16',
    })).rejects.toThrow('Las fechas del descanso deben estar dentro del período académico.');
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('obtiene un descanso por su ID y comprueba su propietario', async () => {
    const repository = createDaysOffRepositoryMock({
      getOwnedDayOff: vi.fn().mockResolvedValue(ownedDayOff),
    });
    const useCases = new DaysOffUseCases(repository);

    await expect(useCases.getById(100, 25)).resolves.toEqual(toExpectedDto(dayOff));
    expect(repository.getOwnedDayOff).toHaveBeenCalledWith(25, 100);
  });

  it('propaga la ausencia o falta de propiedad del descanso', async () => {
    const repository = createDaysOffRepositoryMock({
      getOwnedDayOff: vi.fn().mockRejectedValue(new DayOffNotFoundError()),
    });
    const useCases = new DaysOffUseCases(repository);

    await expect(useCases.getById(100, 25)).rejects.toBeInstanceOf(DayOffNotFoundError);
  });

  it('infiere el período del descanso para validar y actualizarlo', async () => {
    const updatedDayOff = { ...dayOff, name: 'Vacaciones', type: 'vacation' as const };
    const payload = {
      name: 'Vacaciones',
      type: 'vacation',
      startDate: '2026-12-01',
      endDate: '2026-12-10',
      notes: null,
    };
    const repository = createDaysOffRepositoryMock({
      getOwnedDayOff: vi.fn().mockResolvedValue(ownedDayOff),
      updateById: vi.fn().mockResolvedValue(updatedDayOff),
    });
    const useCases = new DaysOffUseCases(repository);

    await expect(useCases.update(100, 25, payload)).resolves.toEqual(toExpectedDto(updatedDayOff));
    expect(repository.getOwnedDayOff).toHaveBeenCalledWith(25, 100);
    expect(repository.updateById).toHaveBeenCalledWith(25, payload);
  });

  it('no actualiza si las fechas quedan fuera del período inferido', async () => {
    const repository = createDaysOffRepositoryMock({
      getOwnedDayOff: vi.fn().mockResolvedValue(ownedDayOff),
    });
    const useCases = new DaysOffUseCases(repository);

    await expect(useCases.update(100, 25, {
      ...validPayload,
      type: 'vacation',
      endDate: '2026-12-16',
    })).rejects.toThrow('Las fechas del descanso deben estar dentro del período académico.');
    expect(repository.updateById).not.toHaveBeenCalled();
  });

  it('comprueba la propiedad inferida antes de eliminar', async () => {
    const repository = createDaysOffRepositoryMock({
      getOwnedDayOff: vi.fn().mockResolvedValue(ownedDayOff),
      deleteById: vi.fn().mockResolvedValue(undefined),
    });
    const useCases = new DaysOffUseCases(repository);

    await expect(useCases.delete(100, 25)).resolves.toBeUndefined();
    expect(repository.getOwnedDayOff).toHaveBeenCalledWith(25, 100);
    expect(repository.deleteById).toHaveBeenCalledWith(25);
  });

  it('detiene las operaciones de colección si el período no pertenece al usuario', async () => {
    const repository = createDaysOffRepositoryMock({
      getOwnedPeriod: vi.fn().mockRejectedValue(new DayOffPeriodNotFoundError()),
    });
    const useCases = new DaysOffUseCases(repository);

    await expect(useCases.listByPeriod(100, 12)).rejects.toBeInstanceOf(DayOffPeriodNotFoundError);
    expect(repository.listByPeriod).not.toHaveBeenCalled();
  });
});

function toExpectedDto(row: DayOffRow) {
  return {
    id: row.id,
    periodId: row.period_id,
    name: row.name,
    type: row.type,
    startDate: row.start_date,
    endDate: row.end_date,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

