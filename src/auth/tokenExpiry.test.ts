import {
  DEFAULT_EXPIRY_MARGIN_MS,
  computeExpiresAt,
  isTokenExpired,
} from './tokenExpiry';

describe('isTokenExpired', () => {
  const NOW = 1_000_000_000_000; // fixed clock

  it('treats a null expiry as expired (refresh defensively)', () => {
    expect(isTokenExpired(null, NOW)).toBe(true);
  });

  it('is not expired when comfortably in the future', () => {
    // 10 minutes ahead, well past the 60s margin.
    expect(isTokenExpired(NOW + 10 * 60_000, NOW)).toBe(false);
  });

  it('is expired when already past the expiry', () => {
    expect(isTokenExpired(NOW - 1, NOW)).toBe(true);
  });

  it('is expired exactly at the expiry moment', () => {
    expect(isTokenExpired(NOW, NOW, 0)).toBe(true);
  });

  it('refreshes early: within the default margin counts as expired', () => {
    // 30s left, default margin is 60s -> treat as expired.
    expect(isTokenExpired(NOW + 30_000, NOW)).toBe(true);
    // 61s left is outside the 60s margin -> still fresh.
    expect(isTokenExpired(NOW + DEFAULT_EXPIRY_MARGIN_MS + 1_000, NOW)).toBe(
      false,
    );
  });

  it('honours a custom margin', () => {
    // 4 minutes left with a 5-minute margin -> expired.
    expect(isTokenExpired(NOW + 4 * 60_000, NOW, 5 * 60_000)).toBe(true);
    // 6 minutes left with a 5-minute margin -> fresh.
    expect(isTokenExpired(NOW + 6 * 60_000, NOW, 5 * 60_000)).toBe(false);
  });

  it('treats a negative margin as zero (no early refresh)', () => {
    expect(isTokenExpired(NOW + 1, NOW, -100)).toBe(false);
    expect(isTokenExpired(NOW, NOW, -100)).toBe(true);
  });
});

describe('computeExpiresAt', () => {
  it('adds expires_in seconds to the issued-at moment (ms)', () => {
    expect(computeExpiresAt(3600, 1_000)).toBe(1_000 + 3_600_000);
  });

  it('returns null when expires_in is missing (non-expiring token)', () => {
    expect(computeExpiresAt(null, 1_000)).toBeNull();
    expect(computeExpiresAt(undefined, 1_000)).toBeNull();
  });

  it('returns null for a NaN expires_in', () => {
    expect(computeExpiresAt(Number.NaN, 1_000)).toBeNull();
  });
});
