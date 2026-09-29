/**
 * Google authentication state for the app (serverless PKCE flow).
 *
 * Mirrors the RitualContext pattern: a createContext + provider + a typed
 * `useGoogleAuth` hook that throws if used outside the provider.
 *
 * Responsibilities:
 * - Run the on-device OAuth authorization-code + PKCE flow via
 *   expo-auth-session (`useAuthRequest` -> `promptAsync` -> `exchangeCodeAsync`).
 * - Persist the resulting tokens in expo-secure-store (see tokenStore).
 * - Hydrate signed-in state from storage on mount.
 * - Hand callers a valid access token via `getAccessToken()`, transparently
 *   refreshing (via `AuthSession.refreshAsync`) when the stored token is
 *   expired/near-expiry.
 *
 * SCOPE (this feature): auth + token lifecycle only. No calendar API calls and
 * no screen wiring — those are FEAT-003/004, which consume `getAccessToken()`.
 *
 * All expo-auth-session API shapes below were confirmed against the SDK-57
 * docs (https://docs.expo.dev/versions/v57.0.0/sdk/auth-session/).
 */

import * as AuthSession from 'expo-auth-session';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as WebBrowser from 'expo-web-browser';

import {
  CALENDAR_EVENTS_SCOPE,
  getGoogleClientId,
  googleDiscovery,
  googleExtraParams,
} from './googleAuthConfig';
import { computeExpiresAt, isTokenExpired } from './tokenExpiry';
import {
  deleteTokens,
  loadTokens,
  saveTokens,
  type StoredTokens,
} from './tokenStore';

// Required by the docs so the auth popup (web) / redirect completes and any
// pending browser session is dismissed. Safe to call at module scope.
WebBrowser.maybeCompleteAuthSession();

/** Redirect URI for the native/dev-build scheme (matches app.json `scheme`). */
const redirectUri = AuthSession.makeRedirectUri({ scheme: 'dailyritual' });

/** Public surface of the Google auth context. */
export interface GoogleAuthContextValue {
  /** Whether we currently hold (hydrated or freshly obtained) tokens. */
  isSignedIn: boolean;
  /** True while a sign-in prompt / code exchange is in flight. */
  isConnecting: boolean;
  /** Human-readable error from the last auth attempt, or `null`. */
  authError: string | null;
  /** Launch the OAuth browser flow. Resolves once the prompt returns. */
  signIn: () => Promise<void>;
  /** Revoke (best-effort) and clear all stored tokens + state. */
  signOut: () => Promise<void>;
  /**
   * Return a currently-valid access token, refreshing transparently when the
   * stored one is expired/near-expiry. Returns `null` when the user is not
   * signed in or a refresh fails irrecoverably (in which case state drops to
   * signed-out so the user can reconnect).
   */
  getAccessToken: () => Promise<string | null>;
}

const GoogleAuthContext = createContext<GoogleAuthContextValue | undefined>(
  undefined,
);

/**
 * Map a raw expo-auth-session TokenResponse into the persisted bundle shape.
 * `expiresIn`/`issuedAt` are seconds per the OAuth spec; we convert to an
 * absolute epoch-ms expiry so the expiry check is clock-comparable.
 */
function toStoredTokens(
  token: AuthSession.TokenResponse,
  previousRefreshToken: string | null,
): StoredTokens {
  const issuedAtMs =
    typeof token.issuedAt === 'number'
      ? token.issuedAt * 1000
      : Date.now();
  return {
    accessToken: token.accessToken,
    // A refresh response may omit refresh_token; keep the previous one.
    refreshToken: token.refreshToken ?? previousRefreshToken,
    expiresAt: computeExpiresAt(token.expiresIn, issuedAtMs),
    scope: token.scope ?? CALENDAR_EVENTS_SCOPE,
  };
}

