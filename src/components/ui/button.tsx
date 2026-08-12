import type { SymbolViewProps } from 'expo-symbols';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from 'react-native';
import Animated, { cubicBezier, useReducedMotion } from 'react-native-reanimated';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Layout, Radius, Space, type ThemeColor } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

/** `apple` follows Apple's sign-in button rules: pure black on light, pure white on dark. */
type Variant = 'primary' | 'secondary' | 'plain' | 'apple';

type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: Variant;
  icon?: SymbolViewProps['name'];
  /** Shows a spinner and blocks presses while work is running. */
  loading?: boolean;
};

const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);
const PRESS_SCALE = 0.97;

/**
 * Buttons: the primary is the twilight 32px-radius pill, the secondary a fully round outline.
 * Press feedback shrinks the whole button on touch-down, not on release, so it feels immediate.
 */
export function Button({
  label,
  variant = 'primary',
  icon,
  loading,
  disabled,
  onPressIn,
  onPressOut,
  ...rest
}: ButtonProps) {
  const colors = useTheme();
  const isDark = useColorScheme() === 'dark';
  const reducedMotion = useReducedMotion();
  const [pressed, setPressed] = useState(false);

  const surface = {
    primary: { backgroundColor: colors.primary, borderRadius: Radius.xl },
    secondary: {
      backgroundColor: colors.surface,
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: colors.ink,
    },
    plain: { backgroundColor: 'transparent', borderRadius: Radius.full },
    apple: { backgroundColor: isDark ? '#ffffff' : '#000000', borderRadius: Radius.full },
  }[variant];
  const tone: ThemeColor = variant === 'primary' ? 'onPrimary' : 'ink';
  const rawColor = variant === 'apple' ? (isDark ? '#000000' : '#ffffff') : undefined;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={disabled || loading}
      pressRetentionOffset={16}
      onPressIn={(e) => {
        setPressed(true);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        onPressOut?.(e);
      }}
      {...rest}>
      <Animated.View
        style={[
          styles.base,
          surface,
          disabled && styles.disabled,
          {
            transform: [{ scale: pressed && !reducedMotion ? PRESS_SCALE : 1 }],
            transitionProperty: 'transform',
            transitionDuration: 120,
            transitionTimingFunction: EASE_OUT,
          },
        ]}>
        {loading ? (
          <ActivityIndicator size="small" color={rawColor ?? colors[tone]} />
        ) : icon ? (
          <Icon name={icon} size={18} tone={tone} color={rawColor} />
        ) : null}
        <Text variant="label" tone={tone} style={rawColor ? { color: rawColor } : undefined}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: Layout.tapTarget + 4,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.sm,
  },
  disabled: {
    opacity: 0.4,
  },
});
