# Daily Ritual

A calm, guided **morning ritual** app built with [Expo](https://expo.dev) and React Native (TypeScript). It walks you through a short card flow each morning — set an intention, choose your one top priority, and protect time for it on your calendar — so the day starts with focus.

This repository contains the first vertical slice: a centralized design-token theme, a mocked calendar service with pure free-gap-finding logic, the three-step morning-ritual flow (Intention → Priority → Protect It), and a **Today home** where the day plays out — all built with [Expo Router](https://docs.expo.dev/router/introduction/).

On **Protect It** you set the number of minutes to protect and either tap a highlighted free gap (at the exact time you want to start), tap anywhere on the timeline to place a block, or tap an **existing calendar event** to designate that event as your priority's protected time (no new block is created). Tapping your placed block again removes it. Saving lands you directly on the **Today home** (there is no separate confirm screen).

The **Today home** shows your intention at the very top, then your one priority, then a standard timed day-view calendar (hour gutter on the left, events placed against the grid, a current-time "now" line). On the focus block you get two actions: a **Done** checkbox (which opens an optional hours/minutes popup to log the actual time it took) and a **Start** button that opens a **count-up focus timer**. The timer counts up from 0:00 (showing the aimed-for goal for reference), supports pause/resume and stop; on stop it asks whether you accomplished the task — "yes" logs the actual time, "not yet" captures a reflection note that is surfaced back on the Today home. A "Wrap up the day" button opens the evening **Wrap up your day** page — review whether your priority got done (a **Done / Not yet** toggle kept in sync with the Today home), re-read the notes you left during the day, and jot three optional free-text entries: the day's highlight, what you learned, and tomorrow's top priority. "Save & close the day" stores them and returns you to the Today home.

## Requirements

- [Node.js](https://nodejs.org) 18+ (Node 22 recommended)
- The **Expo Go** app on your iOS or Android phone (from the App Store / Play Store) for the signed-out flow. This project targets **Expo SDK 57**, which matches the current Expo Go store release.
- To use **real Google Calendar** (read + create events), a **development build** is required — Expo Go cannot complete custom-scheme OAuth. See [Google Calendar configuration](#google-calendar-configuration).

## Getting started

```bash
npm install
npx expo start
```

`npx expo start` prints a QR code in the terminal. Open **Expo Go** on your phone and scan it (iOS: use the Camera app; Android: scan from within Expo Go). Your phone and computer must be on the same network. The app reloads automatically as you edit files.

## Google Calendar configuration

Daily Ritual reads your **real Google Calendar** (today's events) and can create a **real event** for your top priority when you protect time — all through on-device Google OAuth (PKCE, **no client secret** in the app, no backend server). When you are signed out, the app falls back to an in-memory `MockCalendarService`, so the flow still runs with sample events. There is a just-in-time **Connect Google Calendar** button on the **Protect It** step and the **Today** home, and a **Disconnect Google Calendar** control on the Today home.

You supply your own OAuth client IDs from the [Google Cloud Console](https://console.cloud.google.com/apis/credentials); nothing real is committed to this repo (only `REPLACE_WITH_*` placeholders).

### 1. Create OAuth client IDs

In **Google Cloud → APIs & Services → Credentials**, create OAuth 2.0 client IDs. Enable the **Google Calendar API** for the project first, and configure the OAuth consent screen with the `.../auth/calendar.events` scope.

| Client type | Required for                         | What to enter                                                                                          |
| ----------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| **iOS**     | Running on iOS (device / simulator)  | **Bundle ID:** `com.dailyritual.app`                                                                   |
| **Android** | Running on Android (device/emulator) | **Package name:** `com.dailyritual.app` + the **SHA-1 fingerprint** of the keystore your dev build signs with |
| **Web**     | Only for web / Expo web testing      | Authorized redirect URIs as needed for web                                                             |

- The app's custom scheme is **`dailyritual`** (see `app.json` → `expo.scheme`); the OAuth redirect uses this scheme.
- Get the Android **SHA-1** from the keystore your development build is signed with. For an EAS build: `eas credentials` (Android → view the build credentials). For a local debug build: `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android`.

### 2. Paste the client IDs into `app.json`

Replace the `expo.extra.googleOAuth` placeholders with your real client IDs:

```jsonc
"extra": {
  "googleOAuth": {
    "iosClientId": "REPLACE_WITH_IOS_CLIENT_ID.apps.googleusercontent.com",
    "androidClientId": "REPLACE_WITH_ANDROID_CLIENT_ID.apps.googleusercontent.com",
    "webClientId": "REPLACE_WITH_WEB_CLIENT_ID.apps.googleusercontent.com"
  }
}
```

These are read at runtime via `expo-constants` (`Constants.expoConfig.extra.googleOAuth`), picking the platform-appropriate ID (iOS / Android / web). **Never commit real IDs** — keep the placeholders in version control.

### 3. ⚠️ A DEVELOPMENT BUILD IS REQUIRED — Expo Go will not work

Google sign-in uses a **custom app scheme** for the OAuth redirect. **Expo Go cannot customize the app scheme in SDK 57, so OAuth cannot complete in Expo Go.** You must build and run a [development build](https://docs.expo.dev/develop/development-builds/introduction/):

```bash
npx expo run:ios        # local iOS dev build (needs a Mac + Xcode)
npx expo run:android    # local Android dev build (needs Android SDK)
# or, in the cloud:
eas build --profile development
```

Because `expo-auth-session`, `expo-crypto`, `expo-web-browser`, and `expo-secure-store` are all standard Expo SDK modules (no bespoke native code), a plain development build is enough — no custom config plugin beyond `app.json` is needed.

When **signed out**, the app uses the in-memory `MockCalendarService`, so the full ritual still runs in plain Expo Go with sample events — you just won't read or write a real calendar until you connect from a development build.

**Push notifications remain out of scope.**

## Scripts

| Command             | What it does                          |
| ------------------- | ------------------------------------- |
| `npm run start`     | Start the Expo dev server (QR code)   |
| `npm run android`   | Start and open on an Android device   |
| `npm run ios`       | Start and open on an iOS device (Mac) |
| `npm test`          | Run the Jest unit tests               |
| `npm run typecheck` | Type-check with `tsc --noEmit`        |
| `npm run lint`      | Lint with the Expo ESLint config      |

## Project structure

```
src/
  app/                      Expo Router routes (each file is a screen)
    _layout.tsx             Root navigator + RitualProvider + font loading
    index.tsx               Step 1 — Intention
    priority.tsx            Step 2 — One top priority (the hero)
    protect.tsx             Step 3 — Protect It (duration + calendar;
                            saves and goes straight to the Today home)
    today.tsx               Today home — intention, priority, timed day
                            calendar with a "now" line, Done checkbox +
                            Start (count-up timer) for the focus block
    timer.tsx               Count-up focus timer (start/pause/stop,
                            accomplished? → log time or save a note)
    reflection.tsx          Evening "Wrap up your day" page — priority
                            Done/Not yet toggle (synced with Today), the
                            day's notes, and three optional free-text fields
  components/               Shared UI (ScreenScaffold, RitualHeader,
                            BottomBar, Card, buttons, TextField,
                            PriorityChip, DayCalendar, FocusBlockActions)
  ritual/                   RitualContext (intention, priority, duration,
                            placed block OR chosen existing event, done +
                            minutes, reflection notes) + step count +
                            pure count-up timer helpers
  theme/
    theme.ts                Single source of truth for colors, fonts,
                            spacing, radii, and shadows. Nothing else in
                            the app should hardcode these values.
  services/
    calendar/
      types.ts              CalendarEvent, TimeGap, FocusBlock types
      CalendarService.ts    Provider-agnostic interface (a real Google
                            Calendar service will implement this later)
      MockCalendarService.ts In-memory sample events for today
      findFreeGaps.ts       Pure, testable free-gap-finding logic
      findFreeGaps.test.ts  Unit tests for the gap logic
```

## What's mocked / out of scope for this slice

This repository is a focused first vertical slice of the morning ritual. To keep it runnable on a phone today without any accounts or servers, the following are **mocked or intentionally left out**:

- **Calendar is real when connected, mocked when signed out.** Connecting Google Calendar (see [Google Calendar configuration](#google-calendar-configuration)) reads your real events and writes a real event for your focus block. When signed out, a `MockCalendarService` returns a fixed set of sample events for today, hidden behind the `CalendarService` interface so screens don't care which provider is active. **Real Google sign-in needs a development build (not Expo Go).**
- **No backend.** OAuth is on-device (PKCE, serverless); there is no server or database, and ritual state is not synced anywhere.
- **No notifications.**
- **Saving a focus block writes to Google Calendar only when signed in.** When signed out, "Protect It" simulates the save and lands on the Today home. (Choosing an existing event creates nothing — it only records which event is your protected time, whether real or sample.)
- **Ritual state is in-memory.** The Today home reads the intention, priority, protected time, done/minutes, and any reflection notes from an in-memory context — nothing is persisted across app restarts in this slice.
- **The evening wrap-up is in-memory too.** The "Wrap up your day" page reviews the priority's done state, shows the notes left during the day, and captures three optional free-text entries (highlight, what you learned, tomorrow's top priority). These are stored in the same in-memory context and are not persisted across restarts. Tomorrow's top priority is kept as a carry-forward but is not yet wired into the next morning's ritual, and there is no "this week" achievements screen yet.
- **Out of scope:** a "this week" achievements screen, seeding tomorrow's morning ritual from the wrap-up carry-forward, a backend / server sync, settings beyond connect/disconnect Google Calendar, **push notifications**, and minor / secondary priorities.

## Architecture

- **`CalendarService` interface + provider selection.** All calendar access goes through a provider-agnostic interface (`src/services/calendar/CalendarService.ts`). `GoogleCalendarService` (Google Calendar REST v3) and `MockCalendarService` (in-memory sample events) both implement it; a `CalendarProvider` (`useCalendarService()`) picks the real service when signed in and the mock otherwise, so the ritual screens never import a concrete service.
- **On-device Google OAuth (serverless).** `src/auth/` holds the PKCE auth layer: `GoogleAuthContext` (sign-in/out, `getAccessToken()` with transparent refresh), token persistence in `expo-secure-store`, and pure token-expiry helpers. No client secret and no backend.
- **Free-gap logic is pure and testable.** `findFreeGaps` is a plain function with unit tests, so the scheduling logic is verified without a device.
- **Centralized theme tokens.** All colors, fonts, spacing, radii, and shadows live in `src/theme/theme.ts`. Nothing else in the app hardcodes these values, so the look-and-feel is adjustable in one place.
- **Expo Router navigation.** Each file in `src/app/` is a screen; `_layout.tsx` defines the navigator and loads fonts. Non-route code (components, context, services) stays outside `src/app/`.
- **Fonts:** [Inter](https://fonts.google.com/specimen/Inter) for body/UI and [Playfair Display](https://fonts.google.com/specimen/Playfair+Display) for headings, loaded via `@expo-google-fonts`.

## Verifying the code

No device is needed to check correctness:

```bash
npx tsc --noEmit   # typecheck (zero errors)
npx expo lint      # lint (zero errors)
npm test           # run the unit tests
```
