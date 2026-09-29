/**
 * Pure helper for Google's native OAuth redirect URI.
 *
 * WHY THIS EXISTS: Google's iOS and Android OAuth client types do NOT accept an
 * arbitrary app scheme (e.g. `dailyritual://`) as the authorization redirect.
 * They require the "reversed client ID" redirect, i.e. for a client ID
 * `123-abc.apps.googleusercontent.com` the redirect must be
 * `com.googleusercontent.apps.123-abc:/oauth2redirect`. Passing a plain app
 * scheme causes Google to reject the authorization request with
 * `redirect_uri_mismatch` before any code is returned, so nothing downstream
 * (code exchange, refresh, list, insert) can ever run on a device.
 *
 * The SDK-57 AuthSession docs expose `makeRedirectUri({ native })` precisely so
 * you can supply this provider-specific native redirect; this module computes
 * the correct `native` value from the client ID. Keeping it pure means it can
 * be unit-tested against fixed inputs without a device, simulator, or network.
 */

/** Suffix Google appends to every generated OAuth client ID. */
const GOOGLE_CLIENT_ID_SUFFIX = '.apps.googleusercontent.com';

/** Path component Google expects on the reversed-client-ID native redirect. */
const OAUTH_REDIRECT_PATH = ':/oauth2redirect';

/**
 * Compute Google's reversed-client-ID native redirect URI from a full OAuth
 * client ID.
 *
 * @param clientId A Google OAuth client ID, e.g.
 *   `123-abc.apps.googleusercontent.com`.
 * @returns The native redirect, e.g.
 *   `com.googleusercontent.apps.123-abc:/oauth2redirect`, or `null` when the
 *   client ID is missing or not in the expected
 *   `<id>.apps.googleusercontent.com` shape (the caller should then stay on the
 *   mock/offline path rather than send Google a redirect it will reject).
 */
export function reversedClientIdRedirect(
  clientId: string | null | undefined,
): string | null {
  if (!clientId || !clientId.endsWith(GOOGLE_CLIENT_ID_SUFFIX)) {
    return null;
  }
  const id = clientId.slice(0, -GOOGLE_CLIENT_ID_SUFFIX.length);
  if (id.length === 0) {
    return null;
  }
  return `com.googleusercontent.apps.${id}${OAUTH_REDIRECT_PATH}`;
}
