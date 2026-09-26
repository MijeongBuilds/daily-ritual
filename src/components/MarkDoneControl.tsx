import React, { useState } from 'react';
import { Keyboard, StyleSheet, Text, View } from 'react-native';

import theme from '../theme/theme';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';
import { TextField } from './TextField';

export interface MarkDoneControlProps {
  /** Whether the priority is currently marked done. */
  done: boolean;
  /** Minutes recorded when it was marked done, or null if none entered. */
  timeSpentMinutes: number | null;
  /** Mark (or unmark) done. `minutes` is null when no value was entered. */
  onChange: (done: boolean, minutes: number | null) => void;
}

/**
 * "Mark as done" control with an OPTIONAL time-spent entry. This is fully
 * independent of the pomodoro timer: the user can mark the priority done with
 * or without recording minutes, and can undo it.
 */
export function MarkDoneControl({
  done,
  timeSpentMinutes,
  onChange,
}: MarkDoneControlProps): React.ReactElement {
  const [minutesText, setMinutesText] = useState(
    timeSpentMinutes != null ? String(timeSpentMinutes) : '',
  );

  function handleMinutesChange(text: string): void {
    setMinutesText(text.replace(/[^0-9]/g, ''));
  }

  function handleMarkDone(): void {
    Keyboard.dismiss();
    const parsed = parseInt(minutesText, 10);
    const minutes = Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
    onChange(true, minutes);
  }

  function handleUndo(): void {
    onChange(false, null);
  }

  if (done) {
    return (
      <View style={styles.container}>
        <Text style={styles.doneLabel}>✓ Done for today</Text>
        {timeSpentMinutes != null && (
          <Text style={styles.doneMeta}>{`${timeSpentMinutes} min spent`}</Text>
        )}
        <SecondaryButton
          label="Undo"
          onPress={handleUndo}
          style={styles.action}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Mark as done</Text>
      <Text style={styles.hint}>Log time spent (optional).</Text>
      <View style={styles.row}>
        <TextField
          value={minutesText}
          onChangeText={handleMinutesChange}
          keyboardType="number-pad"
          placeholder="e.g. 45"
          style={styles.minutesInput}
          maxLength={4}
          returnKeyType="done"
          onSubmitEditing={Keyboard.dismiss}
        />
        <Text style={styles.minLabel}>min</Text>
      </View>
      <PrimaryButton
        label="Mark done"
        onPress={handleMarkDone}
        style={styles.action}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.sm,
  },
  label: {
    ...theme.typography.subheading,
  },
  hint: {
    ...theme.typography.caption,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  minutesInput: {
    width: 100,
    textAlign: 'center',
    fontFamily: theme.fonts.sansSemiBold,
    fontSize: theme.fontSizes.lg,
  },
  minLabel: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  action: {
    alignSelf: 'stretch',
  },
  doneLabel: {
    ...theme.typography.subheading,
    color: theme.colors.primary,
    fontFamily: theme.fonts.serif,
  },
  doneMeta: {
    ...theme.typography.caption,
  },
});
