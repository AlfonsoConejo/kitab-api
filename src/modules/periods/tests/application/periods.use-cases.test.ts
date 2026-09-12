import { describe, expect, it, vi } from 'vitest';
import { PeriodsUseCases } from '../../application/periods.use-cases.js';
import type { PeriodsRepository } from '../../application/periods.repository.js';
import type { PeriodInput } from '../../periods.schemas.js';
import type { PeriodRow } from '../../periods.types.js';

describe('PeriodsUseCases.createPeriod', () => {
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

    const repository = {
      createPeriod: vi.fn().mockResolvedValue(createdPeriod),
    } as unknown as PeriodsRepository;

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
});