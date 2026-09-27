import {
  DAY_END_HOUR,
  DAY_START_HOUR,
  clampStartToTimeline,
  startWithinGap,
  timeForOffset,
} from './DayCalendar';
import type { TimeGap } from '../services/calendar/types';

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

describe('startWithinGap', () => {
  // A 9:30–11:00 gap (150 → 240 minutes from the 07:00 base).
  function gap930to1100(): TimeGap {
    const start = new Date(base().getTime() + 150 * 60_000); // 09:30
    const end = new Date(base().getTime() + 240 * 60_000); // 11:00
    return { start, end, durationMinutes: 90 };
  }

  it('places a 30-min block at the middle of an empty gap (tap at 10:00)', () => {
    const gap = gap930to1100();
    // 10:00 is 30 minutes below the gap's own top (09:30).
    const tapInGap = 30 * PIXELS_PER_MINUTE;
    // 10:00 = 180 minutes from the 07:00 base.
    expect(minutesFromBase(startWithinGap(gap, tapInGap, 30, base()))).toBe(180);
  });

  it('clamps a tap near the gap end so the block stays inside the gap', () => {
    const gap = gap930to1100();
    // Tap at the very bottom of the 90-min gap with a 30-min block: latest
    // start is 11:00 - 30 = 10:30 = 210 minutes from base.
    const tapInGap = 90 * PIXELS_PER_MINUTE;
    expect(minutesFromBase(startWithinGap(gap, tapInGap, 30, base()))).toBe(210);
  });

  it('clamps a tap above the gap top back to the gap start', () => {
    const gap = gap930to1100();
    expect(minutesFromBase(startWithinGap(gap, -50, 30, base()))).toBe(150);
  });
});
