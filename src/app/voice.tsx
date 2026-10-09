import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Palette, Radius, Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { updateSession } from '@/lib/session';
import { refreshVoice, speakSpanish, type SpanishVoice, type VoiceTier } from '@/lib/speak';

const SAMPLE = '¿Ya comiste?';
const TIER_RANK: Record<VoiceTier, number> = { premium: 3, enhanced: 2, standard: 1 };
const TIER_LABEL: Record<VoiceTier, string> = { premium: 'Premium', enhanced: 'Enhanced', standard: 'Basic voice' };

// Where the free natural voices live, in each system's own words.
const STEPS =
  Platform.OS === 'ios'
    ? [
        'In Settings, tap Accessibility, then Spoken Content. It’s the last row under Vision (some iPhones call it Read & Speak).',
        'Tap Voices, then Spanish.',
        'Under Spanish (Mexico), pick a voice marked Premium or Enhanced and tap the download button. It’s free; Wi-Fi is best.',
        'Come back to Cielo. It switches to the new voice by itself.',
      ]
    : [
        'Open Settings and search for “Text-to-speech output”.',
        'Choose the Google engine, then Install voice data.',
        'Download Spanish (Mexico) or Spanish (United States). It’s free; Wi-Fi is best.',
        'Come back to Cielo. It switches to the new voice by itself.',
      ];

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

/**
 * "Hear Spanish like a native": shown once on the map after the chat is imported (and once for
 * learners who imported before it existed), and any time from the You tab. Cielo always speaks with
 * the best voice on the phone; this sheet shows how to download a free natural one.
 */
