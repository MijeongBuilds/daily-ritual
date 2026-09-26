import {
  DAY_END_HOUR,
  DAY_START_HOUR,
  clampStartToTimeline,
  timeForOffset,
} from './DayCalendar';

const PIXELS_PER_HOUR = 64;
const PIXELS_PER_MINUTE = PIXELS_PER_HOUR / 60;
const TOTAL_MINUTES = (DAY_END_HOUR - DAY_START_HOUR) * 60;

/** Timeline base = day at 07:00 on a fixed date. */
function base(): Date {
  return new Date(2024, 0, 15, DAY_START_HOUR, 0, 0, 0);
}

function minutesFromBase(d: Date): number {
  return (d.getTime() - base().getTime()) / 60_000;
}

describe('clampStartToTimeline', () => {
  it('keeps an in-window start unchanged', () => {
    const start = new Date(base().getTime() + 120 * 60_000); // 09:00
    expect(minutesFromBase(clampStartToTimeline(start, 50, base()))).toBe(120);
  });

  it('clamps a start before the window to the day start', () => {
    const start = new Date(base().getTime() - 60 * 60_000); // 06:00
    expect(minutesFromBase(clampStartToTimeline(start, 50, base()))).toBe(0);
  });

  it('clamps so a long block near the end stays fully in the window', () => {
    // A 50-min block cannot start later than (TOTAL_MINUTES - 50).
    const start = new Date(base().getTime() + (TOTAL_MINUTES - 5) * 60_000);
    const clamped = clampStartToTimeline(start, 50, base());
    expect(minutesFromBase(clamped)).toBe(TOTAL_MINUTES - 50);
  });
});

describe('timeForOffset', () => {
  it('maps a tap Y-position to a snapped start time', () => {
    // 120 minutes down = 09:00; snaps to 5-min granularity.
    const offset = 122 * PIXELS_PER_MINUTE;
    expect(minutesFromBase(timeForOffset(offset, 50, base()))).toBe(120);
  });

  it('clamps a tap past the timeline end into the window', () => {
    const offset = (TOTAL_MINUTES + 60) * PIXELS_PER_MINUTE;
    expect(minutesFromBase(timeForOffset(offset, 50, base()))).toBe(
      TOTAL_MINUTES - 50,
    );
  });

  it('clamps a negative tap to the day start', () => {
    expect(minutesFromBase(timeForOffset(-100, 50, base()))).toBe(0);
  });
});
