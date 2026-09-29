/**
 * Secure persistence for the Google OAuth token bundle.
 *
 * Tokens are the keys to the user's calendar, so they are stored with
 * expo-secure-store (Keychain on iOS, Keystore-backed encrypted prefs on
 * Android) rather than plain AsyncStorage. The whole bundle is serialised
 * under a single key.
 *
 * WEB GUARD: expo-secure-store has no web implementation. On web every
 * function becomes a safe no-op (save/delete do nothing, load returns null),
 * so shared code and typechecking stay valid on the web target without
 * throwing. Real OAuth is exercised on a native development build anyway.
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/** Single SecureStore key holding the serialised {@link StoredTokens}. */
const TOKENS_KEY = 'google_calendar_tokens';

/** The persisted OAuth token bundle. */
export interface StoredTokens {
  /** Current access token used as a Bearer credential for calendar calls. */
  accessToken: string;
  /**
   * Long-lived refresh token used to mint new access tokens without a browser
   * round-trip. May be `null` if the provider did not return one.
   */
  refreshToken: string | null;
  /**
   * Absolute expiry of {@link accessToken} in epoch milliseconds, or `null`
   * when the provider did not supply `expires_in` (token assumed non-expiring).
   */
  expiresAt: number | null;
  /** The granted scope string, for reference/diagnostics. */
  scope: string | null;
}

/** True on the web target, where expo-secure-store has no implementation. */
function isWeb(): boolean {
  return Platform.OS === 'web';
}

/** Persist the token bundle. No-op on web. */
export async function saveTokens(tokens: StoredTokens): Promise<void> {
  if (isWeb()) {
    return;
  }
  await SecureStore.setItemAsync(TOKENS_KEY, JSON.stringify(tokens));
}

/**
 * Load the persisted token bundle, or `null` if nothing is stored (or on web,
 * or if the stored value is unparseable/malformed).
 */
export async function loadTokens(): Promise<StoredTokens | null> {
  if (isWeb()) {
    return null;
  }
  const raw = await SecureStore.getItemAsync(TOKENS_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<StoredTokens>;
    if (typeof parsed.accessToken !== 'string') {
      return null;
    }
    return {
      accessToken: parsed.accessToken,
      refreshToken:
        typeof parsed.refreshToken === 'string' ? parsed.refreshToken : null,
      expiresAt:
        typeof parsed.expiresAt === 'number' ? parsed.expiresAt : null,
      scope: typeof parsed.scope === 'string' ? parsed.scope : null,
    };
  } catch {
    // Corrupt/legacy value: treat as absent so the caller re-authenticates.
    return null;
  }
}

/** Delete the persisted token bundle. No-op on web. */
export async function deleteTokens(): Promise<void> {
  if (isWeb()) {
    return;
  }
  await SecureStore.deleteItemAsync(TOKENS_KEY);
}
