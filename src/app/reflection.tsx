import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SecondaryButton } from '../components/SecondaryButton';
import theme from '../theme/theme';

/**
 * STUB for the future evening "Reflection / Wrap up the day" screen. The real
 * flow (reviewing the day, logging what happened, setting up tomorrow) is a
 * separate build; this placeholder just gives the Today home a destination.
 */
export default function ReflectionScreen(): React.ReactElement {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + theme.spacing.xl,
          paddingBottom: insets.bottom + theme.spacing.xl,
        },
      ]}
    >
      <View style={styles.body}>
        <Text style={styles.eyebrow}>THIS EVENING</Text>
        <Text style={styles.heading}>Wrap up the day</Text>
        <Text style={styles.copy}>
          A calm evening reflection is coming soon — look back on your day,
          note what happened, and set up tomorrow.
        </Text>
      </View>

      <SecondaryButton
        label="Back to today"
        onPress={() => router.back()}
        style={styles.back}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.xl,
    justifyContent: 'space-between',
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    gap: theme.spacing.md,
  },
  eyebrow: {
    ...theme.typography.label,
  },
  heading: {
    ...theme.typography.display,
  },
  copy: {
    ...theme.typography.body,
  },
  back: {
    alignSelf: 'stretch',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
});
