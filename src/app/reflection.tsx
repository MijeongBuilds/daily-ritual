import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '../components/Card';
import {
  formatMinutesDone,
  formatTime,
  formatTimeRange,
} from '../components/formatTime';
import { PrimaryButton } from '../components/PrimaryButton';
import { TextField } from '../components/TextField';
import { useRitual } from '../ritual/RitualContext';
import theme from '../theme/theme';

/**
 * The evening "Wrap up your day" page. Top → bottom:
 *   1. Header: eyebrow + serif title, with a back chevron to Today home.
 *   2. Priority review card: the one priority + its time range, a Done / Not
 *      yet toggle that reads AND writes the SAME `markedDone` state the Today
 *      home uses (single source of truth), and the notes left during the day.
 *   3. Three OPTIONAL free-text fields (highlight, what I learned, tomorrow's
 *      top priority), persisted into RitualContext.
 *   4. A "Save & close the day" button that saves the entries + done-state,
 *      shows a gentle confirmation, then returns to Today home.
 */
export default function ReflectionScreen(): React.ReactElement {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    priorityTitle,
    durationMinutes,
    placedSlotStart,
    protectMode,
    existingEventStart,
    existingEventEnd,
    markedDone,
    reflections,
    wrapUp,
    setMarkedDone,
    setWrapUp,
  } = useRitual();

  // Local copies of the three optional fields, seeded from persisted state so
  // returning to the page keeps prior entries.
  const [highlight, setHighlight] = useState(wrapUp.highlight);
  const [learned, setLearned] = useState(wrapUp.learned);
  const [tomorrow, setTomorrow] = useState(wrapUp.tomorrowTopPriority);
  const [saved, setSaved] = useState(false);

  // Resolve the protected window from whichever mode is active (mirrors Today).
  const focusStart =
    protectMode === 'existing-event' ? existingEventStart : placedSlotStart;
  const focusEnd =
    protectMode === 'existing-event'
      ? existingEventEnd
      : placedSlotStart != null
        ? new Date(placedSlotStart.getTime() + durationMinutes * 60_000)
        : null;
  const hasFocus = focusStart != null && focusEnd != null;

  // Notes left during the day for today's priority (falls back to all notes).
  const title = priorityTitle.trim();
  const priorityNotes =
    title.length > 0
      ? reflections.filter((r) => r.priorityTitle.trim() === title)
      : reflections;

  function goBack(): void {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/today');
    }
  }

  function handleSave(): void {
    Keyboard.dismiss();
    setWrapUp({
      highlight: highlight.trim(),
      learned: learned.trim(),
      tomorrowTopPriority: tomorrow.trim(),
    });
    // Gentle confirmation, then return to Today home.
    setSaved(true);
    setTimeout(() => {
      router.replace('/today');
    }, 900);
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          style={styles.screen}
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: insets.top + theme.spacing.lg,
              paddingBottom: insets.bottom + theme.spacing.xxl,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Header with a back chevron. */}
          <View style={styles.headerRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to today"
              onPress={goBack}
              hitSlop={theme.spacing.md}
              style={styles.backButton}
            >
              <Text style={styles.backChevron}>‹</Text>
            </Pressable>
            <View style={styles.headerText}>
              <Text style={styles.eyebrow}>DAILY WRAP-UP</Text>
              <Text style={styles.heading}>Wrap up your day.</Text>
            </View>
          </View>

          {/* 2. Priority review card. */}
          <Card style={styles.reviewCard}>
            <Text style={styles.cardLabel}>YOUR ONE PRIORITY</Text>
            <Text style={styles.priorityTitle}>
              {title.length > 0 ? priorityTitle : 'Your priority'}
            </Text>
            <Text style={styles.priorityWhen}>
              {hasFocus && focusStart != null && focusEnd != null
                ? formatTimeRange(focusStart, focusEnd)
                : 'No time protected yet'}
            </Text>

            {/* Done / Not yet toggle — reads AND writes the shared markedDone
                state used by Today home. */}
            <View style={styles.toggleRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: markedDone }}
                accessibilityLabel="Mark priority done"
                onPress={() => setMarkedDone(true, null)}
                style={[
                  styles.toggleButton,
                  markedDone
                    ? styles.toggleDoneSelected
                    : styles.toggleUnselected,
                ]}
              >
                {markedDone && <Text style={styles.doneCheck}>✓</Text>}
                <Text
                  style={[
                    styles.toggleLabel,
                    markedDone && styles.toggleLabelOnPrimary,
                  ]}
                >
                  Done
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: !markedDone }}
                accessibilityLabel="Mark priority not yet done"
                onPress={() => setMarkedDone(false, null)}
                style={[
                  styles.toggleButton,
                  !markedDone
                    ? styles.toggleNotYetSelected
                    : styles.toggleUnselected,
                ]}
              >
                <View
                  style={[
                    styles.radio,
                    !markedDone && styles.radioSelected,
                  ]}
                >
                  {!markedDone && <View style={styles.radioDot} />}
                </View>
                <Text style={styles.toggleLabel}>Not yet</Text>
              </Pressable>
            </View>

            {/* Divider + notes left during the day. */}
            {priorityNotes.length > 0 && (
              <View style={styles.notesSection}>
                <Text style={styles.cardLabel}>YOUR NOTES</Text>
                {priorityNotes.map((r) => (
                  <View key={r.createdAt} style={styles.note}>
                    <Text style={styles.noteMeta}>
                      {`${formatTime(new Date(r.createdAt))} \u00b7 ${formatMinutesDone(r.minutesSpentAtSave)}`}
                    </Text>
                    <Text style={styles.noteText}>{r.note}</Text>
                  </View>
                ))}
              </View>
            )}
          </Card>

          {/* 3. Three optional free-text fields. */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Highlight of the day</Text>
            <TextField
              value={highlight}
              onChangeText={setHighlight}
              placeholder="What felt meaningful today?"
              multiline
              style={styles.fieldInput}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>What I learned</Text>
            <TextField
              value={learned}
              onChangeText={setLearned}
              placeholder="A lesson, a discovery, or something to try again..."
              multiline
              style={styles.fieldInput}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Tomorrow&apos;s top priority</Text>
            <TextField
              value={tomorrow}
              onChangeText={setTomorrow}
              placeholder="The one thing I want to make time for..."
              multiline
              style={styles.fieldInput}
            />
          </View>

          {/* 4. Save & close. */}
          {saved && (
            <Text style={styles.savedHint}>Day wrapped up. Rest well.</Text>
          )}
          <PrimaryButton
            label="Save & close the day"
            onPress={handleSave}
            disabled={saved}
            style={styles.saveButton}
          />
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingHorizontal: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -theme.spacing.sm,
  },
  backChevron: {
    fontFamily: theme.fonts.sansMedium,
    fontSize: theme.fontSizes.xxl,
    lineHeight: 30,
    color: theme.colors.text,
  },
  headerText: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  eyebrow: {
    ...theme.typography.label,
  },
  heading: {
    ...theme.typography.heading,
  },
  reviewCard: {
    gap: theme.spacing.xs,
  },
  cardLabel: {
    ...theme.typography.label,
  },
  priorityTitle: {
    ...theme.typography.subheading,
    marginTop: theme.spacing.xs,
  },
  priorityWhen: {
    ...theme.typography.caption,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    minHeight: 48,
    borderRadius: theme.radii.button,
    paddingHorizontal: theme.spacing.md,
  },
  toggleUnselected: {
    backgroundColor: theme.colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  toggleDoneSelected: {
    backgroundColor: theme.colors.primary,
  },
  toggleNotYetSelected: {
    backgroundColor: theme.colors.card,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  toggleLabel: {
    ...theme.typography.body,
    fontFamily: theme.fonts.sansSemiBold,
    color: theme.colors.text,
  },
  toggleLabelOnPrimary: {
    color: theme.colors.onPrimary,
  },
  doneCheck: {
    color: theme.colors.onPrimary,
    fontFamily: theme.fonts.sansBold,
    fontSize: theme.fontSizes.md,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: theme.radii.chip,
    borderWidth: 2,
    borderColor: theme.colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: theme.colors.primary,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: theme.radii.chip,
    backgroundColor: theme.colors.primary,
  },
  notesSection: {
    marginTop: theme.spacing.lg,
    gap: theme.spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.lg,
  },
  note: {
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.accent,
    paddingLeft: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  noteMeta: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.sansMedium,
  },
  noteText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  field: {
    gap: theme.spacing.sm,
  },
  fieldLabel: {
    ...theme.typography.subheading,
    fontSize: theme.fontSizes.lg,
    lineHeight: 26,
  },
  fieldInput: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  savedHint: {
    ...theme.typography.body,
    color: theme.colors.primary,
    fontFamily: theme.fonts.sansSemiBold,
    textAlign: 'center',
  },
  saveButton: {
    alignSelf: 'stretch',
    marginTop: theme.spacing.sm,
  },
});
