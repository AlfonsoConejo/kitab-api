import type { ClassDto, ClassRow, PeriodDto, PeriodRow, SubjectDto, SubjectRow } from './periods.types.js';
import type { CreateSubjectInput, PeriodInput } from './periods.schemas.js';

// Convierte una fecha de base de datos al formato YYYY-MM-DD usado por el frontend.
export const toDateOnly = (value: string | Date) => new Date(value).toISOString().slice(0, 10);

// Transforma una fila de academic_periods en el DTO público de un período.
export const toPeriodDto = (period: PeriodRow): PeriodDto => ({
  id: period.id,
  name: period.name.trim(),
  startDate: toDateOnly(period.start_date),
  endDate: toDateOnly(period.end_date),
  color: period.color || '#EF4444',
  userId: period.user_id,
  createdAt: period.created_at,
});

// Transforma una fila de subjects en el DTO público de una materia.
export const toSubjectDto = (subject: SubjectRow): SubjectDto => ({
  id: subject.id,
  periodId: subject.period_id,
  name: subject.name.trim(),
  teacher: subject.teacher?.trim() || null,
  color: subject.color || '#EF4444',
  startDate: toDateOnly(subject.start_date),
  endDate: toDateOnly(subject.end_date),
  createdAt: subject.created_at || null,
  updatedAt: subject.updated_at || null,
});

// Transforma una clase de la base de datos o del payload validado a formato de frontend.
export const toClassDto = (classItem: ClassRow | CreateSubjectInput['classes'][number]): ClassDto => ({
  ...('id' in classItem ? { id: classItem.id } : {}),
  ...('subject_id' in classItem ? { subjectId: classItem.subject_id } : {}),
  ...('subject_name' in classItem && classItem.subject_name ? { subjectName: classItem.subject_name } : {}),
  days: classItem.days,
  startTime: 'start_time' in classItem ? classItem.start_time.slice(0, 5) : classItem.startTime,
  endTime: 'end_time' in classItem ? classItem.end_time.slice(0, 5) : classItem.endTime,
  mode: classItem.mode,
  classroom: classItem.classroom,
  type: classItem.type,
});

// Convierte un período validado al formato snake_case que espera la base de datos.
export const toPeriodRecord = (input: PeriodInput) => ({
  name: input.name,
  start_date: input.startDate,
  end_date: input.endDate,
  color: input.color,
});

// Convierte una materia validada al formato snake_case que espera la base de datos.
export const toSubjectRecord = (input: CreateSubjectInput) => ({
  name: input.name,
  teacher: input.teacher,
  color: input.color,
  start_date: input.startDate,
  end_date: input.endDate,
});
