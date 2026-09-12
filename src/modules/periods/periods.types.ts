import type { ClassMode, ClassType } from '../subjects/subjects.types.js';

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

export interface CalendarClassRow {
  id: number;
  subject_id: number;
  subject_name: string;
  subject_color: string;
  subject_start_date: string | Date;
  subject_end_date: string | Date;
  days: number[];
  start_time: string;
  end_time: string;
  mode: ClassMode;
  classroom: string | null;
  type: ClassType;
}
