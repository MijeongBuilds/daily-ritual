import { reversedClientIdRedirect } from './googleRedirect';

describe('reversedClientIdRedirect', () => {
  it('reverses a normal Google client ID into the oauth2redirect native URI', () => {
    expect(
      reversedClientIdRedirect('123-abc.apps.googleusercontent.com'),
    ).toBe('com.googleusercontent.apps.123-abc:/oauth2redirect');
  });

  it('handles client IDs with dots and dashes in the id segment', () => {
    expect(
      reversedClientIdRedirect(
        '987654321-a1b2c3d4.apps.googleusercontent.com',
      ),
    ).toBe(
      'com.googleusercontent.apps.987654321-a1b2c3d4:/oauth2redirect',
    );
  });

  it('returns null for a null/undefined client ID', () => {
    expect(reversedClientIdRedirect(null)).toBeNull();
    expect(reversedClientIdRedirect(undefined)).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(reversedClientIdRedirect('')).toBeNull();
  });

  it('returns null when the client ID lacks the googleusercontent suffix', () => {
    expect(reversedClientIdRedirect('not-a-google-client-id')).toBeNull();
    expect(
      reversedClientIdRedirect('REPLACE_WITH_IOS_CLIENT_ID'),
    ).toBeNull();
  });

  it('returns null when the suffix is present but the id segment is empty', () => {
    expect(
      reversedClientIdRedirect('.apps.googleusercontent.com'),
    ).toBeNull();
  });
});
