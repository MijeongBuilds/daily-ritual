/**
 * Pure token-expiry decision logic.
 *
 * The Google OAuth access token lives for a limited time (typically an hour).
 * Rather than sprinkle timing math through the auth context (which would make
 * it untestable without a device or network), the single decision — "is this
 * token too close to expiry to keep using?" — is extracted here as a pure
 * function that can be unit-tested against a fixed clock.
 */

/**
 * Default safety margin (in milliseconds) applied when deciding whether a
 * token is expired. We refresh a little early so an in-flight calendar
 * request never races the token's true expiry.
 */
export const DEFAULT_EXPIRY_MARGIN_MS = 60_000; // 60s

/**
 * Decide whether an access token should be treated as expired (and therefore
 * refreshed before use).
 *
 * @param expiresAt   Absolute expiry time in epoch milliseconds, or `null`
 *                    when unknown. A `null` expiry is treated as expired so
 *                    the caller refreshes defensively rather than sending a
 *                    possibly-dead token.
 * @param now         Current time in epoch milliseconds (injected for tests).
 * @param marginMs    How long before the true expiry to start treating the
 *                    token as stale. Defaults to {@link DEFAULT_EXPIRY_MARGIN_MS}.
 * @returns `true` when the token is expired or within `marginMs` of expiry.
 */
export function isTokenExpired(
  expiresAt: number | null,
  now: number,
  marginMs: number = DEFAULT_EXPIRY_MARGIN_MS,
): boolean {
  if (expiresAt == null) {
    return true;
  }
  const safeMargin = marginMs > 0 ? marginMs : 0;
  return now >= expiresAt - safeMargin;
}

/**
 * Convert an OAuth `expires_in` (seconds-from-now) plus the moment it was
 * issued into an absolute epoch-ms expiry, matching what {@link isTokenExpired}
 * expects. Returns `null` when `expiresIn` is missing (some providers omit it,
 * meaning the token does not expire) so the bundle records "unknown expiry".
 *
 * @param expiresInSeconds The `expires_in` field from the token response.
 * @param issuedAtMs       When the token was issued, epoch ms (defaults to now).
 */
export function computeExpiresAt(
  expiresInSeconds: number | null | undefined,
  issuedAtMs: number = Date.now(),
): number | null {
  if (expiresInSeconds == null || Number.isNaN(expiresInSeconds)) {
    return null;
  }
  return issuedAtMs + expiresInSeconds * 1000;
}
