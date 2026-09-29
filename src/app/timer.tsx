import { useRouter } from 'expo-router';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AppState,
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
import { TextField } from '../components/TextField';
import {
  clampElapsed,
  formatElapsed,
  formatGoal,
} from '../ritual/timer';
import { useRitual } from '../ritual/RitualContext';
import theme from '../theme/theme';

/**
 * Count-UP focus timer for the top priority. Starts at 0:00 and counts up,
 * driven off wall-clock time so it survives backgrounding. The aimed-for goal
 * (the minutes set for the task) is shown for reference only — we don't score
 * over/under, we just log the actual time taken.
 *
 * It also RESUMES from the previously-accumulated focus time (persisted in
 * ritual state), so re-entering the timer continues from where it left off
 * rather than restarting at 0:00.
 *
 * Controls: Pause (pauses the count-up) and Stop. On Stop the elapsed time is
 * ALWAYS saved to the priority's time-spent total — whether or not the task is
 * finished. A SINGLE popup then handles the rest: the user picks Done / Not
 * yet AND can, regardless of that choice, optionally leave a note for later.
 * Confirming applies the done-state and saves any non-empty note.
 */
export default function TimerScreen(): React.ReactElement {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    priorityTitle,
    durationMinutes,
    accumulatedFocusSeconds,
    setMarkedDone,
    saveFocusTime,
    addReflection,
  } = useRitual();

  const [running, setRunning] = useState(true);
  const [elapsed, setElapsed] = useState(accumulatedFocusSeconds);
  // Accumulated seconds carried over from previous timer sessions plus any
  // completed segments in this session (before the current running one). Seeded
  // from persisted state so re-entering the timer CONTINUES from prior time.
  const accumulatedRef = useRef(accumulatedFocusSeconds);
  // Wall-clock timestamp (ms) when the current run segment started. Seeded on
  // mount (not in the initializer) so render stays pure.
  const segmentStartRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // A single Stop popup: it holds both the Done / Not-yet choice and an
  // optional note box. `stopDone` tracks the current selection (defaults to
  // "not yet" so the user must opt in to marking it done).
  const [stopPrompt, setStopPrompt] = useState(false);
  const [stopDone, setStopDone] = useState(false);
  const [note, setNote] = useState('');

  const clearTimer = useCallback((): void => {
    if (intervalRef.current != null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const currentElapsed = useCallback((): number => {
    const live =
      segmentStartRef.current != null
        ? (Date.now() - segmentStartRef.current) / 1000
        : 0;
    return clampElapsed(accumulatedRef.current + live);
  }, []);

  const tick = useCallback((): void => {
    setElapsed(currentElapsed());
  }, [currentElapsed]);

  // Start the first run segment on mount (kept out of render for purity).
  useEffect(() => {
    segmentStartRef.current = Date.now();
  }, []);

  // Drive the count-up while running; re-sync on foreground.
  useEffect(() => {
    if (!running) {
      return;
    }
    intervalRef.current = setInterval(tick, 250);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        tick();
      }
    });
    return () => {
      clearTimer();
      sub.remove();
    };
  }, [running, tick, clearTimer]);

  function handlePause(): void {
    if (running) {
      // Fold the current segment into the accumulated total, then pause.
      accumulatedRef.current = currentElapsed();
      segmentStartRef.current = null;
      setElapsed(accumulatedRef.current);
      setRunning(false);
    } else {
      // Resume: start a fresh segment.
      segmentStartRef.current = Date.now();
      setRunning(true);
    }
  }

  function handleStop(): void {
    // Freeze the elapsed time and ALWAYS save it — the time counts whether or
    // not the task ends up finished, and it lets a later session resume from
    // this total. Then open the SINGLE popup (Done/Not-yet + optional note).
    accumulatedRef.current = currentElapsed();
    segmentStartRef.current = null;
    setElapsed(accumulatedRef.current);
    setRunning(false);
    saveFocusTime(accumulatedRef.current);
    setStopDone(false);
    setNote('');
    setStopPrompt(true);
  }

  function handleConfirmStop(): void {
    // One confirm handles everything: time is already saved on Stop; apply the
    // Done / Not-yet selection, and save the note if the user left one.
    Keyboard.dismiss();
    setMarkedDone(stopDone, null);
    if (note.trim().length > 0) {
      addReflection({
        priorityTitle,
        note: note.trim(),
        createdAt: Date.now(),
        // Time is frozen and saved on Stop, so accumulatedRef holds the total
        // focus seconds at this moment. Capture it as whole minutes done.
        minutesSpentAtSave: Math.round(accumulatedRef.current / 60),
      });
    }
    setStopPrompt(false);
    router.replace('/today');
  }

  const goalLabel = useMemo(
    () => formatGoal(durationMinutes),
    [durationMinutes],
  );

  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop: insets.top + theme.spacing.xl,
          paddingBottom: insets.bottom + theme.spacing.xl,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>IN FOCUS</Text>
        <Text style={styles.priority} numberOfLines={2}>
          {priorityTitle.trim().length > 0 ? priorityTitle : 'Your priority'}
        </Text>
      </View>

      {/* Count-up display inside a brand-colored ring. */}
      <View style={styles.ringOuter}>
        <View style={styles.ringInner}>
          <Text style={styles.clock}>{formatElapsed(elapsed)}</Text>
          <Text style={styles.goal}>{goalLabel}</Text>
          <Text style={styles.state}>{running ? 'Counting up…' : 'Paused'}</Text>
        </View>
      </View>

      <View style={styles.controls}>
        <SecondaryButton
          label={running ? 'Pause' : 'Resume'}
          onPress={handlePause}
          style={styles.control}
        />
        <PrimaryButton
          label="Stop"
          onPress={handleStop}
          style={styles.control}
        />
      </View>

      {/* Stop → a SINGLE popup: Done / Not-yet choice AND an optional note
          box (available regardless of the choice). One confirm applies both. */}
      <Modal
        visible={stopPrompt}
        transparent
        animationType="fade"
        onRequestClose={() => setStopPrompt(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Nice focus.</Text>
            <Text style={styles.cardBody}>
              You focused for {formatElapsed(elapsed)}. We&apos;ve logged the
              actual time — no pressure on the goal.
            </Text>

            {/* Done / Not-yet toggle. */}
            <View style={styles.toggleRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: stopDone }}
                accessibilityLabel="Mark priority done"
                onPress={() => setStopDone(true)}
                style={[
                  styles.toggleButton,
                  stopDone ? styles.toggleDoneSelected : styles.toggleUnselected,
                ]}
              >
                {stopDone && <Text style={styles.doneCheck}>✓</Text>}
                <Text
                  style={[
                    styles.toggleLabel,
                    stopDone && styles.toggleLabelOnPrimary,
                  ]}
                >
                  Done
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: !stopDone }}
                accessibilityLabel="Mark priority not yet done"
                onPress={() => setStopDone(false)}
                style={[
                  styles.toggleButton,
                  !stopDone
                    ? styles.toggleNotYetSelected
                    : styles.toggleUnselected,
                ]}
              >
                <View style={[styles.radio, !stopDone && styles.radioSelected]}>
                  {!stopDone && <View style={styles.radioDot} />}
                </View>
                <Text style={styles.toggleLabel}>Not yet</Text>
              </Pressable>
            </View>

            {/* Optional note — available whichever choice is selected. */}
            <Text style={styles.noteLabel}>Leave some notes for later</Text>
            <TextField
              value={note}
              onChangeText={setNote}
              placeholder="e.g. pick this back up after lunch (optional)"
              multiline
              style={styles.noteInput}
            />

            <PrimaryButton
              label="Done"
              onPress={handleConfirmStop}
              style={styles.cardPrimary}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.xl,
    justifyContent: 'space-between',
  },
  header: {
    gap: theme.spacing.xs,
    alignItems: 'center',
  },
  eyebrow: {
    ...theme.typography.label,
  },
  priority: {
    ...theme.typography.heading,
    textAlign: 'center',
  },
  ringOuter: {
    alignSelf: 'center',
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 10,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.card,
  },
  ringInner: {
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  clock: {
    fontFamily: theme.fonts.serifBold,
    fontSize: theme.fontSizes.display,
    lineHeight: 52,
    color: theme.colors.text,
  },
  goal: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontFamily: theme.fonts.sansSemiBold,
  },
  state: {
    ...theme.typography.caption,
  },
  controls: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  control: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.card,
    padding: theme.spacing.xl,
    gap: theme.spacing.sm,
    ...theme.shadows.card,
  },
  cardTitle: {
    ...theme.typography.heading,
  },
  cardBody: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
  },
  cardPrimary: {
    alignSelf: 'stretch',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    minHeight: 48,
    borderRadius: theme.radii.button,
    paddingHorizontal: theme.spacing.md,
  },
  toggleUnselected: {
    backgroundColor: theme.colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  toggleDoneSelected: {
    backgroundColor: theme.colors.primary,
  },
  toggleNotYetSelected: {
    backgroundColor: theme.colors.card,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  toggleLabel: {
    ...theme.typography.body,
    fontFamily: theme.fonts.sansSemiBold,
    color: theme.colors.text,
  },
  toggleLabelOnPrimary: {
    color: theme.colors.onPrimary,
  },
  doneCheck: {
    color: theme.colors.onPrimary,
    fontFamily: theme.fonts.sansBold,
    fontSize: theme.fontSizes.md,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: theme.radii.chip,
    borderWidth: 2,
    borderColor: theme.colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: theme.colors.primary,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: theme.radii.chip,
    backgroundColor: theme.colors.primary,
  },
  noteLabel: {
    ...theme.typography.caption,
    fontFamily: theme.fonts.sansMedium,
    color: theme.colors.text,
  },
  noteInput: {
    minHeight: 96,
    textAlignVertical: 'top',
    marginBottom: theme.spacing.sm,
  },
});
