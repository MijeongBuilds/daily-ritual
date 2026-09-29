import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ScreenScaffold } from '../components/ScreenScaffold';
import { TextField } from '../components/TextField';
import { useRitual } from '../ritual/RitualContext';
import { TOTAL_STEPS } from '../ritual/steps';
import theme from '../theme/theme';

/** Step 1: set the day's intention. */
export default function IntentionScreen(): React.ReactElement {
  const router = useRouter();
  const { intention, setIntention } = useRitual();

  return (
    <ScreenScaffold
      step={1}
      totalSteps={TOTAL_STEPS}
      bottomBar={{
        continueLabel: 'Continue',
        onContinue: () => router.push('/priority'),
      }}
    >
      <View style={styles.body}>
        <Text style={styles.heading}>Set your intention for today</Text>
        <Text style={styles.sub}>
          A gentle north star. No pressure to get it perfect.
        </Text>
        <TextField
          value={intention}
          onChangeText={setIntention}
          placeholder="Today, I intend to..."
          multiline
          style={styles.input}
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
  input: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
});
