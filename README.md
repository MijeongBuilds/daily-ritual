# Daily Ritual

A calm, guided **morning ritual** app built with [Expo](https://expo.dev) and React Native (TypeScript). It walks you through a short card flow each morning — set an intention, choose your one top priority, protect time for it on your calendar, and confirm — so the day starts with focus.

This repository currently contains the first vertical slice's foundation: the app scaffold, a centralized design-token theme, and a mocked calendar service with pure free-gap-finding logic. The ritual screens are built on top of this in later features.

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
App.tsx                     App entry (ritual flow mounts here)
src/
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

## Notes

- The calendar is **mocked** for this slice (in-memory sample events for today) behind the `CalendarService` interface, so a real Google Calendar backend can slot in without touching the ritual flow.
- Fonts: [Inter](https://fonts.google.com/specimen/Inter) for body/UI and [Playfair Display](https://fonts.google.com/specimen/Playfair+Display) for headings, loaded via `@expo-google-fonts`.
