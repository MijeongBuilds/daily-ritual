import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '../components/Card';
import { DayCalendar } from '../components/DayCalendar';
import { formatTimeRange } from '../components/formatTime';
import { MarkDoneControl } from '../components/MarkDoneControl';
import { PomodoroTimer } from '../components/PomodoroTimer';
import { SecondaryButton } from '../components/SecondaryButton';
import { mockCalendarService } from '../services/calendar/MockCalendarService';
import type { CalendarEvent } from '../services/calendar/types';
import { useRitual } from '../ritual/RitualContext';
import theme from '../theme/theme';

/**
 * The Today home: the destination for the morning ritual's final "Done". It
 * surfaces the day's intention, the protected focus block, a timed day-view
 * calendar with a current-time indicator, and — for the top priority — two
 * independent tools (a classic pomodoro timer and a "mark as done" control).
 * A stub entry point points toward the future evening reflection.
 */
export default function TodayScreen(): React.ReactElement {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    intention,
    priorityTitle,
    durationMinutes,
    placedSlotStart,
    pomodoroCount,
    markedDone,
    timeSpentMinutes,
    incrementPomodoro,
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

  const focusEnd =
    placedSlotStart != null
      ? new Date(placedSlotStart.getTime() + durationMinutes * 60_000)
      : null;

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
      <Text style={styles.eyebrow}>TODAY</Text>
      <Text style={styles.heading}>
        {intention.trim().length > 0 ? intention : 'Your day, protected.'}
      </Text>

      {/* Focus block summary */}
      <Card style={styles.focusCard}>
        <Text style={styles.cardLabel}>YOUR FOCUS BLOCK</Text>
        <Text style={styles.focusTitle}>
          {priorityTitle.trim().length > 0 ? priorityTitle : 'Your priority'}
        </Text>
        <Text style={styles.focusWhen}>
          {placedSlotStart != null && focusEnd != null
            ? formatTimeRange(placedSlotStart, focusEnd)
            : 'No time protected yet'}
        </Text>
      </Card>

      {/* Two independent tools for the top priority */}
      <Card style={styles.toolCard}>
        <PomodoroTimer
          completedCount={pomodoroCount}
          onComplete={incrementPomodoro}
        />
      </Card>

      <Card style={styles.toolCard}>
        <MarkDoneControl
          done={markedDone}
          timeSpentMinutes={timeSpentMinutes}
          onChange={setMarkedDone}
        />
      </Card>

      {/* Timed day-view calendar with a current-time indicator */}
      <Text style={styles.sectionLabel}>Your day</Text>
      {loading ? (
        <Text style={styles.loading}>Loading your day…</Text>
      ) : (
        <DayCalendar
          events={events}
          day={now}
          placedStart={placedSlotStart}
          placedDurationMinutes={durationMinutes}
          priorityTitle={priorityTitle}
          showNowIndicator
        />
      )}

      {/* Stub entry point toward the future evening reflection */}
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
  toolCard: {
    gap: theme.spacing.md,
  },
  sectionLabel: {
    ...theme.typography.subheading,
    marginTop: theme.spacing.sm,
  },
  loading: {
    ...theme.typography.caption,
  },
  wrapUp: {
    marginTop: theme.spacing.md,
    alignSelf: 'stretch',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
});
