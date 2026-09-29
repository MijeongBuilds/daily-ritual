import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  InputAccessoryView,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  DAY_END_HOUR,
  DAY_START_HOUR,
  DayCalendar,
} from '../components/DayCalendar';
import { formatTimeRange } from '../components/formatTime';
import { PrimaryButton } from '../components/PrimaryButton';
import { PriorityChip } from '../components/PriorityChip';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { SecondaryButton } from '../components/SecondaryButton';
import { TextField } from '../components/TextField';
import { CalendarConnectCTA } from '../components/CalendarConnection';
import { useGoogleAuth } from '../auth/GoogleAuthContext';
import { calendarErrorMessage } from '../services/calendar/calendarErrorMessage';
import { useCalendarService } from '../services/calendar/CalendarProvider';
import { findFreeGaps } from '../services/calendar/findFreeGaps';
import type { CalendarEvent, TimeGap } from '../services/calendar/types';
import { useRitual } from '../ritual/RitualContext';
import { TOTAL_STEPS } from '../ritual/steps';
import theme from '../theme/theme';

const DEFAULT_DURATION = 50;
/** ID that ties the numeric field to its "Done" keyboard accessory (iOS). */
const DURATION_ACCESSORY_ID = 'protect-duration-accessory';

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
    intention,
    priorityTitle,
    durationMinutes,
    setDurationMinutes,
    placedSlotStart,
    protectMode,
    existingEventId,
    existingEventStart,
    existingEventEnd,
    placeNewBlock,
    protectExistingEvent,
    clearProtection,
  } = useRitual();

  const calendar = useCalendarService();
  const { isSignedIn } = useGoogleAuth();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Local text buffer so the numeric field can be edited freely.
  const [durationText, setDurationText] = useState(String(durationMinutes));
  // The event the user tapped, pending confirmation in the "use this?" modal.
  const [pendingEvent, setPendingEvent] = useState<CalendarEvent | null>(null);
  const [saving, setSaving] = useState(false);
  // Surfaces a failed real-event creation so the user is not silently dropped
  // onto the Today home without their block being written.
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load today's events from the ACTIVE service (real Google events when
  // signed in, sample data otherwise). Keyed on the service + auth state so it
  // refetches the moment the user connects, and on `reloadKey` for retries.
  const [reloadKey, setReloadKey] = useState(0);

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

  const day = useMemo(() => new Date(), []);

  // When the field is blank/zero, fall back to the default so gap-finding and
  // block placement keep working instead of dropping into a silent dead state.
  const effectiveDuration =
    durationMinutes > 0 ? durationMinutes : DEFAULT_DURATION;
  const durationIsBlank = durationText.trim() === '' || durationMinutes <= 0;

  const fittingGaps: TimeGap[] = useMemo(() => {
    if (loading) {
      return [];
    }
    const { start, end } = dayBounds(day);
    return findFreeGaps(events, start, end, effectiveDuration);
  }, [events, effectiveDuration, loading, day]);

  const noFit = !loading && fittingGaps.length === 0;
  // Something is protected once EITHER a new block is placed OR an existing
  // event has been chosen.
  const hasProtection = protectMode != null;

  function handleDurationChange(text: string): void {
    const cleaned = text.replace(/[^0-9]/g, '');
    setDurationText(cleaned);
    const parsed = parseInt(cleaned, 10);
    setDurationMinutes(Number.isNaN(parsed) ? 0 : parsed);
    // A new duration invalidates a previously placed NEW block (but not a
    // chosen existing event, whose time is fixed by the event itself).
    if (protectMode === 'new-block') {
      placeNewBlock(null);
    }
  }

  function handlePlaceSlot(start: Date): void {
    // Placing a slot means the user is done typing the duration — put the
    // keyboard away so the calendar is fully visible.
    Keyboard.dismiss();
    // If the field was left blank/zero, commit the effective (default)
    // duration so the placed block stays consistent.
    if (durationMinutes !== effectiveDuration) {
      setDurationMinutes(effectiveDuration);
      setDurationText(String(effectiveDuration));
    }
    placeNewBlock(start);
  }

  function handleClearPlaced(): void {
    clearProtection();
  }

  function handleSelectEvent(event: CalendarEvent): void {
    Keyboard.dismiss();
    setPendingEvent(event);
  }

  function confirmUseEvent(): void {
    if (pendingEvent != null) {
      protectExistingEvent(
        pendingEvent.id,
        pendingEvent.start,
        pendingEvent.end,
      );
    }
    setPendingEvent(null);
  }

  async function handleSaveAndContinue(): Promise<void> {
    setSaving(true);
    setSaveError(null);
    try {
      // Only a brand-new block writes to the calendar. Choosing an existing
      // event just records which event is the priority's protected time —
      // nothing new is created. When signed in, this saveFocusBlock creates a
      // REAL event on the user's Google Calendar for their top priority.
      if (protectMode === 'new-block' && placedSlotStart != null) {
        const end = new Date(
          placedSlotStart.getTime() + effectiveDuration * 60_000,
        );
        await calendar.saveFocusBlock({
          title: priorityTitle,
          start: placedSlotStart,
          end,
        });
      }
      // The ritual is set — go straight to the Today home (no separate
      // confirm screen).
      router.replace('/today');
    } catch (err: unknown) {
      // A failed real-event write must NOT lose the user's navigation/context.
      // Surface a friendly message and stay on this screen so they can retry.
      setSaveError(calendarErrorMessage(err, 'save'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenScaffold
      step={3}
      totalSteps={TOTAL_STEPS}
      scroll={false}
      bottomBar={{
        continueLabel: 'Protect it',
        onContinue: () => void handleSaveAndContinue(),
        onBack: () => router.back(),
        continueDisabled: !hasProtection,
        continueLoading: saving,
      }}
    >
      <Pressable
        style={styles.pinned}
        onPress={Keyboard.dismiss}
        accessibilityRole="none"
      >
        {/* Today's intention on top … */}
        {intention.trim().length > 0 && (
          <View style={styles.intentionBlock}>
            <Text style={styles.intentionLabel}>TODAY&apos;S INTENTION</Text>
            <Text style={styles.intentionText}>{intention}</Text>
          </View>
        )}

        {/* … then the ONE priority … */}
        <PriorityChip title={priorityTitle} />

        {/* Just-in-time connect prompt — the natural moment, since the user is
            about to protect real time. Only renders when signed out. */}
        <CalendarConnectCTA message="Connect Google Calendar to see your real events and create this focus block on your actual calendar." />

        {/* … then the minutes input + calendar. */}
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
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
              inputAccessoryViewID={
                Platform.OS === 'ios' ? DURATION_ACCESSORY_ID : undefined
              }
            />
            <Text style={styles.minLabel}>min</Text>
          </View>
        </View>

        {protectMode === 'existing-event' &&
        existingEventStart != null &&
        existingEventEnd != null ? (
          <Text style={styles.helper}>
            Using an existing event as your protected time (
            {formatTimeRange(existingEventStart, existingEventEnd)}). Tap it
            again on the calendar to change, or place a new block instead.
          </Text>
        ) : durationIsBlank && !loading ? (
          <Text style={styles.helper}>
            Enter a number of minutes to protect (defaulting to{' '}
            {DEFAULT_DURATION}).
          </Text>
        ) : !durationIsBlank && noFit ? (
          <Text style={styles.noFit}>
            Your day&apos;s full — shorten the block, tap the timeline to
            protect it anyway, or tap an existing event to use it.
          </Text>
        ) : !durationIsBlank && !loading ? (
          <Text style={styles.helper}>
            Tap a highlighted slot where you want to start, tap the timeline to
            place a block, or tap an existing event to use it. Tap your block
            again to remove it.
          </Text>
        ) : null}
      </Pressable>

      <ScrollView
        style={styles.calendarScroll}
        contentContainerStyle={styles.calendarContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {loading ? (
          <Text style={styles.helper}>Loading your day…</Text>
        ) : loadError != null ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{loadError}</Text>
            <SecondaryButton
              label="Try again"
              onPress={() => setReloadKey((k) => k + 1)}
              style={styles.retryButton}
            />
          </View>
        ) : (
          <DayCalendar
            events={events}
            fittingGaps={protectMode === 'existing-event' ? [] : fittingGaps}
            day={day}
            placedStart={placedSlotStart}
            placedDurationMinutes={effectiveDuration}
            priorityTitle={priorityTitle}
            selectedEventId={existingEventId}
            onPlaceSlot={handlePlaceSlot}
            onClearPlaced={handleClearPlaced}
            onSelectEvent={handleSelectEvent}
          />
        )}
      </ScrollView>

      {/* A failed real-event write surfaces here; navigation is preserved. */}
      {saveError != null && (
        <View style={styles.saveErrorBox}>
          <Text style={styles.saveErrorText}>{saveError}</Text>
        </View>
      )}

      {/* Confirm using an existing event as the protected time. */}
      <Modal
        visible={pendingEvent != null}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingEvent(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Use this as your focus?</Text>
            {pendingEvent != null && (
              <>
                <Text style={styles.modalEvent}>{pendingEvent.title}</Text>
                <Text style={styles.modalWhen}>
                  {formatTimeRange(pendingEvent.start, pendingEvent.end)}
                </Text>
              </>
            )}
            <Text style={styles.modalBody}>
              This existing event becomes your top priority&apos;s protected
              time. No new focus block is created.
            </Text>
            <PrimaryButton
              label="Use this event"
              onPress={confirmUseEvent}
              style={styles.modalPrimary}
            />
            <SecondaryButton
              label="Cancel"
              onPress={() => setPendingEvent(null)}
            />
          </View>
        </View>
      </Modal>

      {/*
        The number pad has no return key, so give iOS a "Done" accessory bar
        to dismiss the keyboard and reveal the calendar again. (Android's
        number-pad dismisses via the system Back button / tapping outside.)
      */}
      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID={DURATION_ACCESSORY_ID}>
          <View style={styles.accessory}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Done editing minutes"
              onPress={Keyboard.dismiss}
              style={styles.accessoryButton}
            >
              <Text style={styles.accessoryText}>Done</Text>
            </TouchableOpacity>
          </View>
        </InputAccessoryView>
      )}
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  pinned: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  intentionBlock: {
    gap: theme.spacing.xs,
  },
  intentionLabel: {
    ...theme.typography.label,
  },
  intentionText: {
    ...theme.typography.body,
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
  saveErrorBox: {
    marginTop: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radii.button,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.accent,
  },
  saveErrorText: {
    ...theme.typography.caption,
    color: theme.colors.accent,
    fontFamily: theme.fonts.sansMedium,
  },
  calendarScroll: {
    flex: 1,
  },
  calendarContent: {
    paddingVertical: theme.spacing.sm,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  modalCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.card,
    padding: theme.spacing.xl,
    gap: theme.spacing.sm,
    ...theme.shadows.card,
  },
  modalTitle: {
    ...theme.typography.heading,
  },
  modalEvent: {
    ...theme.typography.subheading,
    marginTop: theme.spacing.xs,
  },
  modalWhen: {
    ...theme.typography.caption,
  },
  modalBody: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  modalPrimary: {
    alignSelf: 'stretch',
  },
  accessory: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    backgroundColor: theme.colors.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  accessoryButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  accessoryText: {
    ...theme.typography.button,
    color: theme.colors.primary,
  },
});
