import { findAllGaps, findFreeGaps, mergeBusyIntervals } from './findFreeGaps';
import type { CalendarEvent } from './types';

/** Build a fixed date on 2024-01-15 at the given local hour/minute. */
function at(hour: number, minute = 0): Date {
  return new Date(2024, 0, 15, hour, minute, 0, 0);
}

function event(
  id: string,
  startHour: number,
  startMin: number,
  endHour: number,
  endMin: number,
): CalendarEvent {
  return {
    id,
    title: id,
    start: at(startHour, startMin),
    end: at(endHour, endMin),
  };
}

const DAY_START = at(8, 0);
const DAY_END = at(18, 0);

describe('findFreeGaps', () => {
  it('finds the gaps between events', () => {
    const events = [
      event('standup', 9, 0, 9, 30),
      event('meeting', 11, 0, 12, 0),
    ];

    const gaps = findFreeGaps(events, DAY_START, DAY_END, 30);

    // 8:00-9:00 (before), 9:30-11:00 (between), 12:00-18:00 (after)
    expect(gaps).toHaveLength(3);
    expect(gaps[1].start).toEqual(at(9, 30));
    expect(gaps[1].end).toEqual(at(11, 0));
    expect(gaps[1].durationMinutes).toBe(90);
  });

  it('excludes a gap smaller than the minimum duration', () => {
    // Only a 20-minute window exists between the two events.
    const events = [
      event('a', 9, 0, 10, 0),
      event('b', 10, 20, 18, 0),
    ];

    // Before 'a' there is 8:00-9:00 (60 min). The 10:00-10:20 gap (20 min)
    // must be excluded when asking for 50 minutes.
    const gaps = findFreeGaps(events, DAY_START, DAY_END, 50);

    expect(gaps).toHaveLength(1);
    expect(gaps[0].start).toEqual(at(8, 0));
    expect(gaps[0].end).toEqual(at(9, 0));
    // Confirm the too-small 10:00-10:20 gap is genuinely absent.
    expect(
      gaps.some((g) => g.start.getTime() === at(10, 0).getTime()),
    ).toBe(false);
  });

  it('merges overlapping events so no false gap appears between them', () => {
    // 9:00-10:30 overlaps 10:00-11:00 -> one busy block 9:00-11:00.
    const events = [
      event('a', 9, 0, 10, 30),
      event('b', 10, 0, 11, 0),
    ];

    const busy = mergeBusyIntervals(events);
    expect(busy).toHaveLength(1);
    expect(busy[0].start).toEqual(at(9, 0));
    expect(busy[0].end).toEqual(at(11, 0));

    const gaps = findFreeGaps(events, DAY_START, DAY_END, 30);
    // No gap should start inside the merged busy block (e.g. at 10:30).
    expect(
      gaps.some((g) => g.start.getTime() === at(10, 30).getTime()),
    ).toBe(false);
    // Gaps are the 8:00-9:00 lead-in and the 11:00-18:00 trailing window.
    expect(gaps).toHaveLength(2);
    expect(gaps[0].end).toEqual(at(9, 0));
    expect(gaps[1].start).toEqual(at(11, 0));
  });

  it('returns free time before the first and after the last event', () => {
    const events = [event('midday', 12, 0, 13, 0)];

    const gaps = findFreeGaps(events, DAY_START, DAY_END, 30);

    expect(gaps).toHaveLength(2);
    // Leading gap 8:00-12:00.
    expect(gaps[0].start).toEqual(at(8, 0));
    expect(gaps[0].end).toEqual(at(12, 0));
    // Trailing gap 13:00-18:00.
    expect(gaps[1].start).toEqual(at(13, 0));
    expect(gaps[1].end).toEqual(at(18, 0));
  });

  it('returns an empty array when the day is completely full', () => {
    const events = [event('all-day', 8, 0, 18, 0)];

    expect(findFreeGaps(events, DAY_START, DAY_END, 30)).toEqual([]);
  });

  it('handles events that extend beyond the day bounds by clamping', () => {
    // Event starts before the day and another ends after the day.
    const events = [
      event('early', 6, 0, 9, 0),
      event('late', 16, 0, 20, 0),
    ];

    const gaps = findFreeGaps(events, DAY_START, DAY_END, 30);

    // Only the 9:00-16:00 window remains inside the day bounds.
    expect(gaps).toHaveLength(1);
    expect(gaps[0].start).toEqual(at(9, 0));
    expect(gaps[0].end).toEqual(at(16, 0));
  });
});

describe('findAllGaps', () => {
  it('includes gaps of any size (unlike findFreeGaps)', () => {
    const events = [
      event('a', 9, 0, 10, 0),
      event('b', 10, 20, 18, 0),
    ];

    const all = findAllGaps(events, DAY_START, DAY_END);
    // 8:00-9:00 and the tiny 10:00-10:20 gap are both present here.
    expect(all).toHaveLength(2);
    const tiny = all.find((g) => g.start.getTime() === at(10, 0).getTime());
    expect(tiny?.durationMinutes).toBe(20);
  });
});
