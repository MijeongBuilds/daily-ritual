import type { CalendarEvent, TimeGap } from './types';

const MS_PER_MINUTE = 60_000;

/** Milliseconds between two dates as a minute count (may be fractional). */
function minutesBetween(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / MS_PER_MINUTE;
}

/**
 * Merge a list of events into non-overlapping, sorted "busy" intervals.
 *
 * Events are sorted by start time, then adjacent/overlapping intervals are
 * coalesced. Events that touch (previous.end === next.start) are merged so no
 * zero-length gap is reported between them. Events fully contained within an
 * earlier event are absorbed. Zero-length events (start === end) are ignored.
 *
 * Pure and dependency-free.
 */
export function mergeBusyIntervals(
  events: CalendarEvent[],
): { start: Date; end: Date }[] {
  const valid = events.filter((e) => e.end.getTime() > e.start.getTime());
  const sorted = [...valid].sort(
    (a, b) => a.start.getTime() - b.start.getTime(),
  );

  const merged: { start: Date; end: Date }[] = [];
  for (const event of sorted) {
    const last = merged[merged.length - 1];
    if (last && event.start.getTime() <= last.end.getTime()) {
      // Overlapping or touching — extend the current busy interval.
      if (event.end.getTime() > last.end.getTime()) {
        last.end = event.end;
      }
    } else {
      merged.push({ start: event.start, end: event.end });
    }
  }
  return merged;
}

/**
 * Compute ALL free intervals within `[dayStart, dayEnd]`, regardless of size.
 *
 * Useful for rendering the day timeline where you want to show every gap and
 * only visually emphasize the ones that fit. Overlapping events are merged
 * first, so no false gaps appear inside a busy stretch.
 *
 * Pure: pass the day bounds in explicitly — this function never reads
 * `Date.now()` or any hidden state.
 */
export function findAllGaps(
  events: CalendarEvent[],
  dayStart: Date,
  dayEnd: Date,
): TimeGap[] {
  if (dayEnd.getTime() <= dayStart.getTime()) {
    return [];
  }

  const busy = mergeBusyIntervals(events);
  const gaps: TimeGap[] = [];

  // Cursor walks from the start of the day, clamped to the day window.
  let cursor = dayStart;

  for (const interval of busy) {
    // Skip busy intervals that end before the day begins.
    if (interval.end.getTime() <= cursor.getTime()) {
      continue;
    }
    // Stop once we pass the end of the day.
    if (interval.start.getTime() >= dayEnd.getTime()) {
      break;
    }

    if (interval.start.getTime() > cursor.getTime()) {
      const gapEnd =
        interval.start.getTime() < dayEnd.getTime() ? interval.start : dayEnd;
      gaps.push({
        start: cursor,
        end: gapEnd,
        durationMinutes: minutesBetween(cursor, gapEnd),
      });
    }

    // Advance the cursor past this busy interval (clamped to the day).
    if (interval.end.getTime() > cursor.getTime()) {
      cursor = interval.end.getTime() < dayEnd.getTime() ? interval.end : dayEnd;
    }
  }

  // Trailing free time after the last event, before the day ends.
  if (cursor.getTime() < dayEnd.getTime()) {
    gaps.push({
      start: cursor,
      end: dayEnd,
      durationMinutes: minutesBetween(cursor, dayEnd),
    });
  }

  return gaps;
}

/**
 * Return the free gaps within `[dayStart, dayEnd]` that are at least
 * `minDurationMinutes` long — i.e. the slots into which a focus block of that
 * length actually fits.
 *
 * Behavior:
 *  - Events are sorted and overlapping events are merged, so a busy stretch
 *    never produces a phantom gap.
 *  - Free time before the first event and after the last event (within the
 *    day bounds) is included.
 *  - A completely full day (or a day window with no room) returns `[]`.
 *
 * Pure and independently testable: day bounds are passed in explicitly.
 */
export function findFreeGaps(
  events: CalendarEvent[],
  dayStart: Date,
  dayEnd: Date,
  minDurationMinutes: number,
): TimeGap[] {
  return findAllGaps(events, dayStart, dayEnd).filter(
    (gap) => gap.durationMinutes >= minDurationMinutes,
  );
}
