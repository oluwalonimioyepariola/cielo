import {
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_700Bold,
  useFonts,
} from '@expo-google-fonts/nunito';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { FontFamily } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { useSession } from '@/lib/session';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const scheme = useColorScheme();
  const colors = useTheme();
  const session = useSession();
  const [fontsLoaded, fontError] = useFonts({ Nunito_400Regular, Nunito_500Medium, Nunito_700Bold });
  const ready = fontsLoaded || !!fontError;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  // Keep the native splash up until Nunito is ready, so text never flashes in the system font.
  if (!ready) return null;

  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme: Theme = {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.canvas,
      card: colors.canvas,
      text: colors.ink,
      border: colors.hairline,
    },
    fonts: {
      ...base.fonts,
      regular: { fontFamily: FontFamily.regular, fontWeight: '400' },
      medium: { fontFamily: FontFamily.medium, fontWeight: '500' },
      bold: { fontFamily: FontFamily.bold, fontWeight: '700' },
      heavy: { fontFamily: FontFamily.bold, fontWeight: '700' },
    },
  };

  // The main app opens once the user has signed in and Cielo has found their words.
  const onboarded = session.signedIn && session.imported;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={navigationTheme}>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }}>
          <Stack.Protected guard={!onboarded}>
            <Stack.Screen name="(onboarding)" />
          </Stack.Protected>
          <Stack.Protected guard={onboarded}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="lesson/[id]" options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="voice" options={{ presentation: 'modal' }} />
          </Stack.Protected>
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