export function GoogleAuthProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // The in-memory copy of the persisted bundle. A ref (not state) because
  // getAccessToken must read the freshest value synchronously without waiting
  // for a re-render, and refreshing does not itself need to repaint the UI.
  const tokensRef = useRef<StoredTokens | null>(null);

  const clientId = getGoogleClientId();

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      // When unconfigured, pass an empty string so the hook stays valid; the
      // placeholder warning from getGoogleClientId already fired and signIn()
      // guards against actually prompting.
      clientId: clientId ?? '',
      scopes: [CALENDAR_EVENTS_SCOPE],
      redirectUri,
      extraParams: googleExtraParams,
    },
    googleDiscovery,
  );

  const applyTokens = useCallback(async (next: StoredTokens) => {
    tokensRef.current = next;
    await saveTokens(next);
    setIsSignedIn(true);
  }, []);

  const clearSignedOut = useCallback(async () => {
    tokensRef.current = null;
    await deleteTokens();
    setIsSignedIn(false);
  }, []);

  // Hydrate from secure storage on mount so a returning user stays signed in.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await loadTokens();
      if (!cancelled && stored) {
        tokensRef.current = stored;
        setIsSignedIn(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // React to the browser auth response: exchange the code for tokens.
  //
  // All state updates happen inside an async task (after an `await` tick)
  // rather than synchronously in the effect body — this is the documented way
  // to bridge an external event (the OAuth redirect) into React state without
  // triggering cascading synchronous renders.
  useEffect(() => {
    if (!response) {
      return;
    }

    let cancelled = false;

    const handle = async (): Promise<void> => {
      // cancel/dismiss are user-driven, not errors: just stop connecting.
      if (response.type === 'cancel' || response.type === 'dismiss') {
        setIsConnecting(false);
        return;
      }

      if (response.type === 'error') {
        setAuthError(
          response.error?.message ??
            'Google sign-in failed. Please try again.',
        );
        setIsConnecting(false);
        return;
      }

      if (response.type !== 'success') {
        return;
      }

      const code = response.params.code;
      if (!code || !request) {
        setAuthError('Google sign-in did not return an authorization code.');
        setIsConnecting(false);
        return;
      }

      try {
        const token = await AuthSession.exchangeCodeAsync(
          {
            clientId: clientId ?? '',
            code,
            redirectUri,
            // Complete the PKCE handshake with the verifier the request made.
            extraParams: request.codeVerifier
              ? { code_verifier: request.codeVerifier }
              : undefined,
          },
          googleDiscovery,
        );
        if (cancelled) {
          return;
        }
        await applyTokens(toStoredTokens(token, null));
        setAuthError(null);
      } catch {
        if (!cancelled) {
          setAuthError('Could not complete Google sign-in. Please try again.');
        }
      } finally {
        if (!cancelled) {
          setIsConnecting(false);
        }
      }
    };

    void handle();

    return () => {
      cancelled = true;
    };
  }, [response, request, clientId, applyTokens]);

  const signIn = useCallback(async () => {
    if (!clientId) {
      setAuthError(
        'Google Calendar is not configured yet. Add your OAuth client IDs ' +
          'to app.json (expo.extra.googleOAuth).',
      );
      return;
    }
    if (!request) {
      setAuthError('Sign-in is not ready yet. Please try again in a moment.');
      return;
    }
    setAuthError(null);
    setIsConnecting(true);
    // The response is handled by the effect above; ignore the resolved value.
    await promptAsync();
  }, [clientId, request, promptAsync]);

  const signOut = useCallback(async () => {
    const current = tokensRef.current;
    // Best-effort revocation: never let a failed revoke block local sign-out.
    if (current?.accessToken) {
      try {
        await AuthSession.revokeAsync(
          {
            token: current.refreshToken ?? current.accessToken,
            clientId: clientId ?? '',
          },
          googleDiscovery,
        );
      } catch {
        // Provider may not support revocation or the network failed; proceed.
      }
    }
    setAuthError(null);
    await clearSignedOut();
  }, [clientId, clearSignedOut]);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const current = tokensRef.current;
    if (!current) {
      return null;
    }

    // Fresh enough? Hand it back directly.
    if (!isTokenExpired(current.expiresAt, Date.now())) {
      return current.accessToken;
    }

    // Expired/near-expiry: we need a refresh token to renew silently.
    if (!current.refreshToken) {
      await clearSignedOut();
      return null;
    }

    try {
      const refreshed = await AuthSession.refreshAsync(
        {
          clientId: clientId ?? '',
          refreshToken: current.refreshToken,
          scopes: [CALENDAR_EVENTS_SCOPE],
          extraParams: googleExtraParams,
        },
        googleDiscovery,
      );
      const next = toStoredTokens(refreshed, current.refreshToken);
      await applyTokens(next);
      return next.accessToken;
    } catch {
      // invalid_grant etc: the refresh token is dead. Drop to signed-out so
      // the UI can prompt a reconnect rather than looping on a bad token.
      setAuthError('Your Google session expired. Please reconnect.');
      await clearSignedOut();
      return null;
    }
  }, [clientId, applyTokens, clearSignedOut]);

  const value = useMemo<GoogleAuthContextValue>(
    () => ({
      isSignedIn,
      isConnecting,
      authError,
      signIn,
      signOut,
      getAccessToken,
    }),
    [isSignedIn, isConnecting, authError, signIn, signOut, getAccessToken],
  );

  return (
    <GoogleAuthContext.Provider value={value}>
      {children}
    </GoogleAuthContext.Provider>
  );
}

/**
 * Access the Google auth state. Must be used within a
 * {@link GoogleAuthProvider}.
 */
export function useGoogleAuth(): GoogleAuthContextValue {
  const ctx = useContext(GoogleAuthContext);
  if (!ctx) {
    throw new Error('useGoogleAuth must be used within a GoogleAuthProvider');
  }
  return ctx;
}
