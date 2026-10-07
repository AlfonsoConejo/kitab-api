import { describe, expect, it } from 'vitest';
import { toSubjectDto, toClassDto, toSubjectRecord } from '../subjects.mapper';

describe('subjects mapper', () => {
  it('convierte una fila de PostgreSQL al DTO público de subject', () => {
    const result = toSubjectDto({
      id: 10,
      period_id: 12,
      name: '  Math  ',
      teacher: '  Taylor Swift  ',
      color: '#3B82F6',
      start_date: new Date('2026-08-15T00:00:00.000Z'),
      end_date: new Date('2026-12-15T00:00:00.000Z'),
      created_at: '2026-08-01T00:00:00.000Z',
      updated_at: '2026-08-02T00:00:00.000Z',
    });

    expect(result).toEqual({
      id: 10,
      periodId: 12,
      name: 'Math',
      teacher: 'Taylor Swift',
      color: '#3B82F6',
      startDate: '2026-08-15',
      endDate: '2026-12-15',
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-02T00:00:00.000Z',
    });
  });

  it('convierte una fila de PostgreSQL al DTO público de class', () => {
    const result = toClassDto({
      id: 25,
      subject_id: 10,
      subject_name: 'Math',
      days: [1, 3],
      start_time: '08:30:00',
      end_time: '10:00:00',
      mode: 'online',
      classroom: 'A-13',
      type: 'theory',
    });

    expect(result).toEqual({
      id: 25,
      subjectId: 10,
      subjectName: 'Math',
      days: [1, 3],
      startTime: '08:30',
      endTime: '10:00',
      mode: 'online',
      classroom: 'A-13',
      type: 'theory',
    });
  });

  it('convierte el input de subject al registro con nombres de PostgreSQL', () => {
    const result = toSubjectRecord({
      name: 'Math',
      teacher: 'Taylor Swift',
      color: '#FFFFFF',
      startDate: '2026-08-15',
      endDate: '2026-12-15',
    });

    expect(result).toEqual({
      name: 'Math',
      teacher: 'Taylor Swift',
      color: '#FFFFFF',
      start_date: '2026-08-15',
      end_date: '2026-12-15',
    });
  });
});