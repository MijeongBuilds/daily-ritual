import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '../components/Card';
import { DayCalendar } from '../components/DayCalendar';
import { FocusBlockActions } from '../components/FocusBlockActions';
import { formatTimeRange } from '../components/formatTime';
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
 *   3. The timed day-view calendar with a current-time "now" line. The focus
 *      block gets two actions — a "Done" checkbox (with an optional
 *      hours/minutes popup) and a "Start" button that opens the count-up timer.
 * Any reflection notes captured from the timer are surfaced simply at the
 * bottom so nothing is lost, alongside the evening-reflection stub.
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
        <Text style={styles.focusTitle}>
          {priorityTitle.trim().length > 0 ? priorityTitle : 'Your priority'}
        </Text>
        <Text style={styles.focusWhen}>
          {hasFocus && focusStart != null && focusEnd != null
            ? formatTimeRange(focusStart, focusEnd)
            : 'No time protected yet'}
        </Text>

        {/* Focus-block actions: Done checkbox (+ optional time) and Start. */}
        <View style={styles.actions}>
          <FocusBlockActions
            done={markedDone}
            timeSpentMinutes={timeSpentMinutes}
            onChangeDone={setMarkedDone}
            onStart={() => router.push('/timer')}
          />
        </View>
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

      {/* Reflections captured when a task was not accomplished. */}
      {reflections.length > 0 && (
        <View style={styles.reflections}>
          <Text style={styles.sectionLabel}>Reflections</Text>
          {reflections.map((r) => (
            <Card key={r.createdAt} style={styles.reflectionCard}>
              <Text style={styles.reflectionPriority}>{r.priorityTitle}</Text>
              <Text style={styles.reflectionNote}>{r.note}</Text>
            </Card>
          ))}
        </View>
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
  focusTitle: {
    ...theme.typography.subheading,
    marginTop: theme.spacing.xs,
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
  reflections: {
    gap: theme.spacing.md,
  },
  reflectionCard: {
    gap: theme.spacing.xs,
    padding: theme.spacing.lg,
  },
  reflectionPriority: {
    ...theme.typography.label,
  },
  reflectionNote: {
    ...theme.typography.body,
  },
  wrapUp: {
    marginTop: theme.spacing.md,
    alignSelf: 'stretch',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
});
