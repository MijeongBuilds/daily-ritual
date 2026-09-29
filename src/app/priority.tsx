import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ScreenScaffold } from '../components/ScreenScaffold';
import { TextField } from '../components/TextField';
import { useRitual } from '../ritual/RitualContext';
import { TOTAL_STEPS } from '../ritual/steps';
import theme from '../theme/theme';

/** Step 2: the one top priority — the visual hero of the flow. */
export default function PriorityScreen(): React.ReactElement {
  const router = useRouter();
  const { priorityTitle, setPriorityTitle } = useRitual();

  const canContinue = priorityTitle.trim().length > 0;

  return (
    <ScreenScaffold
      step={2}
      totalSteps={TOTAL_STEPS}
      bottomBar={{
        continueLabel: 'Continue',
        onContinue: () => router.push('/protect'),
        onBack: () => router.back(),
        continueDisabled: !canContinue,
      }}
    >
      <View style={styles.body}>
        <Text style={styles.heading}>Your one priority today</Text>
        <Text style={styles.sub}>
          One thing. If only this happens, today counts.
        </Text>
        <TextField
          hero
          value={priorityTitle}
          onChangeText={setPriorityTitle}
          placeholder="The one thing..."
          multiline
          style={styles.heroInput}
        />
      </View>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: theme.spacing.lg,
  },
  heading: {
    ...theme.typography.heading,
  },
  sub: {
    ...theme.typography.bodyMuted,
  },
  heroInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
});
