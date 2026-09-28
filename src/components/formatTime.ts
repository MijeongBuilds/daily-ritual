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

/**
 * Format an amount of time spent as "N min done", switching to
 * "H hr M min done" once it reaches an hour (e.g. 45 -> "45 min done",
 * 65 -> "1 hr 5 min done", 120 -> "2 hr done"). Non-positive values render
 * as "0 min done".
 */
export function formatMinutesDone(minutes: number): string {
  const total = Math.max(Math.round(minutes), 0);
  if (total < 60) {
    return `${total} min done`;
  }
  const hrs = Math.floor(total / 60);
  const mins = total % 60;
  return mins > 0 ? `${hrs} hr ${mins} min done` : `${hrs} hr done`;
}
