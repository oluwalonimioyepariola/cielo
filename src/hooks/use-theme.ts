import { Palette, type ThemeColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useTheme(): ThemeColors {
  return Palette[useColorScheme() === 'dark' ? 'dark' : 'light'];
}
