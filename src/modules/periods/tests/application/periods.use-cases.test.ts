import { describe, expect, it, vi } from 'vitest';
import { PeriodsUseCases } from '../../application/periods.use-cases.js';
import type { PeriodInput } from '../../periods.schemas.js';
import type { PeriodRow } from '../../periods.types.js';
import { createPeriodsRepositoryMock } from '../periods.repository.mock.js';
import { PeriodNotFoundError } from '../../periods.errors.js';

describe('Pruebas de los casos de uso de períodos', () => {
  it('crea un período y devuelve su DTO', async () => {
    const input: PeriodInput = {
      name: 'Agosto-Diciembre 2026',
      startDate: '2026-08-01',
      endDate: '2026-12-15',
      color: '#2563EB',
    };

    const createdPeriod: PeriodRow = {
      id: 1,
      name: input.name,
      start_date: input.startDate,
      end_date: input.endDate,
      color: input.color,
      user_id: 10,
      created_at: '2026-08-01T00:00:00.000Z',
    };

    const repository = createPeriodsRepositoryMock({
      createPeriod: vi.fn().mockResolvedValue(createdPeriod),
    });

    const useCases = new PeriodsUseCases(repository);

    const result = await useCases.createPeriod(10, input);

    expect(repository.createPeriod).toHaveBeenCalledWith(input, 10);

    expect(result).toEqual({
      id: 1,
      name: 'Agosto-Diciembre 2026',
      startDate: '2026-08-01',
      endDate: '2026-12-15',
      color: '#2563EB',
      userId: 10,
      createdAt: '2026-08-01T00:00:00.000Z',
    });
  });

  it('recupera los períodos del usuario y devuelve sus DTOs', async () => {
    const retrievedPeriods: PeriodRow[] = [
        {
        id: 2,
        name: "Ciencias naturales 2026",
        start_date: "2026-08-01",
        end_date: "2026-12-15",
        color: "#2251b6",
        user_id: 100,
        created_at: '2026-08-01T00:00:00.000Z',
      },
      {
        id: 3,
        name: "Matemáticas 2026",
        start_date: "2026-08-01",
        end_date: "2026-12-15",
        color: "#dc2626",
        user_id: 100,
        created_at: '2026-08-01T00:00:00.000Z',
      }
    ];

    const repository = createPeriodsRepositoryMock({
      listPeriods: vi.fn().mockResolvedValue(retrievedPeriods),
    });

    const useCases = new PeriodsUseCases(repository);

    const result = await useCases.listPeriods(100);

    expect(repository.listPeriods).toHaveBeenCalledWith(100);

    expect(result).toEqual(
      [{
      id: 2,
      name: "Ciencias naturales 2026",
      startDate: "2026-08-01",
      endDate: "2026-12-15",
      color: "#2251b6",
      userId: 100 ,
      createdAt: '2026-08-01T00:00:00.000Z',
    }, {
      id: 3,
      name: "Matemáticas 2026",
      startDate: "2026-08-01",
      endDate: "2026-12-15",
      color: "#dc2626",
      userId: 100 ,
      createdAt: '2026-08-01T00:00:00.000Z',
    }]);
  });

  it('devuelve un arreglo vacío cuando el usuario no tiene períodos', async () => {
    const repository = createPeriodsRepositoryMock({
      listPeriods: vi.fn().mockResolvedValue([]),
    });

    const useCases = new PeriodsUseCases(repository);

    const result = await useCases.listPeriods(100);

    expect(repository.listPeriods).toHaveBeenCalledWith(100);

    expect(result).toEqual([]);
  });

  it('recupera un periodo del usuario y devuelve su DTO', async () => {
    const retrievedPeriod: PeriodRow = {
      id: 12,
      name: "Matemáticas 2026",
      start_date: "2026-08-01",
      end_date: "2026-12-15",
      color: "#dc2626",
      user_id: 100,
      created_at: '2026-08-01T00:00:00.000Z',
    };

    const repository = createPeriodsRepositoryMock({
      getOwnedPeriod: vi.fn().mockResolvedValue(retrievedPeriod),
    });

    const useCases = new PeriodsUseCases(repository);

    const result = await useCases.getPeriod(100, 12);

    expect(repository.getOwnedPeriod).toHaveBeenCalledWith(12, 100);

    expect(result).toEqual(
      {
      id: 12,
      name: "Matemáticas 2026",
      startDate: "2026-08-01",
      endDate: "2026-12-15",
      color: "#dc2626",
      userId: 100 ,
      createdAt: '2026-08-01T00:00:00.000Z',
    });
  });

  it('actualiza un periodo y obtener su DTO actualizado', async () => {
    const input: PeriodInput = {
      name: 'Agosto-Diciembre 2026',
      startDate: '2026-08-01',
      endDate: '2026-12-15',
      color: '#2563EB',
    };

    const updatedPeriod: PeriodRow = {
      id: 12,
      name: input.name,
      start_date: input.startDate,
      end_date: input.endDate,
      color: input.color,
      user_id: 100,
      created_at: '2026-08-01T00:00:00.000Z',
    };

    const repository = createPeriodsRepositoryMock({
      getOwnedPeriod: vi.fn().mockResolvedValue(updatedPeriod),
      updatePeriod: vi.fn().mockResolvedValue(updatedPeriod),
    });
    
    const useCases = new PeriodsUseCases(repository);

    const result = await useCases.updatePeriod(100, 12, input);

    expect(repository.getOwnedPeriod).toHaveBeenCalledWith(12, 100);
    expect(repository.updatePeriod).toHaveBeenCalledWith(12, input);

    expect(result).toEqual(
      {
      id: 12,
      name: input.name,
      startDate: input.startDate,
      endDate: input.endDate,
      color: input.color,
      userId: 100,
      createdAt: '2026-08-01T00:00:00.000Z',
    });
  });

  it('no actualiza el período si no pertenece al usuario', async () => {
    const input: PeriodInput = {
      name: 'Agosto-Diciembre 2026',
      startDate: '2026-08-01',
      endDate: '2026-12-15',
      color: '#2563EB',
    };

    const repository = createPeriodsRepositoryMock({
      getOwnedPeriod: vi.fn().mockRejectedValue(
        new PeriodNotFoundError(),
      ),
    });

    const useCases = new PeriodsUseCases(repository);

    await expect(
      useCases.updatePeriod(100, 12, input),
    ).rejects.toBeInstanceOf(PeriodNotFoundError);

    expect(repository.getOwnedPeriod)
      .toHaveBeenCalledWith(12, 100);

    expect(repository.updatePeriod)
      .not.toHaveBeenCalled();
  });

  it('actualiza un periodo que no devuelve nada', async () => {
    const input: PeriodInput = {
      name: 'Agosto-Diciembre 2026',
      startDate: '2026-08-01',
      endDate: '2026-12-15',
      color: '#2563EB',
    };

    const ownedPeriod: PeriodRow = {
      id: 12,
      name: input.name,
      start_date: input.startDate,
      end_date: input.endDate,
      color: input.color,
      user_id: 100,
      created_at: '2026-08-01T00:00:00.000Z',
    };

    const repository = createPeriodsRepositoryMock({
      getOwnedPeriod: vi.fn().mockResolvedValue(ownedPeriod),
      updatePeriod: vi.fn().mockResolvedValue(null),
    });
    
    const useCases = new PeriodsUseCases(repository);

    const result = await useCases.updatePeriod(100, 12, input);

    expect(repository.getOwnedPeriod).toHaveBeenCalledWith(12, 100);
    expect(repository.updatePeriod).toHaveBeenCalledWith(12, input);

    expect(result).toBeNull();
  });

  it('elimina un período del usuario', async () => {
    const ownedPeriod: PeriodRow = {
      id: 12,
      name: 'Matemáticas 2026',
      start_date: '2026-08-01',
      end_date: '2026-12-15',
      color: '#dc2626',
      user_id: 100,
      created_at: '2026-08-01T00:00:00.000Z',
    };

    const repository = createPeriodsRepositoryMock({
      getOwnedPeriod: vi.fn().mockResolvedValue(ownedPeriod),
      deletePeriod: vi.fn().mockResolvedValue(undefined),
    });

    const useCases = new PeriodsUseCases(repository);

    const result = await useCases.deletePeriod(100, 12);

    expect(repository.getOwnedPeriod).toHaveBeenCalledWith(12, 100);
    expect(repository.deletePeriod).toHaveBeenCalledWith(12);

    expect(result).toBeUndefined();
  });

  it('no elimina el período si no pertenece al usuario', async () => {
    const repository = createPeriodsRepositoryMock({
      getOwnedPeriod: vi.fn().mockRejectedValue(
        new PeriodNotFoundError(),
      ),
    });

    const useCases = new PeriodsUseCases(repository);

    await expect(
      useCases.deletePeriod(100, 12),
    ).rejects.toBeInstanceOf(PeriodNotFoundError);

    expect(repository.getOwnedPeriod)
      .toHaveBeenCalledWith(12, 100);

    expect(repository.deletePeriod)
      .not.toHaveBeenCalled();
  });
});
