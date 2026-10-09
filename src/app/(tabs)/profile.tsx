import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { Alert, Pressable, StyleSheet, Switch, View } from 'react-native';

import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Layout, Radius, Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { deleteLocalChat, hasLocalChat } from '@/lib/chat-file';
import { authClient } from '@/lib/auth-client';
import { backUpProgress, deleteBackup } from '@/lib/backup';
import { clearAll, getImportSummary, type ImportSummary } from '@/lib/db';
import { resetSession, updateSession, useSession } from '@/lib/session';

export default function ProfileScreen() {
  const colors = useTheme();
  const session = useSession();
  const [chatOnPhone, setChatOnPhone] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  useFocusEffect(
    useCallback(() => {
      setChatOnPhone(hasLocalChat());
      setSummary(getImportSummary());
    }, []),
  );

  const confirmRemoveChat = () =>
    Alert.alert(
      'Remove chat from this phone?',
      'Cielo keeps the words it already found. Your chat file is deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            deleteLocalChat();
            setChatOnPhone(false);
          },
        },
      ],
    );

  // On: back up right away. Off: stop backing up, and offer to delete what's already on the server.
  const setBackup = (on: boolean) => {
    updateSession({ backupProgress: on });
    if (on) {
      backUpProgress();
      return;
    }
    Alert.alert('Delete your backup too?', 'Cielo will stop backing up. Your progress already on your account can stay or be deleted.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Delete backup',
        style: 'destructive',
        onPress: async () => {
          const deleted = await deleteBackup();
          if (!deleted) Alert.alert("Couldn't delete it right now", 'Check your connection and try again.');
        },
      },
    ]);
  };

  const confirmSignOut = () =>
    Alert.alert('Sign out?', 'This removes your chat and your words from this phone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          // End the server session too; the phone is cleared even if the server can't be reached.
          authClient.signOut().catch(() => {});
          deleteLocalChat();
          clearAll();
          resetSession();
        },
      },
    ]);

  return (
    <Screen edges={['top']}>
      <Text variant="displayMd">You</Text>

      <Group title="Learning">
        <Row
          label="Back up my progress"
          detail="Your words and streak, never your chat."
          accessory={
            <Switch
              value={session.backupProgress}
              onValueChange={setBackup}
              trackColor={{ true: colors.primary, false: colors.surfaceMuted }}
              accessibilityLabel="Back up my progress"
            />
          }
        />
        <Row
          label="Speak Spanish aloud"
          detail="Hear each answer as you tap it, and every new phrase."
          accessory={
            <Switch
              value={session.speakAloud}
              onValueChange={(on) => updateSession({ speakAloud: on })}
              trackColor={{ true: colors.primary, false: colors.surfaceMuted }}
              accessibilityLabel="Speak Spanish aloud"
            />
          }
        />
        <Row label="Spanish voice" detail="Make Cielo sound like a native speaker." onPress={() => router.push('/voice')} />
        <Row
          label="Sound effects"
          detail="A chime for right and wrong answers, and a tune when a lesson is done."
          accessory={
            <Switch
              value={session.soundEffects}
              onValueChange={(on) => updateSession({ soundEffects: on })}
              trackColor={{ true: colors.primary, false: colors.surfaceMuted }}
              accessibilityLabel="Sound effects"
            />
          }
        />
      </Group>

      <Group title="Your chat">
        <Row
          label={
            summary?.restoredFromBackup
              ? 'Restored from your backup'
              : summary
                ? `You're ${summary.self} in this chat`
                : 'No chat yet'
          }
          detail={
            summary?.restoredFromBackup
              ? 'Import your chat again to see your own messages in lessons.'
              : summary
                ? `${summary.stats.selfMessages.toLocaleString()} of your messages${
                    summary.includePartner ? ', plus theirs' : ''
                  }`
                : undefined
          }
        />
        {chatOnPhone ? <Row label="Remove chat from this phone" tone="danger" onPress={confirmRemoveChat} /> : null}
      </Group>

      <Group title="Account">
        <Row label="Sign out" onPress={confirmSignOut} />
      </Group>
    </Screen>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  const colors = useTheme();
  return (
    <View style={styles.group}>
      <Text variant="caption" tone="inkMuted" style={styles.groupTitle}>
        {title.toUpperCase()}
      </Text>
      <View style={[styles.groupBody, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
        {children}
      </View>
    </View>
  );
}

type RowProps = {
  label: string;
  detail?: string;
  accessory?: ReactNode;
  tone?: 'ink' | 'danger';
  onPress?: () => void;
};

function Row({ label, detail, accessory, tone = 'ink', onPress }: RowProps) {
  const colors = useTheme();
  const content = (
    <>
      <View style={styles.rowText}>
        <Text variant="bodyStrong" tone={tone}>
          {label}
        </Text>
        {detail ? (
          <Text variant="bodySm" tone="inkMuted">
            {detail}
          </Text>
        ) : null}
      </View>
      {accessory}
    </>
  );

  if (!onPress) return <View style={styles.row}>{content}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceMuted }]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: Space.sm,
  },
  groupTitle: {
    paddingHorizontal: Space.base,
    letterSpacing: 0.6,
  },
  groupBody: {
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    minHeight: Layout.tapTarget + 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    paddingHorizontal: Space.base,
    paddingVertical: Space.md,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
});
