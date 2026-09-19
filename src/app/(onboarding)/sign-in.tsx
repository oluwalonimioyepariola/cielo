import type { SymbolViewProps } from 'expo-symbols';
import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SkyField } from '@/components/sky-hero';
import { SkyStatusBar } from '@/components/sky-status-bar';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Layout, Palette, Radius, Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchAuthStatus, type AuthStatus } from '@/lib/auth-client';
import { restoreProgress } from '@/lib/backup';
import { updateSession } from '@/lib/session';
import { signInWithApple, signInWithGoogle, type SignInResult } from '@/lib/sign-in';

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

function continueSignedIn() {
  updateSession({ signedIn: true });
  router.push('/import');
}

type Provider = 'apple' | 'google';

// "Your words, kept in the sky": a few phrases floating as message bubbles. Positions are hand-set.
const FLOATING = [
  { text: 'Te extraño', left: '10%', top: '35%', rotate: '-4deg' },
  { text: '¿Ya comiste?', right: '8%', top: '52%', rotate: '3deg' },
  { text: 'Buenas noches', left: '18%', top: '69%', rotate: '-2deg' },
] as const;

export default function SignInScreen() {
  const colors = useTheme();
  const { bottom } = useSafeAreaInsets();
  const [busy, setBusy] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthStatus | null | undefined>(undefined);

  // Ask the server which sign-in methods are set up, so an unconfigured one explains itself.
  useEffect(() => {
    fetchAuthStatus().then(setStatus);
  }, []);

  const signIn = async (provider: Provider) => {
    setError(null);
    if (status === null) {
      setError("Cielo can't reach its server right now. Check your connection and try again.");
      return;
    }
    if (status && (!status.database || !status[provider])) {
      setError(`Sign in with ${provider === 'apple' ? 'Apple' : 'Google'} isn't set up on the server yet.`);
      return;
    }
    setBusy(provider);
    const result: SignInResult = await (provider === 'apple' ? signInWithApple() : signInWithGoogle());
    if (!result.ok) {
      setBusy(null);
      if (!result.cancelled) setError(result.message);
      return;
    }
    // A returning learner on a new phone: their words and progress come back, and the map opens.
    const restored = await restoreProgress();
    setBusy(null);
    if (restored) updateSession({ signedIn: true, imported: true });
    else continueSignedIn();
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.canvas }]}>
      <Stack.Screen options={{ headerTintColor: colors.onSky }} />
      <SkyStatusBar />

      <SkyField share={0.44} chatCloud={false}>
        <View style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {FLOATING.map((bubble, i) => (
            <Animated.View
              key={bubble.text}
              entering={FadeInDown.duration(700)
                .delay(200 + i * 120)
                .easing(EASE_OUT)
                .reduceMotion(ReduceMotion.System)}
              style={[styles.floating, { left: 'left' in bubble ? bubble.left : undefined, right: 'right' in bubble ? bubble.right : undefined, top: bubble.top }]}>
              <View style={[styles.bubble, { transform: [{ rotate: bubble.rotate }] }]}>
                <Text variant="bodyStrong" style={{ color: Palette.light.ink }}>
                  {bubble.text}
                </Text>
                <Icon name={{ ios: 'checkmark.circle.fill', android: 'done_all' }} size={14} color={Palette.light.primary} />
              </View>
            </Animated.View>
          ))}
        </View>
      </SkyField>

      <View style={[styles.body, { paddingBottom: bottom + Space.base }]}>
        <View style={styles.copy}>
          <Text variant="displayMd">Keep your progress safe</Text>
          <View style={styles.promises}>
            <PromiseRow
              icon={{ ios: 'icloud.fill', android: 'cloud_done' }}
              title="Your words and streak"
              body="Backed up to your account, so a new phone picks up where you left off."
            />
            <PromiseRow
              icon={{ ios: 'lock.fill', android: 'lock' }}
              title="Your chat"
              body="Stays on this phone. Always."
            />
          </View>
        </View>

        <View style={styles.actions}>
          {error ? (
            <Text variant="bodySm" tone="danger" style={styles.error} accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}
          <Button
            variant="apple"
            icon={{ ios: 'apple.logo' }}
            label="Continue with Apple"
            loading={busy === 'apple'}
            disabled={busy !== null}
            onPress={() => signIn('apple')}
          />
          <Button
            variant="secondary"
            label="Continue with Google"
            loading={busy === 'google'}
            disabled={busy !== null}
            onPress={() => signIn('google')}
          />
          {__DEV__ ? (
            // Development only, until the sign-in keys are in .env. Never in a release build.
            <Button variant="plain" label="Skip sign-in (development)" disabled={busy !== null} onPress={continueSignedIn} />
          ) : null}
        </View>
      </View>
    </View>
  );
}

function PromiseRow({ icon, title, body }: { icon: SymbolViewProps['name']; title: string; body: string }) {
  const colors = useTheme();
  return (
    <View style={styles.promise}>
      <View style={[styles.promiseIcon, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
        <Icon name={icon} size={18} tone="primary" />
      </View>
      <View style={styles.promiseText}>
        <Text variant="bodyStrong">{title}</Text>
        <Text variant="bodySm" tone="inkSoft">
          {body}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  floating: {
    position: 'absolute',
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    backgroundColor: Palette.light.surface,
    borderRadius: Radius.lg,
    borderBottomRightRadius: Space.xs,
    paddingHorizontal: Space.base,
    paddingVertical: Space.md,
  },
  body: {
    flex: 1,
    width: '100%',
    maxWidth: Layout.maxContentWidth,
    alignSelf: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.screenGutter,
    paddingTop: Space.base,
    gap: Space.xl,
  },
  copy: {
    gap: Space.lg,
  },
  promises: {
    gap: Space.base,
  },
  promise: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Space.md,
  },
  promiseIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promiseText: {
    flex: 1,
    gap: 2,
  },
  error: {
    textAlign: 'center',
    paddingBottom: Space.xs,
  },
  actions: {
    gap: Space.sm,
  },
});
