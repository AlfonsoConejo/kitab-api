export type DayOffType = 'day_off' | 'vacation';

export interface DayOffRow {
  id: number;
  period_id: number;
  name: string;
  type: DayOffType;
  start_date: string | Date;
  end_date: string | Date;
  notes: string | null;
  created_at: string | Date;
  updated_at: string | Date;
}

export interface DayOffDto {
  id: number;
  periodId: number;
  name: string;
  type: DayOffType;
  startDate: string;
  endDate: string;
  notes: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface PeriodDateRangeRow {
  start_date: string | Date;
  end_date: string | Date;
}

/** Descanso perteneciente al usuario junto con el rango de su período. */
export interface OwnedDayOffRow extends DayOffRow {
  period_start_date: string | Date;
  period_end_date: string | Date;
}
