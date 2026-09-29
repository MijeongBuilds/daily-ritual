import { CalendarApiError, CalendarAuthError } from './GoogleCalendarService';

/**
 * Translate an error thrown by a {@link CalendarService} into a short, calm,
 * user-facing message. This is a PURE function (no React, no I/O) so it can be
 * unit-tested and reused by every screen that surfaces a calendar failure.
 *
 * The intent is graceful degradation: the caller shows this message inline
 * (never a crash, never a blank screen) and, for the re-auth case, can prompt
 * the user to reconnect.
 *
 * @param error   The thrown value (typed errors from GoogleCalendarService, or
 *                any unexpected error).
 * @param context Whether the failure happened while listing events or while
 *                creating (saving) the focus block, so the copy can be
 *                specific.
 */
export function calendarErrorMessage(
  error: unknown,
  context: 'load' | 'save',
): string {
  if (error instanceof CalendarAuthError) {
    if (error.code === 're-auth-needed') {
      return 'Your Google session expired. Reconnect Google Calendar to continue.';
    }
    // not-signed-in: this should normally be prevented by the signed-out UI,
    // but handle it defensively.
    return 'Connect Google Calendar to see your real schedule.';
  }

  if (error instanceof CalendarApiError) {
    return context === 'save'
      ? "Couldn't create the event on Google Calendar. Please try again."
      : "Couldn't load your Google Calendar. Please try again.";
  }

  // Network failure (fetch rejects) or any other unexpected error.
  return context === 'save'
    ? "Couldn't save your focus block. Check your connection and try again."
    : "Couldn't load your calendar. Check your connection and try again.";
}

/**
 * Whether an error means the user's Google session is no longer valid and they
 * should be prompted to reconnect (as opposed to a transient failure worth a
 * plain retry).
 */
export function isReauthError(error: unknown): boolean {
  return error instanceof CalendarAuthError && error.code === 're-auth-needed';
}
