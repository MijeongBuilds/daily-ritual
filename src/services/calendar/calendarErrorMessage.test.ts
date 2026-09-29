import {
  calendarErrorMessage,
  isReauthError,
} from './calendarErrorMessage';
import {
  CalendarApiError,
  CalendarAuthError,
} from './GoogleCalendarService';

describe('calendarErrorMessage', () => {
  it('prompts a reconnect for an expired session (re-auth-needed)', () => {
    const err = new CalendarAuthError('re-auth-needed', 'expired');
    expect(calendarErrorMessage(err, 'load')).toMatch(/expired/i);
    expect(calendarErrorMessage(err, 'load')).toMatch(/reconnect/i);
    // Same guidance regardless of context.
    expect(calendarErrorMessage(err, 'save')).toMatch(/reconnect/i);
  });

  it('asks the user to connect when not signed in', () => {
    const err = new CalendarAuthError('not-signed-in', 'nope');
    expect(calendarErrorMessage(err, 'load')).toMatch(/connect/i);
  });

  it('gives context-specific copy for API errors', () => {
    const err = new CalendarApiError(500, 'boom');
    expect(calendarErrorMessage(err, 'save')).toMatch(/create the event/i);
    expect(calendarErrorMessage(err, 'load')).toMatch(/load your google/i);
  });

  it('mentions the connection for unknown/network errors', () => {
    const err = new Error('Network request failed');
    expect(calendarErrorMessage(err, 'save')).toMatch(/connection/i);
    expect(calendarErrorMessage(err, 'load')).toMatch(/connection/i);
  });

  it('handles non-Error thrown values without crashing', () => {
    expect(calendarErrorMessage('weird', 'load')).toMatch(/couldn't load/i);
    expect(calendarErrorMessage(undefined, 'save')).toMatch(/couldn't save/i);
  });

  it('isReauthError only flags re-auth-needed', () => {
    expect(isReauthError(new CalendarAuthError('re-auth-needed', 'x'))).toBe(
      true,
    );
    expect(isReauthError(new CalendarAuthError('not-signed-in', 'x'))).toBe(
      false,
    );
    expect(isReauthError(new CalendarApiError(500, 'x'))).toBe(false);
    expect(isReauthError(new Error('x'))).toBe(false);
  });
});
