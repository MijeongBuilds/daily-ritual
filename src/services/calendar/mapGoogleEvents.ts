import type { CalendarEvent } from './types';

/**
 * The subset of a Google Calendar API v3 event resource that we consume.
 *
 * See https://developers.google.com/calendar/api/v3/reference/events —
 * the fields below are the only ones the app reads. `dateTime` is an RFC3339
 * timestamp for a TIMED event; `date` (a bare "YYYY-MM-DD") is present instead
 * for an ALL-DAY event. We only care about timed events, so a payload that has
 * `date` but no `dateTime` is skipped.
 */
export interface GoogleEventDateTime {
  /** RFC3339 timestamp for a timed event, e.g. "2026-01-01T09:00:00-08:00". */
  dateTime?: string;
  /** "YYYY-MM-DD" for an all-day event. Mutually exclusive with `dateTime`. */
  date?: string;
  /** IANA time zone name (ignored: `dateTime` already carries an offset). */
  timeZone?: string;
}

/** The shape of an `events.list` item that this mapper reads. */
export interface GoogleEvent {
  id?: string;
  summary?: string;
  start?: GoogleEventDateTime;
  end?: GoogleEventDateTime;
}

/** Title used when a Google event has no `summary`. */
export const NO_TITLE_FALLBACK = '(no title)';

/**
 * Map raw Google Calendar `events.list` items to the app's `CalendarEvent[]`.
 *
 * This is a PURE function (no network, no clock, no Date.now) so it is fully
 * unit-testable with fixture JSON. Rules:
 *
 *  - ALL-DAY / date-only events (a `start.date` with no `start.dateTime`, or
 *    likewise for `end`) are SKIPPED. Keeping only timed events means the
 *    `findFreeGaps` math (which works in absolute instants) stays correct and
 *    never sees a midnight-to-midnight block that would swallow the whole day.
 *  - A missing `summary` falls back to {@link NO_TITLE_FALLBACK}.
 *  - An item missing an `id`, a parseable `start.dateTime`, or a parseable
 *    `end.dateTime` is skipped defensively rather than producing an event with
 *    an Invalid Date.
 *  - `color` is intentionally left undefined; the UI falls back to a theme
 *    default.
 */
export function mapGoogleEvents(items: GoogleEvent[]): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  for (const item of items) {
    const startIso = item.start?.dateTime;
    const endIso = item.end?.dateTime;

    // Skip all-day / date-only events (no timed `dateTime`).
    if (startIso == null || endIso == null) {
      continue;
    }
    // Skip items without a stable id.
    if (item.id == null || item.id === '') {
      continue;
    }

    const start = new Date(startIso);
    const end = new Date(endIso);

    // Skip anything that did not parse to a real instant.
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      continue;
    }

    events.push({
      id: item.id,
      title: item.summary ?? NO_TITLE_FALLBACK,
      start,
      end,
    });
  }

  return events;
}
