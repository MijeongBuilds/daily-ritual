import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useGoogleAuth } from '../auth/GoogleAuthContext';
import theme from '../theme/theme';
import { Card } from './Card';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';

export interface CalendarConnectProps {
  /**
   * Short, screen-specific reason shown under the heading explaining WHY the
   * user might connect right now (just-in-time framing).
   */
  message: string;
}

/**
 * A just-in-time "Connect Google Calendar" call-to-action shown when the user
 * is signed OUT. It explains why connecting helps at this exact moment, then
 * launches the OAuth flow via {@link useGoogleAuth}. While a prompt is in
 * flight the button shows a spinner and disables; any auth error is surfaced
 * inline (cancelling the prompt is NOT an error, so nothing shows in that
 * case).
 *
 * Rendering nothing when already signed in keeps call sites simple: they can
 * drop this above their content unconditionally.
 */
export function CalendarConnectCTA({
  message,
}: CalendarConnectProps): React.ReactElement | null {
  const { isSignedIn, isConnecting, authError, signIn } = useGoogleAuth();

  if (isSignedIn) {
    return null;
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.eyebrow}>GOOGLE CALENDAR</Text>
      <Text style={styles.body}>{message}</Text>
      <PrimaryButton
        label={isConnecting ? 'Connecting…' : 'Connect Google Calendar'}
        onPress={() => void signIn()}
        loading={isConnecting}
        disabled={isConnecting}
        style={styles.button}
      />
      {authError != null && <Text style={styles.error}>{authError}</Text>}
      <Text style={styles.note}>
        Not connected — showing sample events for now.
      </Text>
    </Card>
  );
}

/**
 * A quiet "Disconnect Google Calendar" control shown when the user IS signed
 * in. Signing out clears the stored tokens and returns the app to the
 * mock/signed-out experience. Renders nothing when signed out.
 *
 * This is the only settings surface in scope.
 */
export function CalendarDisconnect(): React.ReactElement | null {
  const { isSignedIn, signOut } = useGoogleAuth();

  if (!isSignedIn) {
    return null;
  }

  return (
    <View style={styles.disconnectRow}>
      <Text style={styles.connectedNote}>Google Calendar connected</Text>
      <SecondaryButton
        label="Disconnect Google Calendar"
        onPress={() => void signOut()}
        style={styles.disconnectButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: theme.spacing.sm,
  },
  eyebrow: {
    ...theme.typography.label,
  },
  body: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  button: {
    marginTop: theme.spacing.sm,
    alignSelf: 'stretch',
  },
  error: {
    ...theme.typography.caption,
    color: theme.colors.accent,
    fontFamily: theme.fonts.sansMedium,
  },
  note: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  disconnectRow: {
    gap: theme.spacing.xs,
    alignItems: 'center',
  },
  connectedNote: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontFamily: theme.fonts.sansMedium,
  },
  disconnectButton: {
    alignSelf: 'stretch',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
});
