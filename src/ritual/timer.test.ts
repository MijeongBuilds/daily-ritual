import {
  clampElapsed,
  elapsedToMinutes,
  formatElapsed,
  formatGoal,
  goalProgress,
} from './timer';

describe('clampElapsed', () => {
  it('floors fractional seconds', () => {
    expect(clampElapsed(65.9)).toBe(65);
  });

  it('never returns a negative value', () => {
    expect(clampElapsed(-10)).toBe(0);
  });

  it('treats NaN as zero', () => {
    expect(clampElapsed(Number.NaN)).toBe(0);
  });
});

describe('formatElapsed', () => {
  it('formats zero as 0:00', () => {
    expect(formatElapsed(0)).toBe('0:00');
  });

  it('formats sub-hour as M:SS with padded seconds', () => {
    expect(formatElapsed(65)).toBe('1:05');
  });

  it('does not pad the leading minute under an hour', () => {
    expect(formatElapsed(5 * 60 + 9)).toBe('5:09');
  });

  it('formats an hour or more as H:MM:SS', () => {
    expect(formatElapsed(3661)).toBe('1:01:01');
  });
});

describe('elapsedToMinutes', () => {
  it('rounds to the nearest minute', () => {
    expect(elapsedToMinutes(90)).toBe(2); // 1.5 min -> 2
    expect(elapsedToMinutes(89)).toBe(1); // 1.48 min -> 1
  });

  it('is zero for zero elapsed', () => {
    expect(elapsedToMinutes(0)).toBe(0);
  });
});

describe('formatGoal', () => {
  it('shows the aimed-for minutes', () => {
    expect(formatGoal(60)).toBe('Goal: 60 min');
    expect(formatGoal(90)).toBe('Goal: 90 min');
  });
});

describe('goalProgress', () => {
  it('is 0 at the start', () => {
    expect(goalProgress(0, 60)).toBe(0);
  });

  it('is 0.5 at half the goal', () => {
    expect(goalProgress(30 * 60, 60)).toBe(0.5);
  });

  it('clamps over-runs to 1', () => {
    expect(goalProgress(120 * 60, 60)).toBe(1);
  });

  it('is 0 when there is no goal', () => {
    expect(goalProgress(600, 0)).toBe(0);
  });
});
