import {
  POMODORO_MINUTES,
  POMODORO_SECONDS,
  clampRemaining,
  formatClock,
  isComplete,
} from './pomodoro';

describe('pomodoro constants', () => {
  it('is a fixed classic 25-minute cycle', () => {
    expect(POMODORO_MINUTES).toBe(25);
    expect(POMODORO_SECONDS).toBe(1500);
  });
});

describe('clampRemaining', () => {
  it('keeps an in-range value (rounded to whole seconds)', () => {
    expect(clampRemaining(900.4)).toBe(900);
  });

  it('never returns a negative value', () => {
    expect(clampRemaining(-30)).toBe(0);
  });

  it('never exceeds a full cycle', () => {
    expect(clampRemaining(POMODORO_SECONDS + 100)).toBe(POMODORO_SECONDS);
  });

  it('treats NaN as zero', () => {
    expect(clampRemaining(Number.NaN)).toBe(0);
  });
});

describe('formatClock', () => {
  it('formats a full cycle as 25:00', () => {
    expect(formatClock(POMODORO_SECONDS)).toBe('25:00');
  });

  it('pads minutes and seconds', () => {
    expect(formatClock(65)).toBe('01:05');
  });

  it('formats zero as 00:00', () => {
    expect(formatClock(0)).toBe('00:00');
  });
});

describe('isComplete', () => {
  it('is false while time remains', () => {
    expect(isComplete(1)).toBe(false);
  });

  it('is true at zero', () => {
    expect(isComplete(0)).toBe(true);
  });

  it('is true if the countdown drifts below zero', () => {
    expect(isComplete(-5)).toBe(true);
  });
});
