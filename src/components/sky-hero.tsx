import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, FadeOut, ReduceMotion, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { Layout, Palette, Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

// The first Spanish anyone wants: greetings everyone recognises, written in the sky.
const PHRASES = [
  { es: '¡Hola!', en: 'hello' },
  { es: '¿Cómo estás?', en: 'how are you?' },
  { es: 'Buenos días', en: 'good morning' },
];
const PHRASE_HOLD_MS = 3200;

// Soft clouds at different depths, placed by hand so the sky never looks random.
// left/top in % of the field, width in points; farther clouds are smaller and fainter.
const CLOUDS = [
  { left: 50, top: 17, width: 58, opacity: 0.35 },
  { left: -6, top: 74, width: 96, opacity: 0.5 },
  { left: 62, top: 66, width: 44, opacity: 0.3 },
];

type SkyFieldProps = {
  /** Share of the screen height the sky takes. */
  share: number;
  /** Show the rising sun in the lower right. */
  sun?: boolean;
  /** Show the chat cloud mascot in the top right. Off where the screen already shows chat bubbles. */
  chatCloud?: boolean;
  children?: ReactNode;
};

/**
 * Cielo's sky: a daytime twilight-blue field (deeper in dark mode) with soft clouds, the chat
 * cloud (Cielo's own mascot: the sky, talking), an optional rising sun, and a scalloped cloud edge
 * that hands over to the cream page. No moon or stars: those say "sleep app", and Cielo is a day sky.
 * The sky cast fades in once; with Reduce Motion it simply appears.
 */
export function SkyField({ share, sun = false, chatCloud = true, children }: SkyFieldProps) {
  const colors = useTheme();
  const { top } = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const fieldHeight = Math.max(MIN_FIELD, Math.round(height * share));

  return (
    <View>
      <View style={[styles.field, { height: fieldHeight, backgroundColor: colors.skyField, paddingTop: top + Space.base }]}>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
          {CLOUDS.map((cloud, i) => (
            <Animated.View
              key={i}
              entering={FadeIn.duration(900).delay(250 + i * 120).reduceMotion(ReduceMotion.System)}
              style={[styles.abs, { left: `${cloud.left}%`, top: `${cloud.top}%` }]}>
              {/* Depth lives on an inner layer: the fade-in animates the outer view's opacity to 1. */}
              <View style={{ opacity: cloud.opacity }}>
                <Cloud width={cloud.width} color={colors.onSky} />
              </View>
            </Animated.View>
          ))}
          {chatCloud ? (
            <Animated.View
              entering={FadeInDown.duration(800).delay(200).easing(EASE_OUT).reduceMotion(ReduceMotion.System)}
              style={[styles.chatCloud, { top: top + Space.xl }]}>
              <ChatCloud width={84} color={colors.onSky} dots={colors.skyField} />
            </Animated.View>
          ) : null}
          {sun ? (
            // The sun rises once from behind the cloud edge.
            <Animated.View
              entering={FadeInDown.duration(1100).delay(150).easing(EASE_OUT).withInitialValues({ transform: [{ translateY: 70 }] }).reduceMotion(ReduceMotion.System)}
              style={styles.sun}>
              <View style={styles.sunHalo} />
              <View style={styles.sunDisc} />
            </Animated.View>
          ) : null}
        </View>
        {children}
      </View>

      <CloudEdge color={colors.canvas} />
    </View>
  );
}

/**
 * The welcome sky: the wordmark and one of "your" phrases written large in Spanish, changing
 * every few seconds, with the sun rising behind the clouds. With Reduce Motion the first phrase stays.
 */
export function SkyHero() {
  const colors = useTheme();
  const reducedMotion = useReducedMotion();
  const [phrase, setPhrase] = useState(0);

  useEffect(() => {
    if (reducedMotion) return;
    const timer = setInterval(() => setPhrase((p) => (p + 1) % PHRASES.length), PHRASE_HOLD_MS);
    return () => clearInterval(timer);
  }, [reducedMotion]);

  const current = PHRASES[phrase];

  return (
    // The sky owns a little over half the screen, so the page below never has a dead gap.
    <SkyField share={0.56} sun>
      <Text variant="headingLg" style={[styles.wordmark, { color: colors.onSky }]} accessibilityRole="header">
        cielo
      </Text>

      <View style={styles.phrase} accessibilityLiveRegion="none" accessible accessibilityLabel={`${current.es}, ${current.en}`}>
        <Animated.View
          key={phrase}
          entering={FadeIn.duration(500).easing(EASE_OUT).reduceMotion(ReduceMotion.System)}
          exiting={FadeOut.duration(250).reduceMotion(ReduceMotion.System)}
          style={styles.phraseInner}>
          <Text variant="displayLg" style={[styles.phraseEs, { color: colors.onSky }]}>
            {current.es}
          </Text>
          <Text variant="bodyLg" style={{ color: colors.onSkySoft }}>
            {current.en}
          </Text>
        </Animated.View>
      </View>
    </SkyField>
  );
}

/** A small soft cloud: a rounded base with two puffs. Height is about 0.72 × width. */
function Cloud({ width: w, color }: { width: number; color: string }) {
  return (
    <View style={{ width: w, height: w * 0.72 }}>
      <View style={[styles.round, { backgroundColor: color, width: w * 0.46, height: w * 0.46, left: w * 0.14, top: w * 0.06 }]} />
      <View style={[styles.round, { backgroundColor: color, width: w * 0.38, height: w * 0.38, left: w * 0.46, top: w * 0.18 }]} />
      <View style={[styles.round, { backgroundColor: color, width: w, height: w * 0.36, top: w * 0.32 }]} />
    </View>
  );
}

/** Cielo's mascot: a cloud with a speech-bubble tail and three "typing" dots. */
function ChatCloud({ width: w, color, dots }: { width: number; color: string; dots: string }) {
  const dot = w * 0.08;
  return (
    <View style={{ width: w, height: w * 0.84 }}>
      <View style={[styles.tail, { backgroundColor: color, width: w * 0.18, height: w * 0.18, left: w * 0.16, top: w * 0.56 }]} />
      <Cloud width={w} color={color} />
      <View style={[styles.dots, { top: w * 0.44, width: w }]}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ width: dot, height: dot, borderRadius: dot / 2, backgroundColor: dots }} />
        ))}
      </View>
    </View>
  );
}

