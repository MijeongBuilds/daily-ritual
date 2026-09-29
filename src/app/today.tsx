import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGoogleAuth } from '../auth/GoogleAuthContext';
import {
  CalendarConnectCTA,
  CalendarDisconnect,
} from '../components/CalendarConnection';
import { Card } from '../components/Card';
import { DayCalendar } from '../components/DayCalendar';
import {
  FocusBlockActions,
  PriorityStart,
} from '../components/FocusBlockActions';
import {
  formatMinutesSpent,
  formatTime,
  formatTimeRange,
} from '../components/formatTime';
import { SecondaryButton } from '../components/SecondaryButton';
import { calendarErrorMessage } from '../services/calendar/calendarErrorMessage';
import { useCalendarService } from '../services/calendar/CalendarProvider';
import type { CalendarEvent } from '../services/calendar/types';
import { useRitual } from '../ritual/RitualContext';
import theme from '../theme/theme';

/**
 * The Today home: the destination for the morning ritual's final "Protect it".
 * Layout (top → bottom):
 *   1. Today's INTENTION, prominent.
 *   2. The TOP PRIORITY.
 *   3. The timed day-view calendar with a current-time "now" line (read-only
 *      mocked view; no drag/create/edit yet).
 * The focus block's actions — a "Done" checkbox (with an optional
 * hours/minutes popup) and a "Start" button that opens the count-up timer —
 * live on the top priority card, and any optional note captured from the timer
 * is shown on that same card, below the controls. A "Wrap up the day" button
 * leads to the evening-reflection stub.
 */
