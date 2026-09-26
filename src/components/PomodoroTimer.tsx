import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';

import {
  POMODORO_SECONDS,
  clampRemaining,
  formatClock,
} from '../ritual/pomodoro';
import theme from '../theme/theme';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';

export interface PomodoroTimerProps {
  /** How many pomodoros have already been completed for this task. */
  completedCount: number;
  /** Called once each time a full 25-minute cycle completes. */
  onComplete: () => void;
}

/**
 * Classic Pomodoro timer: a FIXED 25-minute cycle with simple START / STOP
 * only (no custom durations, no break cycles). Each completed cycle calls
 * `onComplete` once so the parent can count it; the running total is shown.
 *
 * The countdown is driven off wall-clock time (an end timestamp) rather than
 * counting ticks, so it stays accurate even if the JS timer is throttled or
 * the app is briefly backgrounded.
 */
export function PomodoroTimer({
  completedCount,
  onComplete,
}: PomodoroTimerProps): React.ReactElement {
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(POMODORO_SECONDS);
  // Wall-clock timestamp (ms) when the current cycle should hit zero.
  const endAtRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback((): void => {
    if (intervalRef.current != null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const stop = useCallback((): void => {
    clearTimer();
    endAtRef.current = null;
    setRunning(false);
    setRemaining(POMODORO_SECONDS);
  }, [clearTimer]);

  const finish = useCallback((): void => {
    clearTimer();
    endAtRef.current = null;
    setRunning(false);
    setRemaining(POMODORO_SECONDS);
    onComplete();
  }, [clearTimer, onComplete]);

  const tick = useCallback((): void => {
    if (endAtRef.current == null) {
      return;
    }
    const secondsLeft = clampRemaining((endAtRef.current - Date.now()) / 1000);
    setRemaining(secondsLeft);
    if (secondsLeft <= 0) {
      finish();
    }
  }, [finish]);

  const start = useCallback((): void => {
    endAtRef.current = Date.now() + POMODORO_SECONDS * 1000;
    setRemaining(POMODORO_SECONDS);
    setRunning(true);
  }, []);

  // Drive the countdown while running; re-sync on foreground.
  useEffect(() => {
    if (!running) {
      return;
    }
    intervalRef.current = setInterval(tick, 1000);
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Pomodoro</Text>
        <Text style={styles.count}>
          {completedCount === 1
            ? '1 pomodoro done'
            : `${completedCount} pomodoros done`}
        </Text>
      </View>

      <Text style={styles.clock}>{formatClock(remaining)}</Text>

      {running ? (
        <SecondaryButton label="Stop" onPress={stop} style={styles.action} />
      ) : (
        <PrimaryButton
          label="Start 25 min"
          onPress={start}
          style={styles.action}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.md,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  title: {
    ...theme.typography.label,
  },
  count: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontFamily: theme.fonts.sansSemiBold,
  },
  clock: {
    fontFamily: theme.fonts.serifBold,
    fontSize: theme.fontSizes.display,
    lineHeight: 48,
    color: theme.colors.text,
  },
  action: {
    alignSelf: 'stretch',
  },
});
