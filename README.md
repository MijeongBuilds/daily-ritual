# Daily Ritual

A calm, guided **morning ritual** app built with [Expo](https://expo.dev) and React Native (TypeScript). It walks you through a short card flow each morning — set an intention, choose your one top priority, and protect time for it on your calendar — so the day starts with focus.

This repository contains the first vertical slice: a centralized design-token theme, a mocked calendar service with pure free-gap-finding logic, the three-step morning-ritual flow (Intention → Priority → Protect It), and a **Today home** where the day plays out — all built with [Expo Router](https://docs.expo.dev/router/introduction/).

On **Protect It** you set the number of minutes to protect and either tap a highlighted free gap (at the exact time you want to start), tap anywhere on the timeline to place a block, or tap an **existing calendar event** to designate that event as your priority's protected time (no new block is created). Tapping your placed block again removes it. Saving lands you directly on the **Today home** (there is no separate confirm screen).

The **Today home** shows your intention at the very top, then your one priority, then a standard timed day-view calendar (hour gutter on the left, events placed against the grid, a current-time "now" line). On the focus block you get two actions: a **Done** checkbox (which opens an optional hours/minutes popup to log the actual time it took) and a **Start** button that opens a **count-up focus timer**. The timer counts up from 0:00 (showing the aimed-for goal for reference), supports pause/resume and stop; on stop it asks whether you accomplished the task — "yes" logs the actual time, "not yet" captures a reflection note that is surfaced back on the Today home. A "Wrap up the day" button opens the evening **Wrap up your day** page — review whether your priority got done (a **Done / Not yet** toggle kept in sync with the Today home), re-read the notes you left during the day, and jot three optional free-text entries: the day's highlight, what you learned, and tomorrow's top priority. "Save & close the day" stores them and returns you to the Today home.

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

- **Calendar is in-memory sample data.** There is no real calendar integration. A `MockCalendarService` returns a fixed set of sample events for today, hidden behind the `CalendarService` interface so a real backend can replace it later without touching the ritual screens.
- **No Google OAuth and no backend.** Nothing signs in, and there is no server or database.
- **No notifications.**
- **Saving a focus block is simulated.** "Protect It" does not write to any real calendar; it just completes the flow and lands on the Today home. (Choosing an existing event creates nothing — it only records which event is your protected time.)
- **Ritual state is in-memory.** The Today home reads the intention, priority, protected time, done/minutes, and any reflection notes from an in-memory context — nothing is persisted across app restarts in this slice.
- **The evening wrap-up is in-memory too.** The "Wrap up your day" page reviews the priority's done state, shows the notes left during the day, and captures three optional free-text entries (highlight, what you learned, tomorrow's top priority). These are stored in the same in-memory context and are not persisted across restarts. Tomorrow's top priority is kept as a carry-forward but is not yet wired into the next morning's ritual, and there is no "this week" achievements screen yet.
- **Out of scope:** a "this week" achievements screen, seeding tomorrow's morning ritual from the wrap-up carry-forward, Google OAuth / real Google Calendar / a backend, settings, notifications, and minor / secondary priorities.

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
