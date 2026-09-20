import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { parseWhatsApp } from '@/brain';
import { SAMPLE_CHAT } from '@/brain/sample-chat';
import { SkyField } from '@/components/sky-hero';
import { SkyStatusBar } from '@/components/sky-status-bar';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Layout, Palette, Radius, Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ChatFileError, pickChatText } from '@/lib/chat-file';
import { setPendingImport } from '@/lib/pending-import';

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

// WhatsApp hides "Export chat" in a different place on each platform.
// TODO: once Cielo appears in the share sheet, the last step becomes "pick Cielo".
const STEPS = Platform.select({
  ios: ['Open the chat in WhatsApp', 'Tap their name at the top, then Export Chat', 'Choose Without Media, then Save to Files'],
  default: ['Open the chat in WhatsApp', 'Tap ⋮, then More, then Export chat', 'Choose Without media, then save it to Files'],
});

// Cielo's twilight at low strength: the highlight Cielo puts on a phrase it found in a message.
const FOUND_HIGHLIGHT = 'rgba(74, 69, 209, 0.16)';

/**
 * What importing does, shown rather than told: two messages from a chat, a phrase in yours lights
 * up as Cielo finds it, and its Spanish rises out into the sky. One authored moment for a screen
 * seen once; with Reduce Motion the finished picture simply appears.
 */
function ChatToSpanish() {
  const colors = useTheme();
  const step = (delay: number) =>
    FadeInDown.duration(600).delay(delay).easing(EASE_OUT).reduceMotion(ReduceMotion.System);

  return (
    <View style={styles.scene} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View entering={step(900)} style={styles.foundRow}>
        <View style={styles.found}>
          <Icon name={{ ios: 'sparkles', android: 'auto_awesome' }} size={14} color={Palette.light.sun} />
          <Text variant="bodyStrong" style={{ color: Palette.light.ink }}>
            ¿Ya comiste?
          </Text>
        </View>
        <View style={styles.trail}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.trailDot, { backgroundColor: colors.onSky, opacity: 0.4 + i * 0.2 }]} />
          ))}
        </View>
      </Animated.View>

      <Animated.View entering={step(150)} style={[styles.chatBubble, styles.theirs]}>
        <Text variant="body" style={{ color: colors.onSky }}>
          On my way home
        </Text>
      </Animated.View>

      <Animated.View entering={step(300)} style={styles.yoursRow}>
        <View style={[styles.chatBubble, styles.yours]}>
          <Text variant="body" style={{ color: Palette.light.ink }}>
            <Animated.Text
              style={[
                styles.highlight,
                {
                  animationName: { from: { backgroundColor: 'rgba(74, 69, 209, 0)' }, to: { backgroundColor: FOUND_HIGHLIGHT } },
                  animationDuration: 500,
                  animationDelay: 650,
                  animationFillMode: 'both',
                },
              ]}>
              Did you eat?
            </Animated.Text>{' '}
            I&apos;m home
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

/** Parses an export and moves on to "Which one is you?". Returns an error message on failure. */
function startImport(text: string, raw?: string): string | null {
  const chat = parseWhatsApp(text);
  if (chat.participants.length < 2 || chat.messages.length < 10) {
    return "That doesn't look like a WhatsApp chat export. Try exporting the chat again.";
  }
  setPendingImport({ chat, raw });
  router.push('/who');
  return null;
}

export default function ImportScreen() {
  const colors = useTheme();
  const { bottom } = useSafeAreaInsets();
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chooseFile = async () => {
    setError(null);
    setOpening(true);
    try {
      const text = await pickChatText();
      if (text !== null) setError(startImport(text, text));
    } catch (e) {
      setError(e instanceof ChatFileError ? e.message : "Cielo couldn't open that file. Try exporting the chat again.");
    } finally {
      setOpening(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.canvas }]}>
      <Stack.Screen options={{ headerTintColor: colors.onSky }} />
      <SkyStatusBar />

      <SkyField share={0.4} chatCloud={false}>
        <ChatToSpanish />
      </SkyField>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.copy}>
          <Text variant="displayMd">Bring in your chat</Text>
          <Text variant="bodyLg" tone="inkSoft">
            Pick the chat you&apos;d most like to learn from. Usually that&apos;s your longest one.
          </Text>
        </View>

        <View style={styles.steps}>
          {STEPS.map((step, i) => (
            <View key={step} style={styles.step}>
              <View style={styles.rail}>
                <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                  <Text variant="label" tone="onPrimary">
                    {i + 1}
                  </Text>
                </View>
                {i < STEPS.length - 1 ? <View style={[styles.connector, { backgroundColor: colors.hairline }]} /> : null}
              </View>
              <Text variant="bodyStrong" style={styles.stepText}>
                {step}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.privacy}>
          <Icon name={{ ios: 'lock.fill', android: 'lock' }} size={16} tone="primary" />
          <Text variant="bodySm" tone="inkSoft" style={styles.privacyText}>
            Cielo reads your chat right here on your phone and never uploads it. By default it only learns from
            your own messages.
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: bottom + Space.base }]}>
        {error ? (
          <Text variant="bodySm" tone="danger" style={styles.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
        <Button label="Choose chat file" loading={opening} onPress={chooseFile} />
        <Button
          variant="plain"
          label="Try a sample chat first"
          disabled={opening}
          onPress={() => setError(startImport(SAMPLE_CHAT))}
        />
      </View>
    </View>
  );
}

const STEP_DOT = 28;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  file: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    backgroundColor: Palette.light.surface,
    borderRadius: Radius.md,
    paddingVertical: Space.md,
    paddingLeft: Space.md,
    paddingRight: Space.lg,
    transform: [{ rotate: '-3deg' }],
  },
  scene: {
    flex: 1,
    justifyContent: 'flex-end',
    gap: Space.sm,
    paddingTop: Space.xl,
  },
  foundRow: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginRight: Space.xxl,
  },
  found: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.xs,
    backgroundColor: Palette.light.surface,
    borderRadius: Radius.full,
    paddingHorizontal: Space.base,
    paddingVertical: Space.sm,
  },
  trail: {
    alignItems: 'center',
    gap: 4,
    paddingTop: Space.xs,
  },
  trailDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  chatBubble: {
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
  },
  yours: {
    borderBottomRightRadius: Space.xs,
    backgroundColor: Palette.light.surface,
  },
  highlight: {
    borderRadius: 4,
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
  steps: {
    gap: 0,
  },
  step: {
    flexDirection: 'row',
    gap: Space.md,
  },
  rail: {
    alignItems: 'center',
    width: STEP_DOT,
  },
  stepNumber: {
    width: STEP_DOT,
    height: STEP_DOT,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connector: {
    width: 2,
    flex: 1,
    minHeight: Space.base,
    marginVertical: Space.xxs,
    borderRadius: 1,
  },
  stepText: {
    flex: 1,
    paddingTop: 3,
    paddingBottom: Space.base,
  },
  privacy: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Space.sm,
  },
  privacyText: {
    flex: 1,
  },
  footer: {
    width: '100%',
    maxWidth: Layout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Layout.screenGutter,
    paddingTop: Space.sm,
    gap: Space.xs,
  },
  error: {
    textAlign: 'center',
    paddingBottom: Space.xs,
  },
});
