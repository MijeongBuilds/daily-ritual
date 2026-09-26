import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import theme from '../theme/theme';

export interface PriorityChipProps {
  title: string;
}

/**
 * The persistent hero element that pins the user's one top priority to the
 * top of the Protect It and Confirm screens, so it stays front-of-mind.
 */
export function PriorityChip({ title }: PriorityChipProps): React.ReactElement {
  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>YOUR ONE PRIORITY</Text>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.card,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    gap: theme.spacing.xs,
    ...theme.shadows.soft,
  },
  eyebrow: {
    ...theme.typography.label,
    color: theme.colors.onPrimary,
    opacity: 0.8,
  },
  title: {
    fontFamily: theme.fonts.serif,
    fontSize: theme.fontSizes.xl,
    lineHeight: 30,
    color: theme.colors.onPrimary,
  },
});
