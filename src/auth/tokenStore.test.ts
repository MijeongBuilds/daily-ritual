/**
 * Tests for the SecureStore-backed token bundle wrapper.
 *
 * expo-secure-store is mocked with an in-memory map so the round-trip logic is
 * verified without a device Keychain. `react-native`'s Platform is mocked per
 * test so we can exercise both the native path and the web no-op guard.
 */

/* eslint-disable import/first -- jest.mock calls must precede the imports of
   the module under test so the mocked modules are wired before it loads. */
const mockStore = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockStore.set(key, value);
  }),
  getItemAsync: jest.fn(async (key: string) => mockStore.get(key) ?? null),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockStore.delete(key);
  }),
}));

// Default to a native platform; individual tests override via setPlatform.
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { deleteTokens, loadTokens, saveTokens } from './tokenStore';
import type { StoredTokens } from './tokenStore';

function setPlatform(os: string): void {
  (Platform as { OS: string }).OS = os;
}

const sample: StoredTokens = {
  accessToken: 'access-abc',
  refreshToken: 'refresh-xyz',
  expiresAt: 1_700_000_000_000,
  scope: 'https://www.googleapis.com/auth/calendar.events',
};

beforeEach(() => {
  mockStore.clear();
  jest.clearAllMocks();
  setPlatform('ios');
});

describe('tokenStore (native)', () => {
  it('round-trips a saved bundle', async () => {
    await saveTokens(sample);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'google_calendar_tokens',
      JSON.stringify(sample),
    );

    const loaded = await loadTokens();
    expect(loaded).toEqual(sample);
  });

  it('returns null when nothing is stored', async () => {
    expect(await loadTokens()).toBeNull();
  });

  it('deletes the stored bundle', async () => {
    await saveTokens(sample);
    await deleteTokens();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
      'google_calendar_tokens',
    );
    expect(await loadTokens()).toBeNull();
  });

  it('normalises a bundle with missing optional fields', async () => {
    mockStore.set(
      'google_calendar_tokens',
      JSON.stringify({ accessToken: 'only-access' }),
    );
    expect(await loadTokens()).toEqual({
      accessToken: 'only-access',
      refreshToken: null,
      expiresAt: null,
      scope: null,
    });
  });

  it('returns null for a malformed (unparseable) stored value', async () => {
    mockStore.set('google_calendar_tokens', 'not-json{');
    expect(await loadTokens()).toBeNull();
  });

  it('returns null when the stored value lacks an access token', async () => {
    mockStore.set(
      'google_calendar_tokens',
      JSON.stringify({ refreshToken: 'r' }),
    );
    expect(await loadTokens()).toBeNull();
  });
});

describe('tokenStore (web no-op guard)', () => {
  beforeEach(() => {
    setPlatform('web');
  });

  it('save is a no-op and does not touch SecureStore', async () => {
    await saveTokens(sample);
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  it('load returns null without touching SecureStore', async () => {
    expect(await loadTokens()).toBeNull();
    expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
  });

  it('delete is a no-op and does not touch SecureStore', async () => {
    await deleteTokens();
    expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
  });
});
