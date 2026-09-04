import type { ClassInput, SubjectUpdateInput } from './subjects.schemas.js';
import type { ClassDto, ClassRow, SubjectDto, SubjectRow } from './subjects.types.js';
import { toDateOnly } from '../../shared/utils/date.js';

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

export const toClassDto = (classItem: ClassRow | ClassInput): ClassDto => ({
  ...('id' in classItem && classItem.id ? { id: classItem.id } : {}),
  ...('subject_id' in classItem ? { subjectId: classItem.subject_id } : {}),
  ...('subject_name' in classItem && classItem.subject_name ? { subjectName: classItem.subject_name } : {}),
  days: classItem.days,
  startTime: 'start_time' in classItem ? classItem.start_time.slice(0, 5) : classItem.startTime,
  endTime: 'end_time' in classItem ? classItem.end_time.slice(0, 5) : classItem.endTime,
  mode: classItem.mode,
  classroom: classItem.classroom,
  type: classItem.type,
});

type SubjectRecordInput = Pick<SubjectUpdateInput, 'name' | 'teacher' | 'color' | 'startDate' | 'endDate'>;

export const toSubjectRecord = (input: SubjectRecordInput) => ({
  name: input.name,
  teacher: input.teacher,
  color: input.color,
  start_date: input.startDate,
  end_date: input.endDate,
});
