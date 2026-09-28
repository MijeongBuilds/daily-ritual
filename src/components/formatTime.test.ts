import { formatMinutesDone, formatMinutesSpent } from './formatTime';

describe('formatMinutesDone', () => {
  it('shows minutes only when under an hour', () => {
    expect(formatMinutesDone(45)).toBe('45 min done');
    expect(formatMinutesDone(1)).toBe('1 min done');
    expect(formatMinutesDone(59)).toBe('59 min done');
  });

  it('shows hours and minutes at or above an hour', () => {
    expect(formatMinutesDone(65)).toBe('1 hr 5 min done');
    expect(formatMinutesDone(125)).toBe('2 hr 5 min done');
  });

  it('omits the minutes segment on a whole hour', () => {
    expect(formatMinutesDone(60)).toBe('1 hr done');
    expect(formatMinutesDone(120)).toBe('2 hr done');
  });

  it('rounds fractional minutes to the nearest whole minute', () => {
    expect(formatMinutesDone(44.6)).toBe('45 min done');
    expect(formatMinutesDone(0.4)).toBe('0 min done');
  });

  it('clamps non-positive values to zero', () => {
    expect(formatMinutesDone(0)).toBe('0 min done');
    expect(formatMinutesDone(-5)).toBe('0 min done');
  });
});

describe('formatMinutesSpent', () => {
  it('shows minutes only when under an hour', () => {
    expect(formatMinutesSpent(45)).toBe('45 min spent');
    expect(formatMinutesSpent(1)).toBe('1 min spent');
    expect(formatMinutesSpent(59)).toBe('59 min spent');
  });

  it('shows hours and minutes at or above an hour', () => {
    expect(formatMinutesSpent(75)).toBe('1 hr 15 min spent');
    expect(formatMinutesSpent(125)).toBe('2 hr 5 min spent');
  });

  it('omits the minutes segment on a whole hour', () => {
    expect(formatMinutesSpent(60)).toBe('1 hr spent');
    expect(formatMinutesSpent(120)).toBe('2 hr spent');
  });

  it('rounds fractional minutes to the nearest whole minute', () => {
    expect(formatMinutesSpent(44.6)).toBe('45 min spent');
    expect(formatMinutesSpent(0.4)).toBe('0 min spent');
  });

  it('clamps non-positive values to zero', () => {
    expect(formatMinutesSpent(0)).toBe('0 min spent');
    expect(formatMinutesSpent(-5)).toBe('0 min spent');
  });
});
