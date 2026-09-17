import { describe, expect, it } from 'vitest';
import { toDayOffDto, toDayOffRecord } from '../days-off.mapper.js';

describe('days-off mapper', () => {
  it('convierte una fila de PostgreSQL al DTO público', () => {
    const result = toDayOffDto({
      id: 25,
      period_id: 12,
      name: '  Vacaciones de invierno  ',
      type: 'vacation',
      start_date: new Date('2026-12-01T00:00:00.000Z'),
      end_date: new Date('2026-12-10T00:00:00.000Z'),
      notes: '  Sin clases  ',
      created_at: '2026-08-01T00:00:00.000Z',
      updated_at: '2026-08-02T00:00:00.000Z',
    });

    expect(result).toEqual({
      id: 25,
      periodId: 12,
      name: 'Vacaciones de invierno',
      type: 'vacation',
      startDate: '2026-12-01',
      endDate: '2026-12-10',
      notes: 'Sin clases',
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-02T00:00:00.000Z',
    });
  });

  it('convierte notas vacías a null en el DTO público', () => {
    const result = toDayOffDto({
      id: 25,
      period_id: 12,
      name: 'Consejo técnico',
      type: 'day_off',
      start_date: '2026-09-10',
      end_date: '2026-09-10',
      notes: '   ',
      created_at: '2026-08-01T00:00:00.000Z',
      updated_at: '2026-08-01T00:00:00.000Z',
    });

    expect(result.notes).toBeNull();
  });

  it('convierte el input validado al registro con nombres de PostgreSQL', () => {
    const result = toDayOffRecord({
      name: 'Vacaciones de invierno',
      type: 'vacation',
      startDate: '2026-12-01',
      endDate: '2026-12-10',
      notes: 'Sin clases',
    });

    expect(result).toEqual({
      name: 'Vacaciones de invierno',
      type: 'vacation',
      start_date: '2026-12-01',
      end_date: '2026-12-10',
      notes: 'Sin clases',
    });
  });

  it('conserva notas null al convertir el input al registro de PostgreSQL', () => {
    const result = toDayOffRecord({
      name: 'Consejo técnico',
      type: 'day_off',
      startDate: '2026-09-10',
      endDate: '2026-09-10',
      notes: null,
    });

    expect(result).toMatchObject({
      notes: null,
    });
  });
});
