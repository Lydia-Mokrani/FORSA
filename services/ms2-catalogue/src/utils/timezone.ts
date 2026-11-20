// src/utils/timezone.ts
// Timezone handling for Africa/Algiers (UTC+1)

/**
 * Returns 'YYYY-MM-DD' representing the calendar date in Africa/Algiers timezone.
 */
export function getAlgiersCalendarDate(date: Date): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Algiers',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

/**
 * Checks whether two dates fall on the exact same calendar day in Africa/Algiers.
 */
export function isSameDayInAlgiers(date1: Date, date2: Date): boolean {
  return getAlgiersCalendarDate(date1) === getAlgiersCalendarDate(date2);
}

/**
 * Returns the end of the day (23:59:59.999) in Africa/Algiers timezone for the given date,
 * returned as a UTC Date object.
 * Since Africa/Algiers is UTC+1 (offset = +1 hour, 60 minutes),
 * 23:59:59.999 Algiers time = 22:59:59.999 UTC of the same date.
 */
export function getAlgiersEndOfDay(date: Date): Date {
  const dateStr = getAlgiersCalendarDate(date); // 'YYYY-MM-DD'
  // 23:59:59.999 in UTC+1 is 22:59:59.999Z
  return new Date(`${dateStr}T22:59:59.999Z`);
}
