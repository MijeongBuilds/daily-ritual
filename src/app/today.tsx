import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '../components/Card';
import { DayCalendar } from '../components/DayCalendar';
import {
  FocusBlockActions,
  PriorityStart,
} from '../components/FocusBlockActions';
import {
  formatMinutesDone,
  formatTime,
  formatTimeRange,
} from '../components/formatTime';
import { SecondaryButton } from '../components/SecondaryButton';
import { mockCalendarService } from '../services/calendar/MockCalendarService';
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
  } = useRitual();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    mockCalendarService
      .getEventsForToday()
      .then((evts) => {
        if (active) {
          setEvents(evts);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

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

      {/* 2. The top priority. */}
      <Card style={styles.focusCard}>
        <Text style={styles.cardLabel}>YOUR ONE PRIORITY</Text>

        {/* The done checkbox sits inline to the LEFT of the priority title;
            checking it opens the optional hours/minutes popup. */}
        <View style={styles.titleRow}>
          <FocusBlockActions
            done={markedDone}
            timeSpentMinutes={timeSpentMinutes}
            onChangeDone={setMarkedDone}
          />
          <Text style={styles.focusTitle}>
            {priorityTitle.trim().length > 0 ? priorityTitle : 'Your priority'}
          </Text>
        </View>

        <Text style={styles.focusWhen}>
          {hasFocus && focusStart != null && focusEnd != null
            ? formatTimeRange(focusStart, focusEnd)
            : 'No time protected yet'}
        </Text>

        {/* Start remains on the top card. */}
        <View style={styles.actions}>
          <PriorityStart done={markedDone} onStart={() => router.push('/timer')} />
        </View>

        {/* Optional note(s) captured from the timer live on this card, below
            the controls, so nothing is lost and there is no separate section.
            Each note shows the clock time it was left and the time logged so
            far at that moment, then the note text. */}
        {priorityNotes.length > 0 && (
          <View style={styles.notes}>
            {priorityNotes.map((r) => (
              <View key={r.createdAt} style={styles.note}>
                <Text style={styles.noteMeta}>
                  {`${formatTime(new Date(r.createdAt))} \u00b7 ${formatMinutesDone(r.minutesSpentAtSave)}`}
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
  focusTitle: {
    ...theme.typography.subheading,
    flexShrink: 1,
  },
  focusWhen: {
    ...theme.typography.caption,
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
