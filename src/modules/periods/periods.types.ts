export interface PeriodRow {
  id: number;
  name: string;
  start_date: string | Date;
  end_date: string | Date;
  color: string;
  user_id: number;
  created_at: Date | string;
}

export interface PeriodDto {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  color: string;
  userId: number;
  createdAt: Date | string;
}
