# Daily Ritual

A calm, guided **morning ritual** app built with [Expo](https://expo.dev) and React Native (TypeScript). It walks you through a short card flow each morning — set an intention, choose your one top priority, protect time for it on your calendar, and confirm — so the day starts with focus.

This repository contains the first vertical slice: a centralized design-token theme, a mocked calendar service with pure free-gap-finding logic, and the four-step morning-ritual flow (Intention → Priority → Protect It → Confirm) built with [Expo Router](https://docs.expo.dev/router/introduction/).

## Requirements

- [Node.js](https://nodejs.org) 18+ (Node 22 recommended)
- The **Expo Go** app on your iOS or Android phone (from the App Store / Play Store). This project targets **Expo SDK 57**, which matches the current Expo Go store release.

## Getting started

```bash
npm install
npx expo start
```

`npx expo start` prints a QR code in the terminal. Open **Expo Go** on your phone and scan it (iOS: use the Camera app; Android: scan from within Expo Go). Your phone and computer must be on the same network. The app reloads automatically as you edit files.

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
    protect.tsx             Step 3 — Protect It (duration + calendar)
    confirm.tsx             Step 4 — Confirm & save (mocked)
  components/               Shared UI (ScreenScaffold, RitualHeader,
                            BottomBar, Card, buttons, TextField,
                            PriorityChip, DayCalendar)
  ritual/                   RitualContext (intention, priority, duration,
                            placed slot) + step count
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

- **Calendar is in-memory sample data.** There is no real calendar integration. A `MockCalendarService` returns a fixed set of sample events for today, hidden behind the `CalendarService` interface so a real backend can replace it later without touching the ritual screens.
- **No Google OAuth and no backend.** Nothing signs in, and there is no server or database.
- **No notifications.**
- **Saving a focus block is simulated.** The "Confirm" step does not write to any real calendar; it just completes the flow.
- **Out of scope:** the evening ritual, the "today home" screen, and minor / secondary priorities. This slice covers only the four-step morning flow: Intention → Priority → Protect It → Confirm.

## Architecture

- **`CalendarService` interface.** All calendar access goes through a provider-agnostic interface (`src/services/calendar/CalendarService.ts`). The current implementation is `MockCalendarService` (in-memory sample events); a real `GoogleCalendarService` can implement the same interface later without changing the ritual flow.
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
