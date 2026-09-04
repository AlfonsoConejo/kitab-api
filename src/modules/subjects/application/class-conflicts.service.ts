import type { ConflictClassInput } from '../subjects.schemas.js';
import type { ClassDto } from '../subjects.types.js';

type SchedulableClass = Pick<ConflictClassInput, 'days' | 'startTime' | 'endTime'>;

export function overlappingDays(
  firstClass: SchedulableClass,
  secondClass: SchedulableClass,
): number[] | null {
  const conflictDays = firstClass.days.filter((day) => secondClass.days.includes(day));

  if (!conflictDays.length) {
    return null;
  }

  const schedulesOverlap =
    firstClass.startTime < secondClass.endTime &&
    secondClass.startTime < firstClass.endTime;

  return schedulesOverlap ? conflictDays : null;
}

export function findInternalConflicts(classes: ConflictClassInput[]) {
  const conflicts = [];

  for (let firstIndex = 0; firstIndex < classes.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < classes.length; secondIndex += 1) {
      const firstClass = classes[firstIndex]!;
      const secondClass = classes[secondIndex]!;
      const conflictDays = overlappingDays(firstClass, secondClass);

      if (conflictDays) {
        conflicts.push({
          classA: firstClass.tempId ?? firstClass.id,
          classB: secondClass.tempId ?? secondClass.id,
          conflictDays,
          classAStartTime: firstClass.startTime,
          classAEndTime: firstClass.endTime,
          classBStartTime: secondClass.startTime,
          classBEndTime: secondClass.endTime,
        });
      }
    }
  }

  return conflicts;
}

export function findExternalConflicts(
  frontendClasses: ConflictClassInput[],
  persistedClasses: ClassDto[],
) {
  const conflicts = [];

  for (const frontendClass of frontendClasses) {
    for (const persistedClass of persistedClasses) {
      const conflictDays = overlappingDays(frontendClass, persistedClass);

      if (conflictDays) {
        conflicts.push({
          id: frontendClass.tempId ?? frontendClass.id,
          conflictDays,
          subject: persistedClass.subjectName,
          startTime: persistedClass.startTime,
          endTime: persistedClass.endTime,
        });
      }
    }
  }

  return conflicts;
}
