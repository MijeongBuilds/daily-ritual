import type { CalendarService } from './CalendarService';
import type { GoogleEvent } from './mapGoogleEvents';
import { mapGoogleEvents } from './mapGoogleEvents';
import type { CalendarEvent, FocusBlock } from './types';

/**
 * Real calendar provider backed by the Google Calendar REST API v3.
 *
 * Implements the SAME {@link CalendarService} interface as the mock, so the
 * rest of the app is agnostic to which provider is active. It is intentionally
 * decoupled from React: it receives a `getAccessToken` callback (supplied by
 * the auth layer / CalendarProvider) rather than reading context itself, which
 * keeps it easy to unit-test and reason about.
 *
 * Endpoints (stable, documented):
 *  - events.list:   GET  https://www.googleapis.com/calendar/v3/calendars/primary/events
 *  - events.insert: POST https://www.googleapis.com/calendar/v3/calendars/primary/events
 * See https://developers.google.com/calendar/api/v3/reference/events
 */

const CALENDAR_BASE_URL =
  'https://www.googleapis.com/calendar/v3/calendars/primary/events';

/** Cap on events fetched for a single day — plenty for a personal calendar. */
const MAX_RESULTS = 50;

/**
 * Error thrown when no access token is available (the user is not signed in,
 * or the stored session could not be refreshed). Callers can branch on
 * `code === 'not-signed-in'`.
 */
export class CalendarAuthError extends Error {
  readonly code: 'not-signed-in' | 're-auth-needed';

  constructor(code: 'not-signed-in' | 're-auth-needed', message: string) {
    super(message);
    this.name = 'CalendarAuthError';
    this.code = code;
  }
}

/** Error thrown for a non-2xx Google API response other than 401. */
export class CalendarApiError extends Error {
  readonly status: number;

  constructor(status: number, body: string) {
    super(`Google Calendar API error ${status}: ${body}`);
    this.name = 'CalendarApiError';
    this.status = status;
  }
}

/** The shape of the JSON body of a successful `events.list` response. */
interface EventsListResponse {
  items?: GoogleEvent[];
}

/** Start and end instants of the local calendar day containing `now`. */
function localDayBounds(now: Date): { start: Date; end: Date } {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/** The device's IANA time zone, e.g. "America/Los_Angeles". */
function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export class GoogleCalendarService implements CalendarService {
  private readonly getAccessToken: () => Promise<string | null>;

  constructor(getAccessToken: () => Promise<string | null>) {
    this.getAccessToken = getAccessToken;
  }

  /** Resolve a Bearer token or throw a clear not-signed-in error. */
  private async requireToken(): Promise<string> {
    const token = await this.getAccessToken();
    if (token == null || token === '') {
      throw new CalendarAuthError(
        'not-signed-in',
        'Not signed in to Google Calendar.',
      );
    }
    return token;
  }

  /**
   * Translate a non-ok Response into a typed error. 401 => re-auth needed;
   * any other non-2xx => CalendarApiError carrying status + body text. The
   * body is read best-effort so the caller always gets useful context.
   */
  private static async throwForResponse(response: Response): Promise<never> {
    let body = '';
    try {
      body = await response.text();
    } catch {
      body = '<unreadable response body>';
    }
    if (response.status === 401) {
      throw new CalendarAuthError(
        're-auth-needed',
        'Google Calendar authorization expired; please reconnect.',
      );
    }
    throw new CalendarApiError(response.status, body);
  }

  async getEventsForToday(): Promise<CalendarEvent[]> {
    const token = await this.requireToken();
    const { start, end } = localDayBounds(new Date());

    const params = new URLSearchParams({
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: String(MAX_RESULTS),
    });

    const response = await fetch(`${CALENDAR_BASE_URL}?${params.toString()}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      await GoogleCalendarService.throwForResponse(response);
    }

    const data = (await response.json()) as EventsListResponse;
    return mapGoogleEvents(data.items ?? []);
  }

  async saveFocusBlock(block: FocusBlock): Promise<void> {
    const token = await this.requireToken();
    const timeZone = deviceTimeZone();

    const body = {
      summary: block.title,
      start: { dateTime: block.start.toISOString(), timeZone },
      end: { dateTime: block.end.toISOString(), timeZone },
    };

    const response = await fetch(CALENDAR_BASE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      await GoogleCalendarService.throwForResponse(response);
    }
    // Interface resolves void; the created event resource is not needed here.
  }
}
