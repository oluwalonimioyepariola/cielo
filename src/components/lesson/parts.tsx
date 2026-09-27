import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { cubicBezier, useReducedMotion } from 'react-native-reanimated';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Layout, Radius, Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { speakSpanish } from '@/lib/speak';

export const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);

/** Thin lesson progress bar. The fill is absolutely positioned and childless, so animating width is cheap. */
export function ProgressBar({ progress }: { progress: number }) {
  const colors = useTheme();
  return (
    <View
      style={[styles.track, { backgroundColor: colors.surfaceMuted }]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}>
      <Animated.View
        style={[
          styles.fill,
          {
            backgroundColor: colors.primary,
            width: `${Math.max(4, progress * 100)}%`,
            transitionProperty: 'width',
            transitionDuration: 300,
            transitionTimingFunction: EASE_OUT,
          },
        ]}
      />
    </View>
  );
}

export function SpeakButton({ text }: { text: string }) {
  const colors = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Hear "${text}"`}
      hitSlop={8}
      onPress={() => speakSpanish(text)}
      style={({ pressed }) => [
        styles.speak,
        { backgroundColor: pressed ? colors.surfaceMuted : colors.surface, borderColor: colors.hairline },
      ]}>
      <Icon name={{ ios: 'speaker.wave.2.fill', android: 'volume_up' }} size={20} tone="primary" />
    </Pressable>
  );
}

/** Small uppercase instruction above each exercise. */
export function Instruction({ children }: { children: string }) {
  return (
    <Text variant="caption" tone="inkMuted" style={styles.instruction}>
      {children.toUpperCase()}
    </Text>
  );
}

export type OptionState = 'idle' | 'selected' | 'correct' | 'wrong' | 'dimmed';

type OptionProps = {
  state: OptionState;
  disabled?: boolean;
  onPress: () => void;
  children: ReactNode;
  accessibilityLabel: string;
};

/** A tappable answer card. Feedback colors come with an icon, never color alone. */
export function OptionCard({ state, disabled, onPress, children, accessibilityLabel }: OptionProps) {
  const colors = useTheme();
  const reducedMotion = useReducedMotion();
  const [pressed, setPressed] = useState(false);

  const look = {
    idle: { bg: colors.surface, border: colors.hairline, width: 1 },
    selected: { bg: colors.surface, border: colors.primary, width: 2 },
    correct: { bg: colors.successSoft, border: colors.success, width: 2 },
    wrong: { bg: colors.dangerSoft, border: colors.danger, width: 2 },
    dimmed: { bg: colors.surface, border: colors.hairline, width: 1 },
  }[state];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: state === 'selected', disabled }}
      disabled={disabled}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={onPress}>
      <Animated.View
        style={[
          styles.option,
          {
            backgroundColor: look.bg,
            borderColor: look.border,
            borderWidth: look.width,
            opacity: state === 'dimmed' ? 0.5 : 1,
            transform: [{ scale: pressed && !reducedMotion ? 0.97 : 1 }],
            transitionProperty: ['transform', 'opacity'],
            transitionDuration: 120,
            transitionTimingFunction: EASE_OUT,
          },
        ]}>
        <View style={styles.optionContent}>{children}</View>
        {state === 'correct' ? <Icon name={{ ios: 'checkmark.circle.fill', android: 'check_circle' }} size={22} tone="success" /> : null}
        {state === 'wrong' ? <Icon name={{ ios: 'xmark.circle.fill', android: 'cancel' }} size={22} tone="danger" /> : null}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    flex: 1,
    height: 10,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: Radius.full,
  },
  speak: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instruction: {
    letterSpacing: 0.8,
  },
  option: {
    minHeight: Layout.tapTarget + 12,
    borderRadius: Radius.md,
    paddingHorizontal: Space.base,
    paddingVertical: Space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
  },
  optionContent: {
    flex: 1,
  },
});
