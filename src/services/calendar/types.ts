/**
 * Shared types for the calendar service layer.
 *
 * These types are intentionally UI- and provider-agnostic. The mocked
 * calendar and a future real GoogleCalendarService both speak in these
 * terms, so the app never depends on a specific backend.
 *
 * Dates are represented as JavaScript `Date` objects throughout the calendar
 * layer. Keeping a single representation (rather than mixing `Date` and ISO
 * strings) avoids conversion bugs in the pure gap-finding logic.
 */

/** A single event on the user's calendar for the day. */
export interface CalendarEvent {
  /** Stable unique identifier for the event. */
  id: string;
  /** Human-readable title, e.g. "Team standup". */
  title: string;
  /** When the event starts. */
  start: Date;
  /** When the event ends. Must be >= `start`. */
  end: Date;
  /** Optional display color (hex). Falls back to a theme default in the UI. */
  color?: string;
}

/** A free interval between events that could host a focus block. */
export interface TimeGap {
  /** When the free interval begins. */
  start: Date;
  /** When the free interval ends. */
  end: Date;
  /** Convenience: duration of the gap in whole/fractional minutes. */
  durationMinutes: number;
}

/**
 * A "focus block" — the user's one top priority placed onto the calendar.
 * This is the lite shape the ritual flow produces and hands to
 * `saveFocusBlock`. A richer, provider-specific event is created by the
 * concrete CalendarService when it persists this.
 */
export interface FocusBlock {
  /** The priority text, used as the event title. */
  title: string;
  /** Chosen start time. */
  start: Date;
  /** Chosen end time (start + user-entered duration). */
  end: Date;
}
