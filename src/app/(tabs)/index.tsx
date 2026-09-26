import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LearningPath } from '@/components/learning-path';
import { Text } from '@/components/ui/text';
import { Layout, Radius, Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { lessonStates, type Unit } from '@/learning/curriculum';
import { takeJustCompleted } from '@/lib/celebrate';
import { Icon } from '@/components/ui/icon';
import { streakLength } from '@/learning/review';
import { getActivityDays, getCompletedLessons, getDueTexts } from '@/lib/db';
import { REVIEW_ID } from '@/lib/practice';
import { loadCurriculum } from '@/lib/path';

function greeting(hour: number) {
  if (hour >= 5 && hour < 12) return { es: 'Buenos días', en: 'Good morning' };
  if (hour >= 12 && hour < 19) return { es: 'Buenas tardes', en: 'Good afternoon' };
  return { es: 'Buenas noches', en: 'Good evening' };
}

// Leave room above the current lesson so its unit banner stays in view.
const SCROLL_HEADROOM = 220;

export default function LearnScreen() {
  const colors = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const scrolledFor = useRef(-1);
  const [units, setUnits] = useState<Unit[]>([]);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [focusKey, setFocusKey] = useState(0);
  const [celebrateId, setCelebrateId] = useState<string | null>(null);
  const [dueCount, setDueCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const { es, en } = greeting(new Date().getHours());

  useFocusEffect(
    useCallback(() => {
      const curriculum = loadCurriculum();
      setUnits(curriculum);
      const onPath = new Set(curriculum.flatMap((u) => u.items.map((i) => i.text)));
      setDueCount(getDueTexts(new Date()).filter((text) => onPath.has(text)).length);
      setStreak(streakLength(getActivityDays(), new Date()));
      setCompleted(getCompletedLessons());
      setCelebrateId(takeJustCompleted());
      setFocusKey((k) => k + 1);
    }, []),
  );

  const states = useMemo(() => lessonStates(units, completed), [units, completed]);

  const openReview = useCallback(() => {
    router.push({ pathname: '/lesson/[id]', params: { id: REVIEW_ID } });
  }, []);

  // "I know the basics" has to be proven: it opens a short test built from Day 0's recap.
  const testOutOfStarter = useCallback(() => {
    router.push({ pathname: '/lesson/[id]', params: { id: 'u0-check', mode: 'test' } });
  }, []);
  // Count numbered lessons only; recaps are part of their day, not lessons of their own.
  const lessons = units.flatMap((u) => u.lessons).filter((l) => l.kind === 'lesson');
  const total = lessons.length;
  const doneCount = lessons.filter((l) => completed.has(l.id)).length;

  // Bring the current lesson into view once per visit, without animating the jump.
  const scrollToCurrent = useCallback(
    (y: number) => {
      if (scrolledFor.current === focusKey) return;
      scrolledFor.current = focusKey;
      scrollRef.current?.scrollTo({ y: Math.max(0, y - SCROLL_HEADROOM), animated: false });
    },
    [focusKey],
  );

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: colors.canvas }]}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text variant="displayMd" style={styles.title}>
              {es}
            </Text>
            {streak > 0 ? (
              <View
                style={[styles.streak, { backgroundColor: colors.surface, borderColor: colors.hairline }]}
                accessible
                accessibilityLabel={`${streak} day streak`}>
                <Icon name={{ ios: 'flame.fill', android: 'local_fire_department' }} size={16} tone="sun" />
                <Text variant="label">{streak}</Text>
              </View>
            ) : null}
          </View>
          <Text variant="body" tone="inkMuted">
            {en}
            {total ? ` · ${doneCount} of ${total} lessons done` : ''}
          </Text>
        </View>

        <LearningPath
          units={units}
          states={states}
          celebrateId={celebrateId}
          onCurrentLayout={scrollToCurrent}
          onSkipStarter={testOutOfStarter}
          dueCount={dueCount}
          onReview={openReview}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: Layout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Layout.screenGutter,
    paddingTop: Space.lg,
    paddingBottom: Space.xxl,
    gap: Space.lg,
  },
  header: {
    gap: Space.xxs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
  },
  title: {
    flexShrink: 1,
  },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.xxs,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: Space.md,
    paddingVertical: Space.xxs,
  },
});
