import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import type { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type IconProps = {
  /** SF Symbol on iOS, Material Symbol on Android. */
  name: SymbolViewProps['name'];
  size?: number;
  tone?: ThemeColor;
  /** Raw color, for the rare surfaces outside the palette (e.g. Apple's black/white button). */
  color?: string;
};

export function Icon({ name, size = 22, tone = 'ink', color }: IconProps) {
  const colors = useTheme();
  return <SymbolView name={name} size={size} tintColor={color ?? colors[tone]} />;
}