export default function TodayScreen(): React.ReactElement {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    intention,
    priorityTitle,
    durationMinutes,
    placedSlotStart,
    protectMode,
    existingEventId,
    existingEventStart,
    existingEventEnd,
    markedDone,
    timeSpentMinutes,
    reflections,
    setMarkedDone,
    setPriorityTitle,
  } = useRitual();

  const calendar = useCalendarService();
  const { isSignedIn } = useGoogleAuth();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Inline editing of the priority title. While editing, the title becomes a
  // TextInput seeded from the current value; committing writes back through
  // setPriorityTitle so the change propagates everywhere the priority shows.
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  function beginEditTitle(): void {
    setTitleDraft(priorityTitle);
    setEditingTitle(true);
  }

  function commitEditTitle(): void {
    const trimmed = titleDraft.trim();
    if (trimmed.length > 0) {
      setPriorityTitle(trimmed);
    }
    setEditingTitle(false);
    Keyboard.dismiss();
  }

  // Load today's events from the ACTIVE service (real Google events when
  // signed in, sample data otherwise). Keyed on the service + auth state so it
  // refetches the moment the user connects or disconnects. `reloadKey` lets the
  // retry button re-run the same fetch after a failure.
  const [reloadKey, setReloadKey] = useState(0);

  const retry = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let active = true;
    // All state updates happen inside an async task (after an await tick), not
    // synchronously in the effect body, per the react-hooks lint guidance for
    // bridging an external system (the calendar fetch) into React state.
    const load = async (): Promise<void> => {
      setLoading(true);
      setLoadError(null);
      try {
        const evts = await calendar.getEventsForToday();
        if (active) {
          setEvents(evts);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (active) {
          setEvents([]);
          setLoadError(calendarErrorMessage(err, 'load'));
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [calendar, isSignedIn, reloadKey]);

  const now = useMemo(() => new Date(), []);

  // Resolve the protected window from whichever mode is active.
  const focusStart =
    protectMode === 'existing-event' ? existingEventStart : placedSlotStart;
  const focusEnd =
    protectMode === 'existing-event'
      ? existingEventEnd
      : placedSlotStart != null
        ? new Date(placedSlotStart.getTime() + durationMinutes * 60_000)
        : null;

  const hasFocus = focusStart != null && focusEnd != null;

  // Notes captured from the timer's "Not yet" path for today's priority. They
  // now live directly on the priority card (no separate Reflections section).
  const priorityNotes = useMemo(() => {
    const title = priorityTitle.trim();
    const forPriority =
      title.length > 0
        ? reflections.filter((r) => r.priorityTitle.trim() === title)
        : reflections;
    return forPriority.length > 0 ? forPriority : reflections;
  }, [reflections, priorityTitle]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + theme.spacing.lg,
          paddingBottom: insets.bottom + theme.spacing.xl,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Today's intention — prominent, at the very top. */}
      <Text style={styles.eyebrow}>TODAY&apos;S INTENTION</Text>
      <Text style={styles.heading}>
        {intention.trim().length > 0 ? intention : 'Your day, protected.'}
      </Text>

      {/* Just-in-time connect prompt (only renders when signed out). */}
      <CalendarConnectCTA message="Connect your Google Calendar to see your real day here instead of sample events." />

      {/* 2. The top priority. */}
      <Card style={styles.focusCard}>
        <Text style={styles.cardLabel}>YOUR ONE PRIORITY</Text>

        {/* The done checkbox sits inline to the LEFT of the priority title;
            checking it opens the optional hours/minutes popup. The title
            itself is inline-editable: tapping it turns it into a TextInput
            that commits via setPriorityTitle (single source of truth). */}
        <View style={styles.titleRow}>
          <FocusBlockActions
            done={markedDone}
            timeSpentMinutes={timeSpentMinutes}
            onChangeDone={setMarkedDone}
          />
          {editingTitle ? (
            <TextInput
              value={titleDraft}
              onChangeText={setTitleDraft}
              onBlur={commitEditTitle}
              onSubmitEditing={commitEditTitle}
              placeholder="Your priority"
              placeholderTextColor={theme.colors.textMuted}
              returnKeyType="done"
              autoFocus
              style={styles.focusTitleInput}
              accessibilityLabel="Edit priority title"
            />
          ) : (
            <Pressable
              onPress={beginEditTitle}
              accessibilityRole="button"
              accessibilityLabel="Edit priority title"
              style={styles.focusTitlePress}
            >
              <Text style={styles.focusTitle}>
                {priorityTitle.trim().length > 0
                  ? priorityTitle
                  : 'Your priority'}
              </Text>
            </Pressable>
          )}
        </View>

        <Text style={styles.focusWhen}>
          {hasFocus && focusStart != null && focusEnd != null
            ? formatTimeRange(focusStart, focusEnd)
            : 'No time protected yet'}
        </Text>

        {/* Single aggregate "time spent so far" figure, derived from the
            accumulated actual time. Shown ONLY when there is time data. */}
        {timeSpentMinutes != null && timeSpentMinutes > 0 && (
          <Text style={styles.focusSpent}>
            {formatMinutesSpent(timeSpentMinutes)}
          </Text>
        )}

        {/* Start remains on the top card. */}
        <View style={styles.actions}>
          <PriorityStart done={markedDone} onStart={() => router.push('/timer')} />
        </View>

        {/* Optional note(s) captured from the timer live on this card, below
            the controls, so nothing is lost and there is no separate section.
            Each note shows only the clock time it was left, then the note
            text (the aggregate time spent lives on its own line above). */}
        {priorityNotes.length > 0 && (
          <View style={styles.notes}>
            {priorityNotes.map((r) => (
              <View key={r.createdAt} style={styles.note}>
                <Text style={styles.noteMeta}>
                  {formatTime(new Date(r.createdAt))}
                </Text>
                <Text style={styles.noteText}>{r.note}</Text>
              </View>
            ))}
          </View>
        )}
      </Card>

      {/* 3. Timed day-view calendar with a current-time indicator. */}
      <Text style={styles.sectionLabel}>Your day</Text>
      {loading ? (
        <Text style={styles.loading}>Loading your day…</Text>
      ) : loadError != null ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{loadError}</Text>
          <SecondaryButton
            label="Try again"
            onPress={retry}
            style={styles.retryButton}
          />
        </View>
      ) : (
        <DayCalendar
          events={events}
          day={now}
          placedStart={protectMode === 'new-block' ? placedSlotStart : null}
          placedDurationMinutes={durationMinutes}
          priorityTitle={priorityTitle}
          selectedEventId={
            protectMode === 'existing-event' ? existingEventId : null
          }
          showNowIndicator
        />
      )}

      {/* Stub entry point toward the future evening reflection. */}
      <SecondaryButton
        label="Wrap up the day →"
        onPress={() => router.push('/reflection')}
        style={styles.wrapUp}
      />

      {/* The only settings surface in scope: disconnect Google Calendar
          (only renders when signed in). */}
      <CalendarDisconnect />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingHorizontal: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  eyebrow: {
    ...theme.typography.label,
  },
  heading: {
    ...theme.typography.heading,
  },
  focusCard: {
    gap: theme.spacing.xs,
  },
  cardLabel: {
    ...theme.typography.label,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginTop: theme.spacing.xs,
  },
  focusTitlePress: {
    flexShrink: 1,
  },
  focusTitle: {
    ...theme.typography.subheading,
  },
  focusTitleInput: {
    ...theme.typography.subheading,
    flexShrink: 1,
    flexGrow: 1,
    padding: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  focusWhen: {
    ...theme.typography.caption,
  },
  focusSpent: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontFamily: theme.fonts.sansSemiBold,
  },
  actions: {
    marginTop: theme.spacing.md,
  },
  sectionLabel: {
    ...theme.typography.subheading,
    marginTop: theme.spacing.sm,
  },
  loading: {
    ...theme.typography.caption,
  },
  errorBox: {
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
    borderRadius: theme.radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  errorText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  retryButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 0,
  },
  notes: {
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.md,
  },
  note: {
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.accent,
    paddingLeft: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  noteMeta: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.sansMedium,
  },
  noteText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  wrapUp: {
    marginTop: theme.spacing.md,
    alignSelf: 'stretch',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
});
