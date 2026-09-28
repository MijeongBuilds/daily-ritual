import { formatMinutesDone } from './formatTime';

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
