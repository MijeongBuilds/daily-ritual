/**
 * Tests for the platform-appropriate Google client-ID reader.
 *
 * `expo-constants` and `react-native`'s Platform are mocked so we can exercise
 * each platform branch and the placeholder guard without a device. The key
 * behaviour under review: web/other platforms must resolve to `null` (a Google
 * web client cannot complete a secretless PKCE code exchange), so the app stays
 * on the mock path instead of selecting an unusable client type.
 */

/* eslint-disable import/first -- jest.mock calls must precede the import of the
   module under test so the mocked modules are wired before it loads. */
const mockExtra: { value: unknown } = { value: undefined };

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    get expoConfig() {
      return { extra: { googleOAuth: mockExtra.value } };
    },
  },
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios', select: undefined as unknown },
}));

import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { getGoogleClientId } from './googleAuthConfig';

// A faithful stand-in for RN's Platform.select that keys off the mocked OS.
function installSelect(): void {
  (Platform as unknown as { select: (specifics: Record<string, unknown>) => unknown }).select = (
    specifics: Record<string, unknown>,
  ) => {
    const os = (Platform as { OS: string }).OS;
    return os in specifics ? specifics[os] : specifics.default;
  };
}

function setPlatform(os: string): void {
  (Platform as { OS: string }).OS = os;
}

beforeEach(() => {
  jest.clearAllMocks();
  installSelect();
  setPlatform('ios');
  mockExtra.value = {
    iosClientId: '111-ios.apps.googleusercontent.com',
    androidClientId: '222-android.apps.googleusercontent.com',
    webClientId: '333-web.apps.googleusercontent.com',
  };
});

// Silence the intentional dev-only console.warn for the placeholder cases.
let warnSpy: jest.SpyInstance;
beforeAll(() => {
  warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterAll(() => {
  warnSpy.mockRestore();
});

describe('getGoogleClientId', () => {
  it('returns the iOS client ID on iOS', () => {
    setPlatform('ios');
    expect(getGoogleClientId()).toBe('111-ios.apps.googleusercontent.com');
  });

  it('returns the Android client ID on Android', () => {
    setPlatform('android');
    expect(getGoogleClientId()).toBe(
      '222-android.apps.googleusercontent.com',
    );
  });

  it('returns null on web even though a web client ID is configured', () => {
    setPlatform('web');
    expect(getGoogleClientId()).toBeNull();
  });

  it('returns null for any other non-mobile platform', () => {
    setPlatform('macos');
    expect(getGoogleClientId()).toBeNull();
  });

  it('returns null when the platform client ID is still a placeholder', () => {
    setPlatform('ios');
    mockExtra.value = {
      iosClientId: 'REPLACE_WITH_IOS_CLIENT_ID.apps.googleusercontent.com',
    };
    expect(getGoogleClientId()).toBeNull();
  });

  it('returns null when googleOAuth config is absent', () => {
    setPlatform('ios');
    mockExtra.value = undefined;
    expect(getGoogleClientId()).toBeNull();
  });

  it('reads from Constants.expoConfig.extra.googleOAuth', () => {
    // Sanity: the mock is wired through the real module accessor.
    expect(Constants.expoConfig?.extra?.googleOAuth).toBeDefined();
  });
});
