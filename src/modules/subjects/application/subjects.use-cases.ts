import { withTransaction } from '../../../shared/database/transaction.js';
import { findExternalConflicts, findInternalConflicts } from './class-conflicts.service.js';
import { toClassDto, toSubjectDto } from '../subjects.mapper.js';
import { parseSubjectUpdateForPeriod, type ClassInput, type ConflictClassInput, type SubjectUpdateInput } from '../subjects.schemas.js';
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

  async checkExternalConflicts(
    userId: number,
    periodId: number,
    subjectId: number | null,
    classes: ConflictClassInput[],
  ) {
    let resolvedPeriodId = periodId;

    if (subjectId) {
      const subject = await this.subjects.getOwnedSubject(subjectId, userId);
      resolvedPeriodId = subject.period_id;
    } else {
      await this.subjects.ensureOwnedPeriod(periodId, userId);
    }

    const persistedClasses = await this.subjects.listClassesByPeriodExcludingSubject(resolvedPeriodId, subjectId);

    return findExternalConflicts(classes, persistedClasses.map(toClassDto));
  }

  checkInternalConflicts(classes: ConflictClassInput[]) {
    return findInternalConflicts(classes);
  }
}
