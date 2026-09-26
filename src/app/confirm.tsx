import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '../components/Card';
import { formatTimeRange } from '../components/formatTime';
import { PriorityChip } from '../components/PriorityChip';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { mockCalendarService } from '../services/calendar/MockCalendarService';
import { useRitual } from '../ritual/RitualContext';
import { TOTAL_STEPS } from '../ritual/steps';
import theme from '../theme/theme';

/** Step 4: preview the focus block and save it (mocked). */
export default function ConfirmScreen(): React.ReactElement {
  const router = useRouter();
  const { intention, priorityTitle, durationMinutes, placedSlotStart } =
    useRitual();

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const start = placedSlotStart;
  const end =
    start != null
      ? new Date(start.getTime() + durationMinutes * 60_000)
      : null;

  async function handleSave(): Promise<void> {
    if (start == null || end == null) {
      return;
    }
    setSaving(true);
    try {
      await mockCalendarService.saveFocusBlock({
        title: priorityTitle,
        start,
        end,
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenScaffold
      step={4}
      totalSteps={TOTAL_STEPS}
      bottomBar={{
        continueLabel: saved ? 'Done' : 'Protect it',
        onContinue: () => {
          if (!saved) {
            void handleSave();
          }
        },
        onBack: saved ? undefined : () => router.back(),
        continueDisabled: start == null || saved,
        continueLoading: saving,
      }}
    >
      <View style={styles.body}>
        <Text style={styles.heading}>
          {saved ? "You're protected" : 'Protect your priority'}
        </Text>
        <Text style={styles.sub}>
          {saved
            ? 'Your focus block is saved. Go make it happen.'
            : 'Saves a focus block to Google Calendar so nothing else claims this time.'}
        </Text>

        <PriorityChip title={priorityTitle} />

        <Card style={styles.card}>
          <Text style={styles.cardLabel}>WHEN</Text>
          <Text style={styles.when}>
            {start != null && end != null
              ? formatTimeRange(start, end)
              : 'No time chosen yet'}
          </Text>
          <Text style={styles.duration}>{`${durationMinutes} minutes`}</Text>

          {intention.trim().length > 0 && (
            <View style={styles.intentionBlock}>
              <Text style={styles.cardLabel}>TODAY&apos;S INTENTION</Text>
              <Text style={styles.intention}>{intention}</Text>
            </View>
          )}
        </Card>

        {saved && (
          <Text style={styles.savedNote}>
            Added to your calendar (mocked for this preview).
          </Text>
        )}
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
  card: {
    gap: theme.spacing.xs,
  },
  cardLabel: {
    ...theme.typography.label,
  },
  when: {
    ...theme.typography.subheading,
    marginTop: theme.spacing.xs,
  },
  duration: {
    ...theme.typography.caption,
  },
  intentionBlock: {
    marginTop: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  intention: {
    ...theme.typography.body,
  },
  savedNote: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontFamily: theme.fonts.sansMedium,
  },
});
