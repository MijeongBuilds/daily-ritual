import type { CalendarService } from './CalendarService';
import type { CalendarEvent, FocusBlock } from './types';

/** Build a `Date` for today at the given local hour and minute. */
function todayAt(hour: number, minute: number): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

/**
 * A short simulated network delay so loading states in the UI are exercised.
 */
const SIMULATED_DELAY_MS = 500;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * In-memory calendar used for the first slice. Sample events are built
 * relative to TODAY so the day timeline always looks realistic and leaves
 * free gaps big enough to fit a typical 50-minute focus block (e.g. the
 * 9:30–11:00 and 13:30–15:00 windows).
 *
 * This implements the same {@link CalendarService} interface that a real
 * `GoogleCalendarService` will implement later.
 */
export class MockCalendarService implements CalendarService {
  private events: CalendarEvent[];

  constructor() {
    this.events = MockCalendarService.buildSampleEvents();
  }

  private static buildSampleEvents(): CalendarEvent[] {
    return [
      {
        id: 'evt-standup',
        title: 'Team standup',
        start: todayAt(9, 0),
        end: todayAt(9, 30),
        color: '#C8663F',
      },
      {
        id: 'evt-meeting',
        title: 'Product meeting',
        start: todayAt(11, 0),
        end: todayAt(12, 0),
        color: '#3D6B4E',
      },
      {
        id: 'evt-lunch',
        title: 'Lunch',
        start: todayAt(13, 0),
        end: todayAt(13, 30),
        color: '#C8663F',
      },
      {
        id: 'evt-call',
        title: 'Client call',
        start: todayAt(15, 0),
        end: todayAt(16, 0),
        color: '#3D6B4E',
      },
    ];
  }

  async getEventsForToday(): Promise<CalendarEvent[]> {
    await delay(SIMULATED_DELAY_MS);
    // Return copies so callers cannot mutate the service's internal state.
    return this.events.map((e) => ({ ...e }));
  }

  async saveFocusBlock(block: FocusBlock): Promise<void> {
    await delay(SIMULATED_DELAY_MS);
    // Reflect the saved block back into the in-memory list so a subsequent
    // fetch would show it, mirroring what a real backend write would do.
    this.events.push({
      id: `focus-${block.start.getTime()}`,
      title: block.title,
      start: block.start,
      end: block.end,
      color: '#3D6B4E',
    });
  }
}

/** Shared singleton the app wires into the ritual flow. */
export const mockCalendarService: CalendarService = new MockCalendarService();
