import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeInDown, ReduceMotion, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SkyField } from '@/components/sky-hero';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Layout, Palette, Radius, Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Teachable } from '@/learning/exercises';

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
// Three bubbles breathe; the full count is in the line under the title.
const MAX_BUBBLES = 3;
// The sun starts rising at once; the first bubble lands as it clears the clouds.
const FIRST_BUBBLE_MS = 550;
const BUBBLE_STAGGER_MS = 110;

/**
 * The phrases just learned, arriving one by one as the user's own sent messages, now in Spanish,
 * each with a read receipt. The rare, earned moment of the app, so it gets the motion budget;
 * with Reduce Motion everything is simply there.
 */
function LearnedMessages({ items }: { items: Teachable[] }) {
  const shown = items.slice(0, MAX_BUBBLES);

  return (
    <View style={styles.messages}>
      {shown.map((item, i) => (
        <Animated.View
          key={item.en}
          entering={FadeInDown.duration(500)
            .delay(FIRST_BUBBLE_MS + i * BUBBLE_STAGGER_MS)
            .easing(EASE_OUT)
            .reduceMotion(ReduceMotion.System)}
          style={styles.bubbleRow}>
          <View style={styles.bubble}>
            <View style={styles.bubbleText}>
              <Text variant="bodyStrong" style={styles.es} numberOfLines={2}>
                {item.t.es}
              </Text>
              <Text variant="caption" style={styles.en} numberOfLines={1}>
                {item.en}
              </Text>
            </View>
            <Icon name={{ ios: 'checkmark.circle.fill', android: 'done_all' }} size={16} color={Palette.light.primary} />
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

type ShellProps = {
  sun: boolean;
  sky: React.ReactNode;
  title: string;
  detail: string;
  actions: React.ReactNode;
};

/** Full-screen finish: a sky on top, the result and the way forward on the cream page below. */
function FinishShell({ sun, sky, title, detail, actions }: ShellProps) {
  const colors = useTheme();
  const { bottom } = useSafeAreaInsets();
  return (
    <View style={[styles.root, { backgroundColor: colors.canvas }]}>
      <StatusBar style="light" />
      <SkyField share={0.58} sun={sun} chatCloud={false}>
        {sky}
      </SkyField>
      <Animated.View
        entering={FadeInDown.duration(500).delay(300).easing(EASE_OUT).reduceMotion(ReduceMotion.System)}
        style={[styles.body, { paddingBottom: bottom + Space.base }]}>
        <View style={styles.copy}>
          <Text variant="displayMd">{title}</Text>
          <Text variant="bodyLg" tone="inkSoft">
            {detail}
          </Text>
        </View>
        <View style={styles.actions}>{actions}</View>
      </Animated.View>
    </View>
  );
}

/** One success haptic, landing with the first message bubble rather than before it. */
function useArrivalHaptic(enabled: boolean) {
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (!enabled) return;
    const timer = setTimeout(
      () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
      reducedMotion ? 0 : FIRST_BUBBLE_MS,
    );
    return () => clearTimeout(timer);
  }, [enabled, reducedMotion]);
}

type CompleteProps = {
  items: Teachable[];
  title: string;
  firstTry: number;
  graded: number;
  isCheckpoint: boolean;
  onDone: () => void;
};

export function LessonComplete({ items, title, firstTry, graded, isCheckpoint, onDone }: CompleteProps) {
  useArrivalHaptic(true);
  const accuracy = graded ? Math.round((firstTry / graded) * 100) : 100;
  const count = `${items.length} ${items.length === 1 ? 'phrase' : 'phrases'} ${isCheckpoint ? 'reviewed' : 'learned'}`;

  return (
    <FinishShell
      sun
      sky={<LearnedMessages items={items} />}
      title={title}
      detail={`${count} · ${accuracy}% right first time`}
      actions={<Button label="Back to your chat" onPress={onDone} />}
    />
  );
}

type TestResultProps = {
  items: Teachable[];
  correct: number;
  total: number;
  passed: boolean;
  onPass: () => void;
  onStartLessons: () => void;
  onBack: () => void;
};

/** The end of a "test out": either the basics are proven, or the learner starts at lesson one. */
export function TestResult({ items, correct, total, passed, onPass, onStartLessons, onBack }: TestResultProps) {
  useArrivalHaptic(passed);

  if (passed) {
    return (
      <FinishShell
        sun
        sky={<LearnedMessages items={items} />}
        title="You know the basics!"
        detail={`${correct} of ${total} right. Primeros pasos is done, so your path goes straight to your own words.`}
        actions={<Button label="On to my words" onPress={onPass} />}
      />
    );
  }

  return (
    <FinishShell
      sun={false}
      sky={null}
      title="Almost there"
      detail={`You got ${correct} of ${total}. Start with lesson one: it only takes a few minutes, and the rest will come easier.`}
      actions={
        <>
          <Button label="Start lesson one" onPress={onStartLessons} />
          <Button variant="plain" label="Back to your chat" onPress={onBack} />
        </>
      }
    />
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  messages: {
    flex: 1,
    justifyContent: 'center',
    gap: Space.sm,
    paddingTop: Space.base,
  },
  bubbleRow: {
    alignItems: 'flex-end',
  },
  bubble: {
    maxWidth: '82%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    backgroundColor: Palette.light.surface,
    borderRadius: Radius.lg,
    borderBottomRightRadius: Space.xs,
    paddingHorizontal: Space.base,
    paddingVertical: Space.sm,
  },
  bubbleText: {
    flexShrink: 1,
  },
  // Bubbles are white in both themes, so their text uses the light palette.
  es: {
    color: Palette.light.ink,
  },
  en: {
    color: Palette.light.inkMuted,
  },
  body: {
    flex: 1,
    width: '100%',
    maxWidth: Layout.maxContentWidth,
    alignSelf: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.screenGutter,
    paddingTop: Space.sm,
    gap: Space.xl,
  },
  copy: {
    gap: Space.sm,
  },
  actions: {
    gap: Space.sm,
  },
});
