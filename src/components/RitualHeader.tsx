import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import theme from '../theme/theme';

export interface RitualHeaderProps {
  /** 1-based index of the current step. */
  step: number;
  /** Total number of steps in the flow. */
  totalSteps: number;
}

/**
 * Shared top chrome for every ritual step: segmented progress dots plus an
 * "N OF N" style step label. Since the Yesterday recap is skipped in this
 * slice, the flow has four steps.
 */
export function RitualHeader({
  step,
  totalSteps,
}: RitualHeaderProps): React.ReactElement {
  const segments = Array.from({ length: totalSteps }, (_, i) => i + 1);

  return (
    <View style={styles.container}>
      <View style={styles.dots}>
        {segments.map((s) => {
          const isDone = s < step;
          const isCurrent = s === step;
          return (
            <View
              key={s}
              style={[
                styles.dot,
                isDone && styles.dotDone,
                isCurrent && styles.dotCurrent,
              ]}
            />
          );
        })}
      </View>
      <Text style={styles.label}>{`STEP ${step} OF ${totalSteps}`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.md,
  },
  dots: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  dot: {
    flex: 1,
    height: 6,
    borderRadius: theme.radii.chip,
    backgroundColor: theme.colors.border,
  },
  dotDone: {
    backgroundColor: theme.colors.highlightBorder,
  },
  dotCurrent: {
    backgroundColor: theme.colors.primary,
  },
  label: {
    ...theme.typography.label,
  },
});