export default function VoiceSheet() {
  const colors = useTheme();
  const { bottom } = useSafeAreaInsets();
  const [voice, setVoice] = useState<SpanishVoice | null | undefined>(undefined);
  const [upgraded, setUpgraded] = useState(false);
  const startTier = useRef<VoiceTier | null>(null);

  useEffect(() => {
    updateSession({ voicePromptSeen: true });
    refreshVoice().then((found) => {
      startTier.current = found?.tier ?? 'standard';
      setVoice(found);
    });
    // Back from Settings: look again, and celebrate if the voice got better.
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      refreshVoice().then((found) => {
        setVoice(found);
        const before = TIER_RANK[startTier.current ?? 'standard'];
        if (found && TIER_RANK[found.tier] > before) {
          setUpgraded(true);
          speakSpanish(SAMPLE);
        }
      });
    });
    return () => subscription.remove();
  }, []);

  const natural = !!voice && voice.tier !== 'standard';

  const openSettings = () => {
    if (Platform.OS === 'android') {
      // Straight to the text-to-speech page where it exists; otherwise the app's settings.
      Linking.sendIntent('com.android.settings.TTS_SETTINGS').catch(() => Linking.openSettings());
    } else {
      // Apple only offers a public link to the app's own page. This private one opens the Settings
      // app itself (iOS ignores the Accessibility part today), so the steps start from its home.
      Linking.openURL('App-prefs:ACCESSIBILITY').catch(() => Linking.openSettings());
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.canvas }]}>
      <ScrollView contentContainerStyle={styles.content} bounces={false}>
        {/* The sky, with a phrase you can hear in the phone's current voice. */}
        <View style={[styles.sky, { backgroundColor: colors.skyField }]}>
          <View style={styles.sunHalo} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <View style={[styles.sunDisc, { backgroundColor: colors.sun }]} />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Play ${SAMPLE}`}
            accessibilityHint="Plays the phrase in your phone's Spanish voice"
            onPress={() => speakSpanish(SAMPLE)}
            style={({ pressed }) => [styles.bubble, { opacity: pressed ? 0.85 : 1 }]}>
            <View style={[styles.play, { backgroundColor: Palette.light.primary }]}>
              <Icon name={{ ios: 'speaker.wave.2.fill', android: 'volume_up' }} size={18} color="#ffffff" />
            </View>
            <View>
              <Text variant="headingMd" style={{ color: Palette.light.ink }}>
                {SAMPLE}
              </Text>
              <Text variant="bodySm" style={{ color: Palette.light.inkMuted }}>
                Tap to hear it
              </Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.body}>
          {upgraded || natural ? (
            <Animated.View
              key="natural"
              entering={FadeIn.duration(320).easing(EASE_OUT).reduceMotion(ReduceMotion.System)}
              style={styles.copy}>
              <Text variant="displayMd">{upgraded ? 'That’s more like it' : 'Your Spanish sounds natural'}</Text>
              <Text variant="bodyLg" tone="inkSoft">
                Cielo now speaks with the best Spanish voice on your phone, in every lesson. Tap the phrase to hear it.
              </Text>
            </Animated.View>
          ) : (
            <View style={styles.copy}>
              <Text variant="displayMd">Hear Spanish like a native</Text>
              <Text variant="bodyLg" tone="inkSoft">
                Your phone has free, natural-sounding Spanish voices. Download one once and every phrase in Cielo sounds
                like a real person, even offline.
              </Text>
            </View>
          )}

          {voice !== undefined ? (
            <View style={[styles.status, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
              <Icon
                name={natural ? { ios: 'checkmark.seal.fill', android: 'verified' } : { ios: 'waveform', android: 'graphic_eq' }}
                size={20}
                tone={natural ? 'success' : 'inkMuted'}
              />
              <Text variant="bodyStrong" style={styles.flex}>
                {voice ? `Now using ${voice.name}` : 'No Spanish voice found yet'}
              </Text>
              {voice ? (
                <Text variant="caption" tone={natural ? 'success' : 'inkMuted'}>
                  {TIER_LABEL[voice.tier]}
                </Text>
              ) : null}
            </View>
          ) : null}

          {natural ? null : (
            <View style={styles.steps}>
              {STEPS.map((step, i) => (
                <View key={step} style={styles.step}>
                  <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                    <Text variant="label" style={{ color: colors.onPrimary }}>
                      {i + 1}
                    </Text>
                  </View>
                  <Text variant="body" tone="inkSoft" style={styles.flex}>
                    {step}
                  </Text>
                </View>
              ))}
            </View>
          )}

        </View>
      </ScrollView>

      {/* The actions stay in reach, however long the steps are. */}
      <View style={[styles.actions, { paddingBottom: bottom + Space.base, borderColor: colors.hairline }]}>
        {natural ? (
          <Button label="Done" onPress={() => router.back()} />
        ) : (
          <>
            <Button label="Open Settings" onPress={openSettings} />
            <Button variant="plain" label="Maybe later" onPress={() => router.back()} />
          </>
        )}
      </View>
    </View>
  );
}

const SUN = 96;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  sky: {
    height: 184,
    justifyContent: 'flex-end',
    padding: Space.lg,
    overflow: 'hidden',
  },
  sunHalo: {
    position: 'absolute',
    top: Space.base,
    right: -SUN * 0.3,
    width: SUN * 1.5,
    height: SUN * 1.5,
    borderRadius: SUN,
    alignItems: 'center',
    justifyContent: 'center',
    // The sky lit up around the sun, as on the welcome screen.
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  sunDisc: {
    width: SUN,
    height: SUN,
    borderRadius: SUN / 2,
  },
  bubble: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    backgroundColor: Palette.light.surface,
    borderRadius: Radius.lg,
    borderBottomLeftRadius: Space.xs,
    paddingVertical: Space.md,
    paddingLeft: Space.md,
    paddingRight: Space.lg,
  },
  play: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    padding: Space.lg,
    gap: Space.lg,
  },
  copy: {
    gap: Space.sm,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Space.base,
    paddingVertical: Space.md,
  },
  steps: {
    gap: Space.base,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Space.md,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    gap: Space.xs,
    paddingTop: Space.md,
    paddingHorizontal: Space.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  flex: {
    flex: 1,
  },
});
