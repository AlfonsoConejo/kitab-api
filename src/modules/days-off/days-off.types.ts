export interface DayOffRow {
  id: number;
  period_id: number;
  name: string;
  start_date: string | Date;
  end_date: string | Date;
  notes: string | null;
  created_at: string | Date;
  updated_at: string | Date;
}

export interface DayOffDto {
  id: number;
  periodId: number;
  name: string | null;
  startDate: string;
  endDate: string;
  notes: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}
