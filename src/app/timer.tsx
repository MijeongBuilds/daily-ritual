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
  elapsedToMinutes,
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
 * Controls: Pause (pauses the count-up) and Stop. On Stop the user says
 * whether they accomplished the task: YES logs the elapsed minutes as the
 * time spent; NO captures a reflection note so nothing is lost.
 */
export default function TimerScreen(): React.ReactElement {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    priorityTitle,
    durationMinutes,
    setMarkedDone,
    addReflection,
  } = useRitual();

  const [running, setRunning] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  // Accumulated seconds from previous run segments (before the current one).
  const accumulatedRef = useRef(0);
  // Wall-clock timestamp (ms) when the current run segment started. Seeded on
  // mount (not in the initializer) so render stays pure.
  const segmentStartRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [stopPrompt, setStopPrompt] = useState(false);
  const [notePrompt, setNotePrompt] = useState(false);
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
    // Freeze the elapsed time and ask whether the task was accomplished.
    accumulatedRef.current = currentElapsed();
    segmentStartRef.current = null;
    setElapsed(accumulatedRef.current);
    setRunning(false);
    setStopPrompt(true);
  }

  function handleAccomplished(): void {
    setStopPrompt(false);
    setMarkedDone(true, elapsedToMinutes(accumulatedRef.current));
    router.replace('/today');
  }

  function handleNotAccomplished(): void {
    setStopPrompt(false);
    setNotePrompt(true);
  }

  function handleSaveNote(): void {
    Keyboard.dismiss();
    if (note.trim().length > 0) {
      addReflection({
        priorityTitle,
        note: note.trim(),
        createdAt: Date.now(),
      });
    }
    setNotePrompt(false);
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

      {/* Stop → did you accomplish the task? */}
      <Modal
        visible={stopPrompt}
        transparent
        animationType="fade"
        onRequestClose={() => setStopPrompt(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Did you accomplish this task?</Text>
            <Text style={styles.cardBody}>
              You focused for {formatElapsed(elapsed)}. We&apos;ll log the
              actual time — no pressure on the goal.
            </Text>
            <PrimaryButton
              label="Yes, it's done"
              onPress={handleAccomplished}
              style={styles.cardPrimary}
            />
            <SecondaryButton
              label="Not yet"
              onPress={handleNotAccomplished}
            />
          </View>
        </View>
      </Modal>

      {/* Not yet → capture a reflection note. */}
      <Modal
        visible={notePrompt}
        transparent
        animationType="fade"
        onRequestClose={() => setNotePrompt(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>What will you do with this?</Text>
            <Text style={styles.cardBody}>
              Jot a quick note so it isn&apos;t lost. We&apos;ll keep it as a
              reflection.
            </Text>
            <TextField
              value={note}
              onChangeText={setNote}
              placeholder="e.g. pick this back up after lunch"
              multiline
              style={styles.noteInput}
            />
            <PrimaryButton
              label="Save note"
              onPress={handleSaveNote}
              style={styles.cardPrimary}
            />
            <SecondaryButton
              label="Skip"
              onPress={() => {
                setNotePrompt(false);
                router.replace('/today');
              }}
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
  noteInput: {
    minHeight: 96,
    textAlignVertical: 'top',
    marginBottom: theme.spacing.sm,
  },
});
