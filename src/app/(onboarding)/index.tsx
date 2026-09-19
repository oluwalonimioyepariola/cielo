import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SkyHero } from '@/components/sky-hero';
import { SkyStatusBar } from '@/components/sky-status-bar';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Layout, Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSession } from '@/lib/session';

const RISE = FadeInDown.duration(600)
  .delay(450)
  .easing(Easing.bezier(0.23, 1, 0.32, 1))
  .reduceMotion(ReduceMotion.System);

let resumedThisLaunch = false;

export default function WelcomeScreen() {
  const colors = useTheme();
  const session = useSession();
  const { bottom } = useSafeAreaInsets();

  // Signed in on an earlier launch but never finished importing: pick up where they left off,
  // once per launch. The import screen goes on top of this one (not instead of it), so Back
  // still works, and coming back here doesn't bounce forward again.
  useEffect(() => {
    if (session.signedIn && !resumedThisLaunch) {
      resumedThisLaunch = true;
      router.push('/import');
    }
  }, [session.signedIn]);

  return (
    <View style={[styles.root, { backgroundColor: colors.canvas }]}>
      <SkyStatusBar />
      <SkyHero />

      <Animated.View entering={RISE} style={[styles.body, { paddingBottom: bottom + Space.base }]}>
        <View style={styles.copy}>
          <Text variant="displayMd">Learn Spanish in your own words.</Text>
          <Text variant="bodyLg" tone="inkSoft">
            From the chat you love most: the Spanish for what you really say, every day.
          </Text>
        </View>

        <View style={styles.actions}>
          <Button label="Get started" onPress={() => router.push('/sign-in')} />
          <View style={styles.privacy}>
            <Icon name={{ ios: 'lock.fill', android: 'lock' }} size={13} tone="inkMuted" />
            <Text variant="caption" tone="inkMuted">
              Your chat never leaves your phone
            </Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  body: {
    flex: 1,
    width: '100%',
    maxWidth: Layout.maxContentWidth,
    alignSelf: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: Layout.screenGutter,
    paddingTop: Space.base,
    gap: Space.xl,
  },
  copy: {
    gap: Space.md,
  },
  actions: {
    gap: Space.sm,
  },
  privacy: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.xs,
    paddingTop: Space.xs,
  },
});
