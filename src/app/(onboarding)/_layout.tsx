import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

export default function OnboardingLayout() {
  const colors = useTheme();

  return (
    <Stack
      screenOptions={{
        headerTransparent: true,
        headerTitle: '',
        headerShadowVisible: false,
        headerTintColor: colors.ink,
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.canvas },
      }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="import" />
      <Stack.Screen name="who" />
    </Stack>
  );
}
