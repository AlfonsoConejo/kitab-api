import { describe, expect, it, vi } from 'vitest';
import { DaysOffUseCases } from '../../application/days-off.use-cases.js';
import { DayOffNotFoundError, DayOffPeriodNotFoundError } from '../../days-off.errors.js';
import type { DayOffRow, PeriodDateRangeRow } from '../../days-off.types.js';
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

const validPayload = {
  name: 'Consejo técnico',
  type: 'day_off',
  startDate: '2026-09-10',
  endDate: '2026-09-10',
  notes: null,
};

describe('DaysOffUseCases', () => {
  it('lista los descansos del período y los transforma a DTO', async () => {
    const repository = createDaysOffRepositoryMock({
      getOwnedPeriod: vi.fn().mockResolvedValue(period),
      listByPeriod: vi.fn().mockResolvedValue([dayOff]),
    });
    const useCases = new DaysOffUseCases(repository);

    const result = await useCases.listByPeriod(100, 12);

    expect(repository.getOwnedPeriod).toHaveBeenCalledWith(12, 100);
    expect(repository.listByPeriod).toHaveBeenCalledWith(12);
    expect(result).toEqual([toExpectedDto(dayOff)]);
  });

  it('devuelve un arreglo vacío cuando el período no tiene descansos', async () => {
    const repository = createDaysOffRepositoryMock({
      getOwnedPeriod: vi.fn().mockResolvedValue(period),
      listByPeriod: vi.fn().mockResolvedValue([]),
    });
    const useCases = new DaysOffUseCases(repository);

    const result = await useCases.listByPeriod(100, 12);

    expect(repository.listByPeriod).toHaveBeenCalledWith(12);
    expect(result).toEqual([]);
  });

  it('obtiene un descanso del período y lo transforma a DTO', async () => {
    const repository = createDaysOffRepositoryMock({
      getOwnedPeriod: vi.fn().mockResolvedValue(period),
      getByIdAndPeriod: vi.fn().mockResolvedValue(dayOff),
    });
    const useCases = new DaysOffUseCases(repository);

    const result = await useCases.getById(100, 12, 25);

    expect(repository.getOwnedPeriod).toHaveBeenCalledWith(12, 100);
    expect(repository.getByIdAndPeriod).toHaveBeenCalledWith(25, 12);
    expect(result).toEqual(toExpectedDto(dayOff));
  });

  it('crea un descanso validado dentro del período y devuelve su DTO', async () => {
    const repository = createDaysOffRepositoryMock({
      getOwnedPeriod: vi.fn().mockResolvedValue(period),
      create: vi.fn().mockResolvedValue(dayOff),
    });
    const useCases = new DaysOffUseCases(repository);

    const result = await useCases.create(100, 12, validPayload);

    expect(repository.getOwnedPeriod).toHaveBeenCalledWith(12, 100);
    expect(repository.create).toHaveBeenCalledWith(12, validPayload);
    expect(result).toEqual(toExpectedDto(dayOff));
  });

  it('aplica los valores por defecto antes de crear un descanso', async () => {
    const repository = createDaysOffRepositoryMock({
      getOwnedPeriod: vi.fn().mockResolvedValue(period),
      create: vi.fn().mockResolvedValue(dayOff),
    });
    const useCases = new DaysOffUseCases(repository);
    const payload = {
      name: 'Consejo técnico',
      startDate: '2026-09-10',
      endDate: '2026-09-10',
    };

    await useCases.create(100, 12, payload);

    expect(repository.create).toHaveBeenCalledWith(12, {
      ...payload,
      type: 'day_off',
      notes: null,
    });
  });

  it('no crea un descanso si el período no pertenece al usuario', async () => {
    const repository = createDaysOffRepositoryMock({
      getOwnedPeriod: vi.fn().mockRejectedValue(new DayOffPeriodNotFoundError()),
    });
    const useCases = new DaysOffUseCases(repository);

    await expect(useCases.create(100, 12, validPayload))
      .rejects.toBeInstanceOf(DayOffPeriodNotFoundError);

    expect(repository.create).not.toHaveBeenCalled();
  });

  it('no crea un descanso con fechas fuera del período', async () => {
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

  it('actualiza un descanso validado dentro del período y devuelve su DTO', async () => {
    const updatedDayOff: DayOffRow = {
      ...dayOff,
      name: 'Vacaciones de invierno',
      type: 'vacation',
      start_date: '2026-12-01',
      end_date: '2026-12-10',
      notes: 'Sin clases',
    };
    const payload = {
      name: 'Vacaciones de invierno',
      type: 'vacation',
      startDate: '2026-12-01',
      endDate: '2026-12-10',
      notes: 'Sin clases',
    };
    const repository = createDaysOffRepositoryMock({
      getOwnedPeriod: vi.fn().mockResolvedValue(period),
      updateByIdAndPeriod: vi.fn().mockResolvedValue(updatedDayOff),
    });
    const useCases = new DaysOffUseCases(repository);

    const result = await useCases.update(100, 12, 25, payload);

    expect(repository.updateByIdAndPeriod).toHaveBeenCalledWith(25, 12, payload);
    expect(result).toEqual(toExpectedDto(updatedDayOff));
  });

  it('no actualiza un descanso si el payload es inválido', async () => {
    const repository = createDaysOffRepositoryMock({
      getOwnedPeriod: vi.fn().mockResolvedValue(period),
    });
    const useCases = new DaysOffUseCases(repository);

    await expect(useCases.update(100, 12, 25, {
      ...validPayload,
      endDate: '2026-09-11',
    })).rejects.toThrow('Un día libre debe iniciar y terminar en la misma fecha.');

    expect(repository.updateByIdAndPeriod).not.toHaveBeenCalled();
  });

  it('no actualiza un descanso con fechas fuera del período', async () => {
    const repository = createDaysOffRepositoryMock({
      getOwnedPeriod: vi.fn().mockResolvedValue(period),
    });
    const useCases = new DaysOffUseCases(repository);

    await expect(useCases.update(100, 12, 25, {
      ...validPayload,
      type: 'vacation',
      endDate: '2026-12-16',
    })).rejects.toThrow('Las fechas del descanso deben estar dentro del período académico.');

    expect(repository.updateByIdAndPeriod).not.toHaveBeenCalled();
  });

  it('no actualiza un descanso si el período no pertenece al usuario', async () => {
    const repository = createDaysOffRepositoryMock({
      getOwnedPeriod: vi.fn().mockRejectedValue(new DayOffPeriodNotFoundError()),
    });
    const useCases = new DaysOffUseCases(repository);

    await expect(useCases.update(100, 12, 25, validPayload))
      .rejects.toBeInstanceOf(DayOffPeriodNotFoundError);

    expect(repository.updateByIdAndPeriod).not.toHaveBeenCalled();
  });

  it('propaga el error cuando el descanso a actualizar no pertenece al período', async () => {
    const repository = createDaysOffRepositoryMock({
      getOwnedPeriod: vi.fn().mockResolvedValue(period),
      updateByIdAndPeriod: vi.fn().mockRejectedValue(new DayOffNotFoundError()),
    });
    const useCases = new DaysOffUseCases(repository);

    await expect(useCases.update(100, 12, 25, validPayload))
      .rejects.toBeInstanceOf(DayOffNotFoundError);
  });

  it('elimina un descanso del período', async () => {
    const repository = createDaysOffRepositoryMock({
      getOwnedPeriod: vi.fn().mockResolvedValue(period),
      deleteByIdAndPeriod: vi.fn().mockResolvedValue(undefined),
    });
    const useCases = new DaysOffUseCases(repository);

    await expect(useCases.delete(100, 12, 25)).resolves.toBeUndefined();

    expect(repository.getOwnedPeriod).toHaveBeenCalledWith(12, 100);
    expect(repository.deleteByIdAndPeriod).toHaveBeenCalledWith(25, 12);
  });

  it('no elimina un descanso si el período no pertenece al usuario', async () => {
    const repository = createDaysOffRepositoryMock({
      getOwnedPeriod: vi.fn().mockRejectedValue(new DayOffPeriodNotFoundError()),
    });
    const useCases = new DaysOffUseCases(repository);

    await expect(useCases.delete(100, 12, 25))
      .rejects.toBeInstanceOf(DayOffPeriodNotFoundError);

    expect(repository.deleteByIdAndPeriod).not.toHaveBeenCalled();
  });

  it('detiene la operación cuando el período no pertenece al usuario', async () => {
    const repository = createDaysOffRepositoryMock({
      getOwnedPeriod: vi.fn().mockRejectedValue(new DayOffPeriodNotFoundError()),
    });
    const useCases = new DaysOffUseCases(repository);

    await expect(useCases.listByPeriod(100, 12))
      .rejects.toBeInstanceOf(DayOffPeriodNotFoundError);

    expect(repository.listByPeriod).not.toHaveBeenCalled();
  });

  it('propaga el error cuando el descanso no pertenece al período', async () => {
    const repository = createDaysOffRepositoryMock({
      getOwnedPeriod: vi.fn().mockResolvedValue(period),
      getByIdAndPeriod: vi.fn().mockRejectedValue(new DayOffNotFoundError()),
    });
    const useCases = new DaysOffUseCases(repository);

    await expect(useCases.getById(100, 12, 25))
      .rejects.toBeInstanceOf(DayOffNotFoundError);
  });
});

function toExpectedDto(row: DayOffRow) {
  return {
    id: row.id,
    periodId: row.period_id,
    name: row.name,
    type: row.type,
    startDate: typeof row.start_date === 'string'
      ? row.start_date
      : row.start_date.toISOString().slice(0, 10),
    endDate: typeof row.end_date === 'string'
      ? row.end_date
      : row.end_date.toISOString().slice(0, 10),
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
