import type { CalendarEvent, FocusBlock } from './types';

/**
 * Abstraction over a calendar provider.
 *
 * For this first slice the only implementation is `MockCalendarService`,
 * which serves in-memory sample events. A real `GoogleCalendarService` will
 * implement this SAME interface later — authenticating with the user's
 * Google account and reading/writing events through a backend — so the rest
 * of the app can switch providers without any changes to the ritual flow.
 */
export interface CalendarService {
  /**
   * Fetch the events for today. Implementations may hit the network; callers
   * should treat this as async and handle loading/error states.
   */
  getEventsForToday(): Promise<CalendarEvent[]>;

  /**
   * Persist the user's chosen focus block onto the calendar. In the mock this
   * simply resolves after a short delay; a real implementation would create a
   * calendar event via the provider's API.
   */
  saveFocusBlock(block: FocusBlock): Promise<void>;
}
