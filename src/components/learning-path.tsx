import { router } from 'expo-router';
import type { SymbolViewProps } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { cubicBezier, useReducedMotion } from 'react-native-reanimated';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Palette, Radius, Space, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Lesson, LessonState, Unit } from '@/learning/curriculum';

/**
 * Cielo's learning map is the user's own conversation. Each unit is a "Day" in the chat, each
 * lesson a numbered message bubble ("Lesson 1"): learned ones flip to Spanish ("Lección 1") and
 * carry read receipts, today's is the single blue bubble, and the rest wait greyed out.
 */

const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);

// Each day gets a member of the sky cast, in order.
const DAY_MASCOTS: { icon: SymbolViewProps['name']; tone: ThemeColor }[] = [
  { icon: { ios: 'sun.max.fill', android: 'wb_sunny' }, tone: 'sun' },
  { icon: { ios: 'cloud.fill', android: 'cloud' }, tone: 'sky' },
  { icon: { ios: 'heart.fill', android: 'favorite' }, tone: 'blush' },
  { icon: { ios: 'moon.stars.fill', android: 'bedtime' }, tone: 'dusk' },
  { icon: { ios: 'star.fill', android: 'star' }, tone: 'sun' },
];

type Props = {
  units: Unit[];
  states: Map<string, LessonState>;
  /** The lesson finished just before returning here: its bubble plays the "delivered" moment once. */
  celebrateId: string | null;
  /** Reports the current lesson's y position in the path, for auto-scrolling. */
  onCurrentLayout: (y: number) => void;
  /** "I know the basics": opens the Day 0 test. */
  onSkipStarter: () => void;
  /** Phrases due for spaced review right now. */
  dueCount: number;
  onReview: () => void;
};

