/**
 * Static Google OAuth configuration for the on-device (serverless, PKCE) flow.
 *
 * ARCHITECTURE (locked — PATH B): the app talks directly to Google with no
 * backend of our own. Authorization uses the authorization-code + PKCE flow
 * from expo-auth-session, so there is NO client secret anywhere in this app.
 * The client IDs are public identifiers, read at runtime from app config
 * (app.json -> expo.extra.googleOAuth) via expo-constants; the user pastes
 * their real Google Cloud client IDs there. See README "Google Calendar
 * configuration".
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Google's OAuth 2.0 endpoints. `useAuthRequest` and the token/refresh/revoke
 * calls all read from this discovery document. Values per Google's OpenID /
 * OAuth documentation.
 */
export const googleDiscovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
} as const;

/**
 * The single OAuth scope this app requests: read + create calendar events.
 * Intentionally narrow (NOT full-calendar) so the consent screen asks only
 * for what the morning-ritual flow needs.
 */
export const CALENDAR_EVENTS_SCOPE =
  'https://www.googleapis.com/auth/calendar.events';

/**
 * Extra authorization params so Google returns a long-lived refresh token:
 * - `access_type: 'offline'` requests a refresh_token alongside the access
 *   token, letting {@link AuthSession.refreshAsync} renew access without a new
 *   browser round-trip.
 * - `prompt: 'consent'` forces the consent screen so a refresh_token is issued
 *   even on re-authorization (Google only returns it on first consent
 *   otherwise).
 *
 * DELIBERATE UX TRADE-OFF: `prompt: 'consent'` re-shows Google's consent screen
 * on EVERY sign-in, which is heavier than necessary for a returning user. We
 * accept that cost because this app is serverless (PATH B) and has nowhere to
 * stash a refresh token server-side; guaranteeing Google returns one on each
 * authorization is what makes the on-device silent-refresh path reliable. If a
 * backend is added later, this can relax to `prompt: 'select_account'` (or be
 * dropped) and the refresh token kept server-side instead. See README.
 */
export const googleExtraParams: Record<string, string> = {
  access_type: 'offline',
  prompt: 'consent',
};

/** The shape stored under app.json -> expo.extra.googleOAuth. */
interface GoogleOAuthExtra {
  iosClientId?: string;
  androidClientId?: string;
  webClientId?: string;
}

/** Prefix Google appends to every generated client ID. */
const PLACEHOLDER_PREFIX = 'REPLACE_WITH_';

/**
 * Read the platform-appropriate Google OAuth client ID from app config.
 *
 * @returns the client ID string, or `null` when it is missing or still the
 * `REPLACE_WITH_*` placeholder (a clear console warning is emitted so the
 * developer knows to paste their real ID into app.json). Callers should treat
 * a `null` client ID as "OAuth not configured" and stay on the mock/offline
 * path.
 */
export function getGoogleClientId(): string | null {
  const extra = Constants.expoConfig?.extra?.googleOAuth as
    | GoogleOAuthExtra
    | undefined;

  // Only iOS and Android are supported targets for this serverless PKCE flow.
  // A Google WEB client cannot exchange an authorization code without a client
  // secret (which PKCE deliberately never sends), so selecting the web client
  // on web/other platforms would silently point at a client type that can't
  // complete sign-in. Web is out of scope anyway (SecureStore no-ops there and
  // a native dev build is required), so we return null for the non-mobile case
  // and let the app stay on the mock/offline path. The webClientId still lives
  // in app.json for future web support but is intentionally not selected here.
  const clientId = Platform.select({
    ios: extra?.iosClientId,
    android: extra?.androidClientId,
    default: null,
  });

  if (!clientId || clientId.startsWith(PLACEHOLDER_PREFIX)) {
    if (__DEV__) {
      console.warn(
        '[googleAuth] Google OAuth client ID is not configured for this ' +
          'platform. Paste your real client IDs into app.json ' +
          '(expo.extra.googleOAuth). Google Calendar sign-in is disabled ' +
          'until then; the app falls back to the mock calendar.',
      );
    }
    return null;
  }

  return clientId;
}
