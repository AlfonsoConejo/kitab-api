import type { DayOffDto } from '../../days-off/days-off.types.js';
import { toDateOnly } from '../../../shared/utils/date.js';
import type { CalendarEventsQuery } from '../periods.schemas.js';
import type { CalendarClassRow, PeriodRow } from '../periods.types.js';

type CalendarBreakDay = {
  date: string;
  type: 'day_off' | 'vacation';
  breakIds: number[];
  names: string[];
};

type CalendarEvent = {
  id: string;
  classId: number;
  subjectId: number;
  subjectName: string;
  color: string;
  date: string;
  startTime: string;
  endTime: string;
  mode: CalendarClassRow['mode'];
  classroom: string | null;
  type: CalendarClassRow['type'];
  isDayOff: boolean;
};

type BuildCalendarEventsInput = {
  period: PeriodRow;
  classes: CalendarClassRow[];
  breaks: DayOffDto[];
  range: CalendarEventsQuery;
};

const toUtcDate = (date: string) => new Date(`${date}T00:00:00.000Z`);
const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);

const laterDate = (...dates: string[]) => dates.reduce(
  (latest, date) => (date > latest ? date : latest),
);

const earlierDate = (...dates: string[]) => dates.reduce(
  (earliest, date) => (date < earliest ? date : earliest),
);

function getDatesInRange(startDate: string, endDate: string) {
  const dates: string[] = [];
  const date = toUtcDate(startDate);
  const end = toUtcDate(endDate);

  while (date <= end) {
    dates.push(toIsoDate(date));
    date.setUTCDate(date.getUTCDate() + 1);
  }

  return dates;
}

function getWeekDay(date: string) {
  return toUtcDate(date).getUTCDay() || 7;
}

// Genera las ocurrencias de clase y aplica la prioridad vacation > day_off.
export function buildCalendarEvents({
  period,
  classes,
  breaks,
  range,
}: BuildCalendarEventsInput) {
  const periodStart = toDateOnly(period.start_date);
  const periodEnd = toDateOnly(period.end_date);
  const relevantBreaks = breaks.filter(
    (breakItem) =>
      breakItem.startDate <= range.endDate && breakItem.endDate >= range.startDate,
  );
  const breaksByDate = new Map<string, DayOffDto[]>();

  for (const breakItem of relevantBreaks) {
    const startDate = laterDate(breakItem.startDate, range.startDate);
    const endDate = earlierDate(breakItem.endDate, range.endDate);

    for (const date of getDatesInRange(startDate, endDate)) {
      const breaksOnDate = breaksByDate.get(date) ?? [];
      breaksOnDate.push(breakItem);
      breaksByDate.set(date, breaksOnDate);
    }
  }

  const breakDays: CalendarBreakDay[] = Array.from(breaksByDate.entries())
    .map(([date, breaksOnDate]) => {
      const hasVacation = breaksOnDate.some(
        (breakItem) => breakItem.type === 'vacation',
      );
      const type: CalendarBreakDay['type'] = hasVacation
        ? 'vacation'
        : 'day_off';
      const activeBreaks = breaksOnDate.filter(
        (breakItem) => breakItem.type === type,
      );

      return {
        date,
        type,
        breakIds: activeBreaks.map((breakItem) => breakItem.id),
        names: activeBreaks.map((breakItem) => breakItem.name),
      };
    })
    .sort((first, second) => first.date.localeCompare(second.date));
  const breakDayByDate = new Map(
    breakDays.map((breakDay) => [breakDay.date, breakDay]),
  );
  const events: CalendarEvent[] = [];

  for (const classItem of classes) {
    const startDate = laterDate(
      range.startDate,
      periodStart,
      toDateOnly(classItem.subject_start_date),
    );
    const endDate = earlierDate(
      range.endDate,
      periodEnd,
      toDateOnly(classItem.subject_end_date),
    );

    if (startDate > endDate) {
      continue;
    }

    for (const date of getDatesInRange(startDate, endDate)) {
      if (!classItem.days.includes(getWeekDay(date))) {
        continue;
      }

      const breakDay = breakDayByDate.get(date);

      if (breakDay?.type === 'vacation') {
        continue;
      }

      events.push({
        id: `class-${classItem.id}-${date}`,
        classId: classItem.id,
        subjectId: classItem.subject_id,
        subjectName: classItem.subject_name,
        color: classItem.subject_color,
        date,
        startTime: classItem.start_time,
        endTime: classItem.end_time,
        mode: classItem.mode,
        classroom: classItem.classroom,
        type: classItem.type,
        isDayOff: breakDay?.type === 'day_off',
      });
    }
  }

  events.sort((first, second) => (
    first.date.localeCompare(second.date) ||
    first.startTime.localeCompare(second.startTime) ||
    first.classId - second.classId
  ));

  return {
    events,
    breaks: relevantBreaks,
    breakDays,
  };
}
