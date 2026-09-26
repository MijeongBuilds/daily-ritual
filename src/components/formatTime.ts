/**
 * Format a `Date` as a short local time like "9:00 AM".
 */
export function formatTime(date: Date): string {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const suffix = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) {
    hours = 12;
  }
  const mm = minutes.toString().padStart(2, '0');
  return `${hours}:${mm} ${suffix}`;
}

/** Format a start/end pair as "9:00 AM – 9:50 AM". */
export function formatTimeRange(start: Date, end: Date): string {
  return `${formatTime(start)} \u2013 ${formatTime(end)}`;
}
