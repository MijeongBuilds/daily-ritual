import React from 'react';
import {
  StyleSheet,
  TextInput,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import theme from '../theme/theme';

export interface TextFieldProps extends TextInputProps {
  /** Render the input as a large, emphasized "hero" field. */
  hero?: boolean;
  containerStyle?: ViewStyle | ViewStyle[];
}

/**
 * A friendly text input styled with theme tokens. Supports a `hero` variant
 * used for the one-priority field so it reads as the visual hero.
 */
export function TextField({
  hero = false,
  style,
  containerStyle,
  ...rest
}: TextFieldProps): React.ReactElement {
  return (
    <TextInput
      placeholderTextColor={theme.colors.textMuted}
      style={[
        styles.input,
        hero ? styles.hero : styles.regular,
        style as TextStyle,
        containerStyle as TextStyle,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.button,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    color: theme.colors.text,
  },
  regular: {
    ...theme.typography.body,
  },
  hero: {
    fontFamily: theme.fonts.serif,
    fontSize: theme.fontSizes.xl,
    lineHeight: 32,
    color: theme.colors.text,
    paddingVertical: theme.spacing.xl,
    ...theme.shadows.soft,
  },
});
