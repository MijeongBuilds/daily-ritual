/**
 * Pure helpers for the classic Pomodoro timer used on the Today home.
 *
 * The timer is deliberately simple: a FIXED 25-minute cycle with only
 * start/stop. There are no custom durations and no break cycles. When a full
 * cycle elapses it counts as one completed pomodoro for the task. Keeping the
 * math here (pure, no React, no timers) makes it unit-testable without a
 * device.
 */

/** Length of one classic pomodoro, in minutes. */
export const POMODORO_MINUTES = 25;
/** Length of one classic pomodoro, in seconds. */
export const POMODORO_SECONDS = POMODORO_MINUTES * 60;

/**
 * Clamp remaining seconds into the valid `[0, POMODORO_SECONDS]` range so a
 * drifting tick can never produce a negative or oversized value.
 */
export function clampRemaining(seconds: number): number {
  if (Number.isNaN(seconds)) {
    return 0;
  }
  return Math.min(Math.max(Math.round(seconds), 0), POMODORO_SECONDS);
}

/** Format a whole number of seconds as "MM:SS" (e.g. 1500 -> "25:00"). */
export function formatClock(totalSeconds: number): string {
  const s = clampRemaining(totalSeconds);
  const minutes = Math.floor(s / 60);
  const seconds = s % 60;
  const mm = minutes.toString().padStart(2, '0');
  const ss = seconds.toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

/** True once the countdown has reached (or passed) zero. */
export function isComplete(remainingSeconds: number): boolean {
  return clampRemaining(remainingSeconds) <= 0;
}
