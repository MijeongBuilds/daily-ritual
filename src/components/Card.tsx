import React from 'react';
import { StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';

import theme from '../theme/theme';

/**
 * A rounded, softly shadowed surface used to group content into calm,
 * editorial "cards". Reads all visual tokens from the theme.
 */
export function Card({
  style,
  children,
  ...rest
}: ViewProps & { style?: ViewStyle | ViewStyle[] }): React.ReactElement {
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    padding: theme.spacing.xl,
    ...theme.shadows.card,
  },
});
