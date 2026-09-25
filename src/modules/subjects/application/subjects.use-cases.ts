import { withTransaction } from '../../../shared/database/transaction.js';
import { findExternalConflicts, findInternalConflicts } from './class-conflicts.service.js';
import { toClassDto, toSubjectDto } from '../subjects.mapper.js';
import {
  parseSubjectCreateForPeriod,
  parseSubjectUpdateForPeriod,
  type ClassInput,
  type ConflictClassInput,
  type SubjectUpdateInput,
} from '../subjects.schemas.js';
import { PgSubjectsRepository } from '../infrastructure/pg-subjects.repository.js';

export class SubjectsUseCases {
  constructor(private readonly subjects: PgSubjectsRepository) {}

  async createClasses(userId: number, subjectId: number, classes: ClassInput[]) {
    return withTransaction(this.subjects.database, async (client) => {
      await this.subjects.getOwnedSubject(subjectId, userId, client);

      const insertedClasses = await this.subjects.createClasses(subjectId, classes, client);

      return insertedClasses.map(toClassDto);
    });
  }

  async listSubjects(userId: number, periodId: number) {
    await this.subjects.ensureOwnedPeriod(periodId, userId);
    const subjects = await this.subjects.listSubjectsByPeriod(periodId);

    return subjects.map(toSubjectDto);
  }

  async listClassesByPeriod(userId: number, periodId: number) {
    await this.subjects.ensureOwnedPeriod(periodId, userId);
    const classes = await this.subjects.listClassesByPeriod(periodId);

    return classes.map(toClassDto);
  }

  async createSubject(userId: number, periodId: number, payload: unknown) {
    return withTransaction(this.subjects.database, async (client) => {
      const period = await this.subjects.ensureOwnedPeriod(periodId, userId, client);
      const input = parseSubjectCreateForPeriod(payload, period);
      const subject = await this.subjects.createSubject(periodId, input, client);
      await this.subjects.createClasses(subject.id, input.classes, client);

      return {
        subject: toSubjectDto(subject),
        classes: input.classes.length ? input.classes.map(toClassDto) : undefined,
      };
    });
  }

  async updateSubject(userId: number, subjectId: number, payload: unknown) {
    return withTransaction(this.subjects.database, async (client) => {
      const currentSubject = await this.subjects.getOwnedSubject(subjectId, userId, client);
      const input = parseSubjectUpdateForPeriod(payload, currentSubject);
      const updatedSubject = await this.subjects.updateSubject(subjectId, input, client);
      const existingClasses = input.classes.filter((classItem): classItem is ClassInput & { id: number } => Boolean(classItem.id));
      const newClasses = input.classes.filter((classItem) => !classItem.id);
      const existingClassIds = existingClasses.map((classItem) => classItem.id);

      await this.subjects.ensureClassesOwnership(existingClassIds, subjectId, client);
      await this.subjects.ensureClassesOwnership(input.deletedClassIds, subjectId, client);

      const updatedClasses = await this.subjects.updateClasses(existingClasses, client);
      const insertedClasses = await this.subjects.createClasses(subjectId, newClasses, client);
      const deletedClasses = await this.subjects.deleteClasses(input.deletedClassIds, client);

      return {
        updatedSubject: toSubjectDto(updatedSubject),
        insertedClasses: insertedClasses.map(toClassDto),
        updatedClasses: updatedClasses.map(toClassDto),
        deletedClasses,
      };
    });
  }

  async deleteSubject(userId: number, subjectId: number) {
    await this.subjects.getOwnedSubject(subjectId, userId);
    await this.subjects.deleteSubject(subjectId);
  }

  async getSubjectWithClasses(
    userId: number,
    subjectId: number
  ) {
    const subject = await this.subjects.getOwnedSubject(
      subjectId,
      userId
    );

    const classes = await this.subjects.listClassesBySubject(
      subjectId
    );

    return {
      ...toSubjectDto(subject),
      classes: classes.map(toClassDto)
    };
  }

  async checkExternalConflictsByPeriod(
    userId: number,
    periodId: number,
    classes: ConflictClassInput[],
  ) {
    await this.subjects.ensureOwnedPeriod(periodId, userId);

    const persistedClasses = await this.subjects.listClassesByPeriodExcludingSubject(periodId, null);

    return findExternalConflicts(classes, persistedClasses.map(toClassDto));
  }

  async checkExternalConflictsBySubject(
    userId: number,
    subjectId: number,
    classes: ConflictClassInput[],
  ) {
    const subject = await this.subjects.getOwnedSubject(subjectId, userId);
    const persistedClasses = await this.subjects.listClassesByPeriodExcludingSubject(
      subject.period_id,
      subjectId,
    );

    return findExternalConflicts(classes, persistedClasses.map(toClassDto));
  }

  checkInternalConflicts(classes: ConflictClassInput[]) {
    return findInternalConflicts(classes);
  }
}
