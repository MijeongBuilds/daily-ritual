import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  DAY_END_HOUR,
  DAY_START_HOUR,
  DayCalendar,
} from '../components/DayCalendar';
import { PriorityChip } from '../components/PriorityChip';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { TextField } from '../components/TextField';
import { findFreeGaps } from '../services/calendar/findFreeGaps';
import { mockCalendarService } from '../services/calendar/MockCalendarService';
import type { CalendarEvent, TimeGap } from '../services/calendar/types';
import { useRitual } from '../ritual/RitualContext';
import { TOTAL_STEPS } from '../ritual/steps';
import theme from '../theme/theme';

const DEFAULT_DURATION = 50;

function dayBounds(day: Date): { start: Date; end: Date } {
  const start = new Date(day);
  start.setHours(DAY_START_HOUR, 0, 0, 0);
  const end = new Date(day);
  end.setHours(DAY_END_HOUR, 0, 0, 0);
  return { start, end };
}

/** Step 3: protect the priority by placing a focus block on the calendar. */
export default function ProtectScreen(): React.ReactElement {
  const router = useRouter();
  const {
    priorityTitle,
    durationMinutes,
    setDurationMinutes,
    placedSlotStart,
    setPlacedSlotStart,
  } = useRitual();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  // Local text buffer so the numeric field can be edited freely.
  const [durationText, setDurationText] = useState(String(durationMinutes));

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

  const day = useMemo(() => new Date(), []);

  const fittingGaps: TimeGap[] = useMemo(() => {
    if (loading || durationMinutes <= 0) {
      return [];
    }
    const { start, end } = dayBounds(day);
    return findFreeGaps(events, start, end, durationMinutes);
  }, [events, durationMinutes, loading, day]);

  const noFit = !loading && durationMinutes > 0 && fittingGaps.length === 0;

  function handleDurationChange(text: string): void {
    const cleaned = text.replace(/[^0-9]/g, '');
    setDurationText(cleaned);
    const parsed = parseInt(cleaned, 10);
    setDurationMinutes(Number.isNaN(parsed) ? 0 : parsed);
    // A new duration invalidates the previously placed slot.
    setPlacedSlotStart(null);
  }

  function handlePlaceSlot(start: Date): void {
    setPlacedSlotStart(start);
  }

  return (
    <ScreenScaffold
      step={3}
      totalSteps={TOTAL_STEPS}
      scroll={false}
      bottomBar={{
        continueLabel: 'Save & continue',
        onContinue: () => router.push('/confirm'),
        onBack: () => router.back(),
        continueDisabled: placedSlotStart == null,
      }}
    >
      <View style={styles.pinned}>
        <PriorityChip title={priorityTitle} />

        <View style={styles.durationRow}>
          <View style={styles.durationLabelWrap}>
            <Text style={styles.durationLabel}>Focus for</Text>
            <Text style={styles.durationHint}>
              How many minutes to protect?
            </Text>
          </View>
          <View style={styles.durationInputWrap}>
            <TextField
              value={durationText}
              onChangeText={handleDurationChange}
              keyboardType="number-pad"
              placeholder={String(DEFAULT_DURATION)}
              style={styles.durationInput}
              maxLength={4}
            />
            <Text style={styles.minLabel}>min</Text>
          </View>
        </View>

        {noFit && (
          <Text style={styles.noFit}>
            Your day&apos;s full — shorten the block, move something, or protect
            it anyway.
          </Text>
        )}
        {!noFit && !loading && (
          <Text style={styles.helper}>
            Tap a highlighted slot to protect your priority. Overlap is okay —
            it&apos;s your call.
          </Text>
        )}
      </View>

      <ScrollView
        style={styles.calendarScroll}
        contentContainerStyle={styles.calendarContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <Text style={styles.helper}>Loading your day…</Text>
        ) : (
          <DayCalendar
            events={events}
            fittingGaps={fittingGaps}
            day={day}
            placedStart={placedSlotStart}
            placedDurationMinutes={durationMinutes}
            priorityTitle={priorityTitle}
            onPlaceSlot={handlePlaceSlot}
          />
        )}
      </ScrollView>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  pinned: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  durationLabelWrap: {
    flex: 1,
  },
  durationLabel: {
    ...theme.typography.subheading,
  },
  durationHint: {
    ...theme.typography.caption,
  },
  durationInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  durationInput: {
    width: 80,
    textAlign: 'center',
    fontFamily: theme.fonts.sansSemiBold,
    fontSize: theme.fontSizes.xl,
  },
  minLabel: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  noFit: {
    ...theme.typography.body,
    color: theme.colors.accent,
    fontFamily: theme.fonts.sansMedium,
  },
  helper: {
    ...theme.typography.caption,
  },
  calendarScroll: {
    flex: 1,
  },
  calendarContent: {
    paddingVertical: theme.spacing.sm,
  },
});
