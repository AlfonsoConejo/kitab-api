export function normalizePeriod(period) {
  return {
    id: period.id,
    name: period.name,
    startDate: period.start_date.toISOString().slice(0, 10),
    endDate: period.end_date.toISOString().slice(0, 10),
    color: period.color,
  };
}