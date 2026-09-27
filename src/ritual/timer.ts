/**
 * Pure helpers for the count-UP focus timer used on the Today home.
 *
 * The timer counts up from 0:00 (a stopwatch), driven off wall-clock time so
 * it stays accurate across backgrounding. It shows the aimed-for goal minutes
 * for reference only; finishing earlier or later is fine — we just log the
 * actual elapsed time. Keeping the math here (pure, no React, no timers)
 * makes it unit-testable without a device.
 */

/**
 * Clamp elapsed seconds so a drifting tick can never produce a negative
 * value. There is no upper bound on a count-up timer.
 */
export function clampElapsed(seconds: number): number {
  if (Number.isNaN(seconds)) {
    return 0;
  }
  return Math.max(Math.floor(seconds), 0);
}

/**
 * Format a whole number of elapsed seconds as a count-up clock. Under an hour
 * it reads "M:SS" (e.g. 65 -> "1:05"); an hour or more reads "H:MM:SS".
 */
export function formatElapsed(totalSeconds: number): string {
  const s = clampElapsed(totalSeconds);
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const ss = seconds.toString().padStart(2, '0');
  if (hours > 0) {
    const mm = minutes.toString().padStart(2, '0');
    return `${hours}:${mm}:${ss}`;
  }
  return `${minutes}:${ss}`;
}

/** Convert elapsed seconds to whole minutes (rounded), for logging. */
export function elapsedToMinutes(totalSeconds: number): number {
  return Math.round(clampElapsed(totalSeconds) / 60);
}

/** Format a goal duration in minutes for reference, e.g. "Goal: 60 min". */
export function formatGoal(goalMinutes: number): string {
  const m = Math.max(Math.round(goalMinutes), 0);
  return `Goal: ${m} min`;
}

/**
 * Progress toward the goal in the range [0, 1], used only for a reference
 * ring. Over-runs are clamped to 1 (we don't penalize going over).
 */
export function goalProgress(elapsedSeconds: number, goalMinutes: number): number {
  const goalSeconds = Math.max(goalMinutes, 0) * 60;
  if (goalSeconds <= 0) {
    return 0;
  }
  return Math.min(clampElapsed(elapsedSeconds) / goalSeconds, 1);
}
