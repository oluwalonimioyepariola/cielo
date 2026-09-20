import { Redirect, Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import Animated, { Easing, FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { analyzeChat } from '@/brain';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { SkyField } from '@/components/sky-hero';
import { SkyStatusBar } from '@/components/sky-status-bar';
import { Text } from '@/components/ui/text';
import { Layout, Palette, Radius, Space, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { saveChatLocally } from '@/lib/chat-file';
import { backUpProgress } from '@/lib/backup';
import { saveAnalysis } from '@/lib/db';
import { getPendingImport, setPendingImport } from '@/lib/pending-import';
import { updateSession } from '@/lib/session';

const MIN_ITEMS = 5;
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
// Avatar colors from the sky cast, so each person in the chat gets their own.
const AVATAR_TONES: ThemeColor[] = ['sun', 'blush', 'sky', 'leaf'];

/** A two-message conversation in the sky: theirs on the left, see-through; yours on the right, white. */
function SkyConversation() {
  const colors = useTheme();
  const enter = (delay: number) =>
    FadeInDown.duration(600).delay(delay).easing(EASE_OUT).reduceMotion(ReduceMotion.System);
  return (
    <View style={styles.conversation} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View entering={enter(150)} style={[styles.skyBubble, styles.theirs]}>
        <Text variant="bodyStrong" style={{ color: colors.onSky }}>
          ¡Hola!
        </Text>
      </Animated.View>
      <Animated.View entering={enter(320)} style={styles.yoursRow}>
        <View style={[styles.skyBubble, styles.yours]}>
          <Text variant="bodyStrong" style={{ color: Palette.light.ink }}>
            ¿Cómo estás?
          </Text>
        </View>
        <Text variant="caption" style={[styles.youTag, { color: colors.onSkySoft }]}>
          you?
        </Text>
      </Animated.View>
    </View>
  );
}

export default function WhoScreen() {
  const colors = useTheme();
  const { bottom } = useSafeAreaInsets();
  const [pending] = useState(getPendingImport);
  const [self, setSelf] = useState<string | null>(null);
  const [includePartner, setIncludePartner] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Nothing picked (e.g. the app restarted on this screen): start the import again.
  if (!pending) return <Redirect href="/import" />;

  const { participants } = pending.chat;
  const others = participants.filter((p) => p.name !== self);
  const othersLabel =
    participants.length === 2 && self ? firstName(others[0].name) : participants.length === 2 ? 'them' : 'everyone else';

  const findWords = async () => {
    if (!self) return;
    setError(null);
    setWorking(true);
    // Let the spinner draw before the brain keeps the JS thread busy. The spinner itself runs natively.
    await new Promise((resolve) => setTimeout(resolve, 60));
    try {
      const analysis = analyzeChat(pending.chat, { self, includePartner });
      if (analysis.vocab.length < MIN_ITEMS) {
        setError("There aren't enough of your messages here yet. Try a longer chat.");
        return;
      }
      saveAnalysis(analysis, { self, includePartner, importedAt: new Date().toISOString() });
      if (pending.raw) saveChatLocally(pending.raw);
      backUpProgress();
      setPendingImport(null);
      // Flips the root guard: the main app opens.
      updateSession({ imported: true });
    } catch {
      setError('Something went wrong reading this chat. Please try again.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.canvas }]}>
      <Stack.Screen options={{ headerTintColor: colors.onSky }} />
      <SkyStatusBar />

      <SkyField share={0.3} chatCloud={false}>
        <SkyConversation />
      </SkyField>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.copy}>
          <Text variant="displayMd">Which one is you?</Text>
          <Text variant="bodyLg" tone="inkSoft">
            Cielo learns from the way you text.
          </Text>
        </View>

        <View style={styles.options} accessibilityRole="radiogroup">
          {participants.map((p, i) => {
            const selected = p.name === self;
            const initial = /\p{L}/u.test(p.name.charAt(0)) ? p.name.charAt(0).toUpperCase() : null;
            return (
              <Pressable
                key={p.name}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                disabled={working}
                onPress={() => setSelf(p.name)}
                style={({ pressed }) => [
                  styles.option,
                  {
                    backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
                    borderColor: selected ? colors.primary : colors.hairline,
                    borderWidth: selected ? 2 : 1,
                  },
                ]}>
                <View style={[styles.avatar, { backgroundColor: colors[AVATAR_TONES[i % AVATAR_TONES.length]] }]}>
                  {initial ? (
                    <Text variant="headingMd" style={{ color: Palette.light.ink }}>
                      {initial}
                    </Text>
                  ) : (
                    <Icon name={{ ios: 'person.fill', android: 'person' }} size={20} color={Palette.light.ink} />
                  )}
                </View>
                <View style={styles.optionText}>
                  <Text variant="headingMd" numberOfLines={1}>
                    {p.name}
                  </Text>
                  <Text variant="bodySm" tone="inkMuted">
                    {p.messageCount.toLocaleString()} messages
                  </Text>
                </View>
                <Icon
                  name={
                    selected
                      ? { ios: 'checkmark.circle.fill', android: 'check_circle' }
                      : { ios: 'circle', android: 'radio_button_unchecked' }
                  }
                  size={24}
                  tone={selected ? 'primary' : 'hairline'}
                />
              </Pressable>
            );
          })}
        </View>

        {self ? (
          <View style={[styles.partner, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
            <View style={styles.optionText}>
              <Text variant="bodyStrong">Also learn from {othersLabel}</Text>
              <Text variant="bodySm" tone="inkMuted">
                Off keeps their messages private. Cielo only reads yours.
              </Text>
            </View>
            <Switch
              value={includePartner}
              onValueChange={setIncludePartner}
              disabled={working}
              trackColor={{ true: colors.primary, false: colors.surfaceMuted }}
              accessibilityLabel={`Also learn from ${othersLabel}`}
            />
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: bottom + Space.base }]}>
        {error ? (
          <Text variant="bodySm" tone="danger" style={styles.center} accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
        <Button
          label={working ? 'Finding your words…' : 'Find my words'}
          loading={working}
          disabled={!self}
          onPress={findWords}
        />
      </View>
    </View>
  );
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0];
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  conversation: {
    flex: 1,
    justifyContent: 'center',
    gap: Space.sm,
    paddingTop: Space.xl,
  },
  skyBubble: {
    borderRadius: Radius.lg,
    paddingHorizontal: Space.base,
    paddingVertical: Space.sm,
  },
  theirs: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: Space.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  yoursRow: {
    alignItems: 'flex-end',
    gap: Space.xxs,
  },
  yours: {
    borderBottomRightRadius: Space.xs,
    backgroundColor: Palette.light.surface,
  },
  youTag: {
    marginRight: Space.xs,
  },
  content: {
    width: '100%',
    maxWidth: Layout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Layout.screenGutter,
    paddingTop: Space.sm,
    paddingBottom: Space.lg,
    gap: Space.lg,
  },
  copy: {
    gap: Space.sm,
  },
  options: {
    gap: Space.md,
  },
  option: {
    minHeight: Layout.tapTarget + 24,
    borderRadius: Radius.md,
    paddingHorizontal: Space.base,
    paddingVertical: Space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  partner: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Space.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
  },
  footer: {
    width: '100%',
    maxWidth: Layout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Layout.screenGutter,
    paddingTop: Space.sm,
    gap: Space.xs,
  },
  center: {
    textAlign: 'center',
    paddingBottom: Space.xs,
  },
});
