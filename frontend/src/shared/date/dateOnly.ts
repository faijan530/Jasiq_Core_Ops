// src/shared/date/dateOnly.ts

export function toDateOnly(value: string | Date): string {
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

export function buildMonthDays(year: number, monthIndex: number): string[] {
  const days: string[] = [];
  const date = new Date(Date.UTC(year, monthIndex, 1));

  while (date.getUTCMonth() === monthIndex) {
    days.push(date.toISOString().slice(0, 10));
    date.setUTCDate(date.getUTCDate() + 1);
  }

  return days;
}
