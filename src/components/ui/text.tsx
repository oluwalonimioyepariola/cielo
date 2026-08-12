import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { Type, type ThemeColor, type TypeVariant } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type TextProps = RNTextProps & {
  variant?: TypeVariant;
  tone?: ThemeColor;
};

// Big display type grows less with the system text size so headlines don't swallow the screen.
const DISPLAY_MAX_SCALE = 1.4;

export function Text({ variant = 'body', tone = 'ink', style, ...rest }: TextProps) {
  const colors = useTheme();
  const isDisplay = variant === 'displayLg' || variant === 'displayMd';

  return (
    <RNText
      maxFontSizeMultiplier={isDisplay ? DISPLAY_MAX_SCALE : undefined}
      style={[Type[variant], { color: colors[tone] }, style]}
      {...rest}
    />
  );
}
