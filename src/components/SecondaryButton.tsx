import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  type ViewStyle,
} from 'react-native';

import theme from '../theme/theme';

export interface SecondaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle | ViewStyle[];
}

/**
 * A quiet, text-forward secondary action (e.g. the "Back" control). Reads
 * all tokens from the theme.
 */
export function SecondaryButton({
  label,
  onPress,
  disabled = false,
  style,
}: SecondaryButtonProps): React.ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: theme.radii.button,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  pressed: {
    opacity: 0.6,
  },
  disabled: {
    opacity: 0.3,
  },
  label: {
    ...theme.typography.body,
    fontFamily: theme.fonts.sansSemiBold,
    color: theme.colors.primary,
  },
});
