import React from 'react';
import { StyleSheet, View } from 'react-native';

import theme from '../theme/theme';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';

export interface BottomBarProps {
  /** Primary (Continue) button label. */
  continueLabel?: string;
  onContinue: () => void;
  continueDisabled?: boolean;
  continueLoading?: boolean;
  /** Back handler. If omitted, the Back control is hidden (e.g. step 1). */
  onBack?: () => void;
  backLabel?: string;
}

/**
 * Bottom action bar: a quiet Back control on the left (hidden on the first
 * step) and a forest-green primary Continue button on the right.
 */
export function BottomBar({
  continueLabel = 'Continue',
  onContinue,
  continueDisabled = false,
  continueLoading = false,
  onBack,
  backLabel = 'Back',
}: BottomBarProps): React.ReactElement {
  return (
    <View style={styles.container}>
      {onBack ? (
        <SecondaryButton
          label={backLabel}
          onPress={onBack}
          style={styles.back}
        />
      ) : (
        <View style={styles.back} />
      )}
      <PrimaryButton
        label={continueLabel}
        onPress={onContinue}
        disabled={continueDisabled}
        loading={continueLoading}
        style={styles.continue}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingTop: theme.spacing.md,
  },
  back: {
    flex: 1,
  },
  continue: {
    flex: 2,
  },
});
