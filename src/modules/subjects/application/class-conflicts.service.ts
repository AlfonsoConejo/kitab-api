import type { ConflictClassInput } from '../subjects.schemas.js';
import type { ClassDto } from '../subjects.types.js';

type SchedulableClass = Pick<ConflictClassInput, 'days' | 'startTime' | 'endTime'>;

/** Ordena resultados con el mismo criterio cronológico usado al listar clases. */
function compareBySchedule(
  firstDays: number[],
  firstStartTime: string,
  secondDays: number[],
  secondStartTime: string,
) {
  const dayDifference = Math.min(...firstDays) - Math.min(...secondDays);

  if (dayDifference !== 0) {
    return dayDifference;
  }

  return firstStartTime.localeCompare(secondStartTime);
}

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

  return conflicts.sort((firstConflict, secondConflict) => {
    const firstStartTime = [firstConflict.classAStartTime, firstConflict.classBStartTime]
      .sort()[0]!;
    const secondStartTime = [secondConflict.classAStartTime, secondConflict.classBStartTime]
      .sort()[0]!;
    const scheduleDifference = compareBySchedule(
      firstConflict.conflictDays,
      firstStartTime,
      secondConflict.conflictDays,
      secondStartTime,
    );

    if (scheduleDifference !== 0) {
      return scheduleDifference;
    }

    return String(firstConflict.classA).localeCompare(String(secondConflict.classA))
      || String(firstConflict.classB).localeCompare(String(secondConflict.classB));
  });
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

  return conflicts.sort((firstConflict, secondConflict) => {
    const scheduleDifference = compareBySchedule(
      firstConflict.conflictDays,
      firstConflict.startTime,
      secondConflict.conflictDays,
      secondConflict.startTime,
    );

    if (scheduleDifference !== 0) {
      return scheduleDifference;
    }

    return (firstConflict.subject ?? '').localeCompare(secondConflict.subject ?? '')
      || String(firstConflict.id).localeCompare(String(secondConflict.id));
  });
}
