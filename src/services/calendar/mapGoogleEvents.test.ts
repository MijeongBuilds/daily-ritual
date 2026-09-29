import type { GoogleEvent } from './mapGoogleEvents';
import { mapGoogleEvents, NO_TITLE_FALLBACK } from './mapGoogleEvents';

/**
 * Fixtures modelled on real Google Calendar `events.list` items. Timed events
 * carry `start.dateTime` (RFC3339 with an offset); the all-day event carries
 * only `start.date` and must be skipped.
 */
const timedStandup: GoogleEvent = {
  id: 'evt-standup',
  summary: 'Team standup',
  start: { dateTime: '2026-01-15T09:00:00-08:00', timeZone: 'America/Los_Angeles' },
  end: { dateTime: '2026-01-15T09:30:00-08:00', timeZone: 'America/Los_Angeles' },
};

const timedMeeting: GoogleEvent = {
  id: 'evt-meeting',
  summary: 'Product meeting',
  start: { dateTime: '2026-01-15T11:00:00-08:00' },
  end: { dateTime: '2026-01-15T12:00:00-08:00' },
};

const allDayHoliday: GoogleEvent = {
  id: 'evt-holiday',
  summary: 'Company holiday',
  start: { date: '2026-01-15' },
  end: { date: '2026-01-16' },
};

const timedNoSummary: GoogleEvent = {
  id: 'evt-untitled',
  start: { dateTime: '2026-01-15T14:00:00-08:00' },
  end: { dateTime: '2026-01-15T15:00:00-08:00' },
};

describe('mapGoogleEvents', () => {
  it('maps timed events to CalendarEvent with parsed Date instants', () => {
    const result = mapGoogleEvents([timedStandup, timedMeeting]);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: 'evt-standup',
      title: 'Team standup',
    });
    expect(result[0].start).toEqual(new Date('2026-01-15T09:00:00-08:00'));
    expect(result[0].end).toEqual(new Date('2026-01-15T09:30:00-08:00'));
    // color is left undefined so the UI falls back to a theme default.
    expect(result[0].color).toBeUndefined();
    expect(result[1].id).toBe('evt-meeting');
  });

  it('skips all-day / date-only events', () => {
    const result = mapGoogleEvents([timedStandup, allDayHoliday, timedMeeting]);

    expect(result.map((e) => e.id)).toEqual(['evt-standup', 'evt-meeting']);
    expect(result.some((e) => e.id === 'evt-holiday')).toBe(false);
  });

  it('falls back to a placeholder title when summary is missing', () => {
    const result = mapGoogleEvents([timedNoSummary]);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe(NO_TITLE_FALLBACK);
  });

  it('skips items without an id', () => {
    const noId: GoogleEvent = {
      summary: 'Orphan',
      start: { dateTime: '2026-01-15T10:00:00-08:00' },
      end: { dateTime: '2026-01-15T10:30:00-08:00' },
    };

    expect(mapGoogleEvents([noId])).toEqual([]);
  });

  it('skips items whose dateTime does not parse to a real instant', () => {
    const bad: GoogleEvent = {
      id: 'evt-bad',
      summary: 'Broken',
      start: { dateTime: 'not-a-date' },
      end: { dateTime: 'also-bad' },
    };

    expect(mapGoogleEvents([bad])).toEqual([]);
  });

  it('returns an empty array for no items', () => {
    expect(mapGoogleEvents([])).toEqual([]);
  });
});
