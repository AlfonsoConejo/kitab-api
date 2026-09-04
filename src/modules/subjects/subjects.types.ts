export interface SubjectRow {
  id: number;
  period_id: number;
  name: string;
  teacher: string | null;
  color: string;
  start_date: string | Date;
  end_date: string | Date;
  created_at?: Date | string;
  updated_at?: Date | string;
  period_start_date?: string | Date;
  period_end_date?: string | Date;
}

export interface ClassRow {
  id: number;
  subject_id: number;
  subject_name?: string;
  days: number[];
  start_time: string;
  end_time: string;
  mode: 'onsite' | 'online';
  classroom: string | null;
  type: 'theory' | 'laboratory' | 'workshop';
}

export interface SubjectDto {
  id: number;
  periodId: number;
  name: string;
  teacher: string | null;
  color: string;
  startDate: string;
  endDate: string;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
}

export interface ClassDto {
  id?: number;
  subjectId?: number;
  subjectName?: string;
  days: number[];
  startTime: string;
  endTime: string;
  mode: 'onsite' | 'online';
  classroom: string | null;
  type: 'theory' | 'laboratory' | 'workshop';
}