// Puff sizes for the cloud edge, repeated across the screen width. Varied so it reads as cloud, not lace.
const PUFFS = [76, 104, 64, 92, 120, 70, 98, 84];

/** A scalloped row of overlapping puffs in the page color, laid over the bottom of the sky. */
function CloudEdge({ color }: { color: string }) {
  const { width } = useWindowDimensions();
  const puffs: { size: number; left: number }[] = [];
  let x = -24;
  for (let i = 0; x < width + 24; i++) {
    const size = PUFFS[i % PUFFS.length];
    puffs.push({ size, left: x });
    x += size * 0.62;
  }
  return (
    <View style={styles.edge} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {puffs.map((p, i) => (
        <View
          key={i}
          style={[
            styles.puff,
            { width: p.size, height: p.size, left: p.left, top: EDGE_DEPTH - p.size / 2, backgroundColor: color },
          ]}
        />
      ))}
      <View style={[styles.edgeFill, { backgroundColor: color }]} />
    </View>
  );
}

const SUN = 112;
const EDGE_DEPTH = 34;
const MIN_FIELD = 300;

const styles = StyleSheet.create({
  field: {
    paddingHorizontal: Layout.screenGutter,
    paddingBottom: EDGE_DEPTH + Space.xxl,
    overflow: 'hidden',
  },
  wordmark: {
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.6,
  },
  phrase: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 110,
  },
  phraseInner: {
    gap: Space.xs,
  },
  phraseEs: {
    fontSize: 46,
    lineHeight: 52,
    letterSpacing: -1,
  },
  star: {
    position: 'absolute',
    borderRadius: 1,
    transform: [{ rotate: '45deg' }],
  },
  abs: {
    position: 'absolute',
  },
  round: {
    position: 'absolute',
    borderRadius: 999,
  },
  chatCloud: {
    position: 'absolute',
    right: Layout.screenGutter,
  },
  tail: {
    position: 'absolute',
    borderRadius: 3,
    transform: [{ rotate: '45deg' }],
  },
  dots: {
    position: 'absolute',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  sun: {
    position: 'absolute',
    right: -SUN * 0.18,
    bottom: -SUN * 0.2,
    width: SUN * 1.5,
    height: SUN * 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sunHalo: {
    position: 'absolute',
    width: SUN * 1.5,
    height: SUN * 1.5,
    borderRadius: SUN,
    // A soft glow of the sky itself, not a yellow wash: yellow over blue turns muddy.
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  sunDisc: {
    width: SUN,
    height: SUN,
    borderRadius: SUN / 2,
    backgroundColor: Palette.light.sun,
  },
  edge: {
    height: EDGE_DEPTH,
    marginTop: -EDGE_DEPTH,
  },
  puff: {
    position: 'absolute',
    borderRadius: 999,
  },
  edgeFill: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: EDGE_DEPTH,
    height: EDGE_DEPTH,
  },
});