export function LearningPath({ units, states, celebrateId, onCurrentLayout, onSkipStarter, dueCount, onReview }: Props) {
  const [dayY, setDayY] = useState<Record<number, number>>({});
  const [current, setCurrent] = useState<{ day: number; y: number } | null>(null);

  // Day and bubble positions arrive in either order; report once both are known.
  const currentDayY = current ? dayY[current.day] : undefined;
  useEffect(() => {
    if (current && currentDayY !== undefined) onCurrentLayout(currentDayY + current.y);
  }, [current, currentDayY, onCurrentLayout]);

  // Lessons are numbered across the whole path; recaps don't take a number.
  const numbers = new Map<string, number>();
  for (const lesson of units.flatMap((u) => u.lessons)) {
    if (lesson.kind === 'lesson') numbers.set(lesson.id, numbers.size + 1);
  }

  return (
    <View style={styles.path}>
      {dueCount > 0 ? <ReviewBubble count={dueCount} onPress={onReview} /> : null}
      {units.map((unit) => (
        <View
          key={unit.index}
          style={styles.day}
          onLayout={(e) => {
            const y = e.nativeEvent.layout.y;
            setDayY((prev) => (prev[unit.index] === y ? prev : { ...prev, [unit.index]: y }));
          }}>
          <DayChip unit={unit} states={states} onSkip={unit.lessons[0]?.id.startsWith('u0-') ? onSkipStarter : undefined} />

          {unit.lessons.map((lesson) => {
            const state = states.get(lesson.id) ?? 'locked';
            const onLayout = (e: LayoutChangeEvent) => {
              if (state !== 'current') return;
              const y = e.nativeEvent.layout.y;
              setCurrent((prev) => (prev?.day === unit.index && prev.y === y ? prev : { day: unit.index, y }));
            };
            return lesson.kind === 'checkpoint' ? (
              <RecapCard key={lesson.id} unit={unit} lesson={lesson} state={state} onLayout={onLayout} />
            ) : (
              <MessageBubble
                key={lesson.id}
                lesson={lesson}
                number={numbers.get(lesson.id) ?? 0}
                state={state}
                celebrate={lesson.id === celebrateId}
                onLayout={onLayout}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

/**
 * Spaced review arrives as an incoming message: on the left, unlike the learner's own lessons,
 * like their chat checking in on them. "¿Te acuerdas?" means "Do you remember?".
 */
function ReviewBubble({ count, onPress }: { count: number; onPress: () => void }) {
  const colors = useTheme();
  const reducedMotion = useReducedMotion();
  const [pressed, setPressed] = useState(false);
  const label = `${count} ${count === 1 ? 'phrase' : 'phrases'} to review`;

  return (
    <View style={styles.reviewRow}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Review: ${label}`}
        accessibilityHint="Practises the phrases you're about to forget"
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        onPress={onPress}
        style={styles.bubblePressable}>
        <Animated.View
          style={[
            styles.bubble,
            styles.reviewBubble,
            {
              backgroundColor: colors.surface,
              borderColor: colors.primary,
              transform: [{ scale: pressed && !reducedMotion ? 0.97 : 1 }],
              transitionProperty: 'transform',
              transitionDuration: 120,
              transitionTimingFunction: EASE_OUT,
            },
          ]}>
          <View style={styles.reviewTitle}>
            <Icon name={{ ios: 'clock.arrow.circlepath', android: 'history' }} size={18} tone="primary" />
            <Text variant="headingMd">¿Te acuerdas?</Text>
          </View>
          <Text variant="bodySm" tone="inkMuted">
            {label}
          </Text>
        </Animated.View>
      </Pressable>
      <Text variant="caption" tone="primary" style={styles.reviewTag}>
        REVIEW
      </Text>
    </View>
  );
}

/** Like the date separator in a chat: "Primeros pasos", "Day 1". */
function DayChip({ unit, states, onSkip }: { unit: Unit; states: Map<string, LessonState>; onSkip?: () => void }) {
  const colors = useTheme();
  const mascot = DAY_MASCOTS[unit.index % DAY_MASCOTS.length];
  const done = unit.lessons.filter((l) => states.get(l.id) === 'done').length;
  const allDone = done === unit.lessons.length;

  return (
    <View style={styles.dayChipRow}>
      <View style={[styles.dayChip, { backgroundColor: colors.surface, borderColor: colors.hairline }]} accessibilityRole="header">
        <Icon name={mascot.icon} size={18} tone={mascot.tone} />
        <Text variant="label">{unit.label}</Text>
      </View>
      <Text variant="caption" tone="inkMuted">
        {allDone ? 'All learned' : `${done} of ${unit.lessons.length} learned`}
      </Text>
      {onSkip && !allDone ? (
        <Pressable accessibilityRole="button" hitSlop={12} onPress={onSkip}>
          <Text variant="caption" tone="primary">
            Know the basics? Take a quick test
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

type BubbleProps = {
  lesson: Lesson;
  number: number;
  state: LessonState;
  celebrate: boolean;
  onLayout: (e: LayoutChangeEvent) => void;
};

function MessageBubble({ lesson, number, state, celebrate, onLayout }: BubbleProps) {
  const colors = useTheme();
  const reducedMotion = useReducedMotion();
  const [pressed, setPressed] = useState(false);
  const locked = state === 'locked';
  const title = `Lesson ${number}`;
  const count = lesson.items.length;
  const phrases = `${count} ${count === 1 ? 'phrase' : 'phrases'}`;

  const surface =
    state === 'current'
      ? { backgroundColor: colors.primary, borderColor: colors.primary }
      : state === 'done'
        ? { backgroundColor: colors.surface, borderColor: colors.hairline }
        : { backgroundColor: colors.surfaceMuted, borderColor: colors.surfaceMuted };

  return (
    <View style={styles.bubbleRow} onLayout={onLayout}>
      {state === 'current' ? (
        <Text variant="caption" tone="primary" style={styles.todayTag}>
          TODAY
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${phrases}${state === 'done' ? ', learned' : ''}`}
        accessibilityState={{ disabled: locked }}
        accessibilityHint={locked ? 'Unlocks after the lesson before it' : state === 'current' ? 'Starts the lesson' : 'Practise again'}
        disabled={locked}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        onPress={() => router.push({ pathname: '/lesson/[id]', params: { id: lesson.id } })}
        style={styles.bubblePressable}>
        <Animated.View
          style={[
            styles.bubble,
            surface,
            {
              transform: [{ scale: pressed && !reducedMotion ? 0.97 : 1 }],
              transitionProperty: 'transform',
              transitionDuration: 120,
              transitionTimingFunction: EASE_OUT,
            },
          ]}>
          {state === 'done' ? (
            <BubbleContent title={`Lección ${number}`} detail={`${title} · ${count} learned`} />
          ) : state === 'current' ? (
            <BubbleContent title={title} detail={`${count} new ${count === 1 ? 'phrase' : 'phrases'}`} tone="onPrimary" />
          ) : (
            <BubbleContent title={title} detail={phrases} tone="inkMuted" />
          )}

          {celebrate ? (
            // The "delivered" moment: today's blue bubble fades away to reveal it in Spanish.
            <Animated.View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                styles.bubble,
                {
                  backgroundColor: colors.primary,
                  borderColor: colors.primary,
                  animationName: { from: { opacity: 1 }, to: { opacity: 0 } },
                  animationDuration: 600,
                  animationDelay: 250,
                  animationTimingFunction: EASE_OUT,
                  animationFillMode: 'both',
                },
              ]}>
              <BubbleContent title={title} detail={`${count} new ${count === 1 ? 'phrase' : 'phrases'}`} tone="onPrimary" />
            </Animated.View>
          ) : null}
        </Animated.View>
      </Pressable>

      <Receipt state={state} celebrate={celebrate && !reducedMotion} />
    </View>
  );
}

function BubbleContent({ title, detail, tone = 'ink' }: { title: string; detail: string; tone?: ThemeColor }) {
  const onBlue = tone === 'onPrimary';
  return (
    <>
      <Text variant="headingMd" tone={tone}>
        {title}
      </Text>
      <Text variant="bodySm" tone={onBlue ? 'onPrimary' : 'inkMuted'} style={onBlue && styles.softOnBlue}>
        {detail}
      </Text>
    </>
  );
}

/** Chat-style receipts: ✓✓ learned, ✓ ready today, 🕓 waiting. */
function Receipt({ state, celebrate }: { state: LessonState; celebrate: boolean }) {
  const label = { done: 'Learned', current: 'Ready', locked: 'Waiting' }[state];
  const icon: SymbolViewProps['name'] =
    state === 'done'
      ? { ios: 'checkmark.circle.fill', android: 'done_all' }
      : state === 'current'
        ? { ios: 'checkmark', android: 'check' }
        : { ios: 'clock', android: 'schedule' };
  const tone: ThemeColor = state === 'done' ? 'primary' : 'inkMuted';

  return (
    <Animated.View
      style={[
        styles.receipt,
        celebrate && {
          animationName: { from: { opacity: 0, transform: [{ scale: 0.8 }] }, to: { opacity: 1, transform: [{ scale: 1 }] } },
          animationDuration: 400,
          animationDelay: 700,
          animationTimingFunction: EASE_OUT,
          animationFillMode: 'both',
        },
      ]}>
      <Icon name={icon} size={13} tone={tone} />
      <Text variant="caption" tone={tone}>
        {label}
      </Text>
    </Animated.View>
  );
}

type RecapProps = {
  unit: Unit;
  lesson: Lesson;
  state: LessonState;
  onLayout: (e: LayoutChangeEvent) => void;
};

/** The day's checkpoint: a recap of every phrase from that day, sealed with a heart. */
function RecapCard({ unit, lesson, state, onLayout }: RecapProps) {
  const colors = useTheme();
  const reducedMotion = useReducedMotion();
  const [pressed, setPressed] = useState(false);
  const locked = state === 'locked';

  const title = state === 'done' ? `${unit.label}, learned` : `${unit.label} recap`;
  const body =
    state === 'done'
      ? `All ${lesson.items.length} phrases are yours now.`
      : state === 'current'
        ? `Review all ${lesson.items.length} phrases from today to finish the day.`
        : `Unlocks after today's messages.`;

  return (
    <View onLayout={onLayout}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${body}`}
        accessibilityState={{ disabled: locked }}
        disabled={locked}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        onPress={() => router.push({ pathname: '/lesson/[id]', params: { id: lesson.id } })}>
        <Animated.View
          style={[
            styles.recap,
            {
              backgroundColor: locked ? 'transparent' : colors.surface,
              borderColor: state === 'current' ? colors.primary : colors.hairline,
              borderWidth: state === 'current' ? 2 : 1,
              borderStyle: locked ? 'dashed' : 'solid',
              transform: [{ scale: pressed && !reducedMotion ? 0.98 : 1 }],
              transitionProperty: 'transform',
              transitionDuration: 120,
              transitionTimingFunction: EASE_OUT,
            },
          ]}>
          <View style={[styles.recapSeal, { backgroundColor: locked ? colors.surfaceMuted : Palette.light.blush }]}>
            <Icon
              name={locked ? { ios: 'lock.fill', android: 'lock' } : { ios: 'heart.fill', android: 'favorite' }}
              size={20}
              color={locked ? colors.inkMuted : Palette.light.ink}
            />
          </View>
          <View style={styles.recapText}>
            <Text variant="bodyStrong" tone={locked ? 'inkMuted' : 'ink'}>
              {title}
            </Text>
            <Text variant="bodySm" tone="inkMuted">
              {body}
            </Text>
          </View>
          {state === 'current' ? <Icon name={{ ios: 'chevron.right', android: 'chevron_right' }} size={16} tone="primary" /> : null}
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  path: {
    gap: Space.xxl,
  },
  day: {
    gap: Space.base,
  },
  dayChipRow: {
    alignItems: 'center',
    gap: Space.xs,
    paddingBottom: Space.sm,
  },
  dayChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: Space.base,
    paddingVertical: Space.sm,
  },
  bubbleRow: {
    alignItems: 'flex-end',
    gap: Space.xxs,
  },
  todayTag: {
    letterSpacing: 0.8,
    marginRight: Space.xs,
  },
  reviewRow: {
    alignItems: 'flex-start',
    gap: Space.xxs,
  },
  reviewBubble: {
    // An incoming message: the tail corner is on the left.
    borderBottomRightRadius: Radius.lg,
    borderBottomLeftRadius: Space.xs,
    borderWidth: 2,
  },
  reviewTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },
  reviewTag: {
    letterSpacing: 0.8,
    marginLeft: Space.xs,
  },
  bubblePressable: {
    maxWidth: '82%',
  },
  bubble: {
    // A sent-message shape: round everywhere except the corner the "tail" would leave from.
    borderRadius: Radius.lg,
    borderBottomRightRadius: Space.xs,
    borderWidth: 1,
    paddingHorizontal: Space.base,
    paddingVertical: Space.md,
    gap: Space.xxs,
  },
  softOnBlue: {
    opacity: 0.85,
  },
  receipt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.xxs,
    marginRight: Space.xs,
  },
  recap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    borderRadius: Radius.md,
    padding: Space.base,
  },
  recapSeal: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recapText: {
    flex: 1,
    gap: 2,
  },
});
