import React, { useState } from 'react';
import { Keyboard, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import theme from '../theme/theme';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';
import { TextField } from './TextField';

export interface FocusBlockActionsProps {
  /** Whether the priority is currently marked done. */
  done: boolean;
  /** Actual minutes recorded, or null if none entered. */
  timeSpentMinutes: number | null;
  /**
   * Mark (or unmark) the priority done. `minutes` is null when the user did
   * not enter a time.
   */
  onChangeDone: (done: boolean, minutes: number | null) => void;
  /** Start the count-up focus timer. */
  onStart: () => void;
}

/** Split whole minutes into hours + minutes for display. */
function splitMinutes(total: number | null): { h: string; m: string } {
  if (total == null || total <= 0) {
    return { h: '', m: '' };
  }
  return {
    h: total >= 60 ? String(Math.floor(total / 60)) : '',
    m: String(total % 60),
  };
}

/**
 * The two actions offered on the focus block on the Today home:
 *
 * - "Done": a checkbox. Checking it opens an OPTIONAL popup to log how long
 *   the task took, in HOURS and MINUTES (the user can confirm done with no
 *   time). Unchecking clears the done state.
 * - "Start": launches the count-up focus timer screen.
 */
export function FocusBlockActions({
  done,
  timeSpentMinutes,
  onChangeDone,
  onStart,
}: FocusBlockActionsProps): React.ReactElement {
  const [prompt, setPrompt] = useState(false);
  const [hoursText, setHoursText] = useState('');
  const [minutesText, setMinutesText] = useState('');

  function handleToggleDone(): void {
    if (done) {
      // Uncheck → clear done.
      onChangeDone(false, null);
      return;
    }
    // Check → open the optional time popup, seeded from any existing value.
    const { h, m } = splitMinutes(timeSpentMinutes);
    setHoursText(h);
    setMinutesText(m);
    setPrompt(true);
  }

  function confirmDone(): void {
    Keyboard.dismiss();
    const hours = parseInt(hoursText, 10);
    const minutes = parseInt(minutesText, 10);
    const total =
      (Number.isNaN(hours) ? 0 : hours) * 60 +
      (Number.isNaN(minutes) ? 0 : minutes);
    onChangeDone(true, total > 0 ? total : null);
    setPrompt(false);
  }

  const hh = timeSpentMinutes != null ? Math.floor(timeSpentMinutes / 60) : 0;
  const mm = timeSpentMinutes != null ? timeSpentMinutes % 60 : 0;
  const spentLabel =
    timeSpentMinutes != null
      ? hh > 0
        ? `${hh}h ${mm}m spent`
        : `${mm}m spent`
      : null;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: done }}
          accessibilityLabel="Mark this priority done"
          onPress={handleToggleDone}
          style={styles.checkRow}
        >
          <View style={[styles.checkbox, done && styles.checkboxChecked]}>
            {done && <Text style={styles.checkMark}>✓</Text>}
          </View>
          <View style={styles.checkLabelWrap}>
            <Text style={styles.checkLabel}>
              {done ? 'Done for today' : 'Done'}
            </Text>
            {done && spentLabel != null && (
              <Text style={styles.spent}>{spentLabel}</Text>
            )}
          </View>
        </Pressable>

        {!done && (
          <PrimaryButton
            label="Start"
            onPress={onStart}
            style={styles.startButton}
          />
        )}
      </View>

      {/* Optional hours/minutes popup shown when checking Done. */}
      <Modal
        visible={prompt}
        transparent
        animationType="fade"
        onRequestClose={() => setPrompt(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Nice work.</Text>
            <Text style={styles.cardBody}>
              How long did it take? (optional)
            </Text>
            <View style={styles.timeRow}>
              <View style={styles.timeField}>
                <TextField
                  value={hoursText}
                  onChangeText={(t) =>
                    setHoursText(t.replace(/[^0-9]/g, ''))
                  }
                  keyboardType="number-pad"
                  placeholder="0"
                  style={styles.timeInput}
                  maxLength={2}
                />
                <Text style={styles.timeUnit}>hr</Text>
              </View>
              <View style={styles.timeField}>
                <TextField
                  value={minutesText}
                  onChangeText={(t) =>
                    setMinutesText(t.replace(/[^0-9]/g, ''))
                  }
                  keyboardType="number-pad"
                  placeholder="0"
                  style={styles.timeInput}
                  maxLength={3}
                />
                <Text style={styles.timeUnit}>min</Text>
              </View>
            </View>
            <PrimaryButton
              label="Mark done"
              onPress={confirmDone}
              style={styles.cardPrimary}
            />
            <SecondaryButton label="Cancel" onPress={() => setPrompt(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    flexShrink: 1,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: theme.radii.button,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.card,
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
  },
  checkMark: {
    color: theme.colors.onPrimary,
    fontFamily: theme.fonts.sansBold,
    fontSize: theme.fontSizes.md,
  },
  checkLabelWrap: {
    flexShrink: 1,
  },
  checkLabel: {
    ...theme.typography.subheading,
  },
  spent: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontFamily: theme.fonts.sansMedium,
  },
  startButton: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
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
  timeRow: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  timeField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  timeInput: {
    width: 72,
    textAlign: 'center',
    fontFamily: theme.fonts.sansSemiBold,
    fontSize: theme.fontSizes.xl,
  },
  timeUnit: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  cardPrimary: {
    alignSelf: 'stretch',
  },
});
