import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import theme from '../theme/theme';
import { BottomBar, type BottomBarProps } from './BottomBar';
import { RitualHeader } from './RitualHeader';

export interface ScreenScaffoldProps {
  step: number;
  totalSteps: number;
  children: React.ReactNode;
  bottomBar: BottomBarProps;
  /**
   * When true the content area does not scroll (used by the Protect It screen
   * which manages its own scrolling calendar).
   */
  scroll?: boolean;
}

/**
 * Composes the shared ritual chrome — cream background, RitualHeader at the
 * top, generous-whitespace content in the middle, and the Back/Continue
 * BottomBar pinned at the bottom.
 */
export function ScreenScaffold({
  step,
  totalSteps,
  children,
  bottomBar,
  scroll = true,
}: ScreenScaffoldProps): React.ReactElement {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        style={[
          styles.container,
          {
            paddingTop: insets.top + theme.spacing.lg,
            paddingBottom: insets.bottom + theme.spacing.lg,
          },
        ]}
      >
        <View style={styles.header}>
          <RitualHeader step={step} totalSteps={totalSteps} />
        </View>

        {scroll ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={styles.flex}>{children}</View>
        )}

        <BottomBar {...bottomBar} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.xl,
  },
  header: {
    marginBottom: theme.spacing.xl,
  },
  scrollContent: {
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
});
