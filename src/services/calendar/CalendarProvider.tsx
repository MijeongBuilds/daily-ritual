import React, { createContext, useContext, useMemo } from 'react';

import { useGoogleAuth } from '../../auth/GoogleAuthContext';
import type { CalendarService } from './CalendarService';
import { GoogleCalendarService } from './GoogleCalendarService';
import { mockCalendarService } from './MockCalendarService';

/**
 * Selects the ACTIVE {@link CalendarService} based on auth state and exposes
 * it through React context, mirroring the RitualContext pattern (createContext
 * + provider + a typed hook that throws when used outside the provider).
 *
 * - Signed in  -> a memoized {@link GoogleCalendarService} bound to the auth
 *   layer's `getAccessToken` (so it reads/writes the user's real calendar).
 * - Signed out -> the {@link mockCalendarService} fallback, so the UI still
 *   works (and runs in plain Expo Go) before the user connects Google.
 *
 * Screens consume `useCalendarService()` and never import a concrete service
 * directly, so switching providers requires no screen changes. Screen wiring
 * itself lands in FEAT-004; this feature only makes the active service
 * available.
 *
 * NOTE: must be mounted INSIDE `GoogleAuthProvider` so it can read auth state.
 */
const CalendarServiceContext = createContext<CalendarService | undefined>(
  undefined,
);

export function CalendarProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const { isSignedIn, getAccessToken } = useGoogleAuth();

  const service = useMemo<CalendarService>(() => {
    if (isSignedIn) {
      return new GoogleCalendarService(getAccessToken);
    }
    return mockCalendarService;
  }, [isSignedIn, getAccessToken]);

  return (
    <CalendarServiceContext.Provider value={service}>
      {children}
    </CalendarServiceContext.Provider>
  );
}

/**
 * Access the active calendar service. Must be used within a
 * {@link CalendarProvider}.
 */
export function useCalendarService(): CalendarService {
  const ctx = useContext(CalendarServiceContext);
  if (!ctx) {
    throw new Error(
      'useCalendarService must be used within a CalendarProvider',
    );
  }
  return ctx;
}
