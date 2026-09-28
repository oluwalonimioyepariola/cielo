import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeInRight, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BuildView, MatchView, MeetView, PickView, TypeView } from '@/components/lesson/exercise-views';
import { LessonComplete, TestResult } from '@/components/lesson/complete';
import { FeedbackPanel } from '@/components/lesson/feedback';
import { ProgressBar } from '@/components/lesson/parts';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Layout, Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { findLesson } from '@/learning/curriculum';
import {
  acceptedSpanish,
  buildExercises,
  isGraded,
  toTeachable,
  type Exercise,
  type Teachable,
} from '@/learning/exercises';
import { gradeTiles, gradeTyped, type Grade, type Verdict } from '@/learning/grading';
import type { Lesson, Unit } from '@/learning/curriculum';
import { dayKey } from '@/learning/review';
import { backUpProgress } from '@/lib/backup';
import { setJustCompleted } from '@/lib/celebrate';
import { getDueTexts, getVocab, markLessonComplete, markLessonsComplete } from '@/lib/db';
import { recordPractice, REVIEW_ID } from '@/lib/practice';
import { loadCurriculum } from '@/lib/path';

// Moving forward through the lesson: each exercise slides in a little from the right.
const NEXT = FadeInRight.duration(220)
  .easing(Easing.bezier(0.23, 1, 0.32, 1))
  .reduceMotion(ReduceMotion.System);

// "Test out" of Day 0: a short run of graded questions from its recap, no second chances.
const TEST_LENGTH = 12;
const TEST_PASS_SHARE = 0.8;

const REVIEW_SIZE = 10;

/** Today's review: the phrases due now (most overdue first), as one checkpoint-style lesson. */
function reviewLesson(units: Unit[]): { unit: Unit; lesson: Lesson } | null {
  const byText = new Map(units.flatMap((u) => u.items).map((item) => [item.text, item]));
  const items = getDueTexts(new Date())
    .map((text) => byText.get(text))
    .filter((item) => item !== undefined)
    .slice(0, REVIEW_SIZE);
  if (!items.length) return null;
  const lesson: Lesson = { id: REVIEW_ID, kind: 'checkpoint', items };
  return { unit: { index: -1, label: 'Review', lessons: [lesson], items }, lesson };
}

type Answer = { selected: string | null; tiles: number[]; text: string };
const EMPTY: Answer = { selected: null, tiles: [], text: '' };

export default function LessonScreen() {
  const colors = useTheme();
  // The bottom inset is applied inside the footer, so the feedback panel's color runs to the screen edge.
  // Insets come from the hook: SafeAreaView reports no top inset inside this full-screen modal on iOS,
  // which put the close button under the status bar.
  const { top, bottom } = useSafeAreaInsets();
  const { id, mode } = useLocalSearchParams<{ id: string; mode?: string }>();
  const isTest = mode === 'test';

  const isReview = id === REVIEW_ID;

  const setup = useMemo(() => {
    const vocab = getVocab();
    const found = isReview ? reviewLesson(loadCurriculum()) : findLesson(loadCurriculum(), id);
    if (!found) return null;
    const items = found.lesson.items.map(toTeachable).filter((t): t is Teachable => t !== null);
    // A review reshuffles each day; lessons stay the same every time they're opened.
    const all = buildExercises(found.lesson, vocab, isReview ? `review-${dayKey(new Date())}` : found.lesson.id);
    const lessonNumber =
      loadCurriculum()
        .flatMap((u) => u.lessons)
        .filter((l) => l.kind === 'lesson')
        .findIndex((l) => l.id === found.lesson.id) + 1;
    return {
      ...found,
      items,
      lessonNumber,
      exercises: isTest ? all.filter(isGraded).slice(0, TEST_LENGTH) : all,
    };
  }, [id, isTest, isReview]);

  const [queue, setQueue] = useState<Exercise[]>(setup?.exercises ?? []);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<Answer>(EMPTY);
  const [grade, setGrade] = useState<Grade | null>(null);
  const [matchDone, setMatchDone] = useState(false);
  // First attempts only: how many graded exercises there were, and how many were right first time.
  const [stats, setStats] = useState({ graded: 0, firstTry: 0 });
  const [retries, setRetries] = useState<Set<number>>(new Set());
  // Every answer per phrase, for the memory scores: "did you eat" → ['wrong', 'correct'].
  const outcomes = useRef(new Map<string, Verdict[]>());

  // The moment the last exercise is done, update memory scores and the streak — once.
  const finished = queue.length > 0 && index >= queue.length;
  const recorded = useRef(false);
  useEffect(() => {
    if (!finished || recorded.current || !setup) return;
    recorded.current = true;
    recordPractice(
      setup.items.map((item) => item.en),
      outcomes.current,
    );
  }, [finished, setup]);

  // Leaving mid-lesson throws its progress away, so ask first. This catches every way out:
  // the close button, Android's back button and the back gesture.
  const navigation = useNavigation();
  const leaving = useRef(false);
  const inProgress = index > 0 && index < queue.length;
  useEffect(() => {
    if (!inProgress) return;
    return navigation.addListener('beforeRemove', (event) => {
      if (leaving.current) return;
      event.preventDefault();
      Alert.alert(
        'Quit this lesson?',
        "Your progress in this lesson won't be saved. You'll start it again from the beginning next time.",
        [
          { text: 'Keep learning', style: 'cancel' },
          {
            text: 'Quit',
            style: 'destructive',
            onPress: () => {
              leaving.current = true;
              navigation.dispatch(event.data.action);
            },
          },
        ],
      );
    });
  }, [inProgress, navigation]);

  if (!setup) {
    return isReview ? (
      <Fallback
        title="Nothing to review"
        body="Every phrase is fresh in your memory. Reviews show up on your map when it's time."
        action="Back to your chat"
        onAction={() => router.back()}
      />
    ) : (
      <Fallback
        title="This lesson has moved"
        body="Your path changed since you last opened it."
        action="Back to your chat"
        onAction={() => router.back()}
      />
    );
  }

  const { lesson } = setup;
  const isCheckpoint = lesson.kind === 'checkpoint';

  const finish = () => {
    if (isReview) {
      router.back();
      return;
    }
    markLessonComplete(lesson.id);
    setJustCompleted(lesson.id);
    backUpProgress();
    router.back();
  };

  // Passing the test counts the whole day as learned; not passing sends the learner to its first lesson.
  const passTest = () => {
    markLessonsComplete(setup.unit.lessons.map((l) => l.id));
    backUpProgress();
    router.back();
  };
  const startFromLessonOne = () => {
    router.replace({
      pathname: '/lesson/[id]',
      params: { id: setup.unit.lessons[0].id },
    });
  };

  if (!queue.length) {
    return (
      <Fallback
        title="Spanish on its way"
        body="These phrases don't have their Spanish yet. You can skip this lesson for now."
        action="Skip for now"
        onAction={finish}
      />
    );
  }

  const done = index >= queue.length;
  const exercise = queue[Math.min(index, queue.length - 1)];

  const check = () => {
    let result: Grade;
    if (exercise.kind === 'pick-spanish') {
      const ok = acceptedSpanish(exercise.item).includes(answer.selected ?? '');
      result = {
        verdict: ok ? 'correct' : 'wrong',
        expected: exercise.item.t.es,
      };
    } else if (exercise.kind === 'pick-english') {
      const ok = answer.selected === exercise.item.en;
      result = {
        verdict: ok ? 'correct' : 'wrong',
        expected: exercise.item.en,
      };
    } else if (exercise.kind === 'build') {
      result = gradeTiles(
        answer.tiles.map((i) => exercise.tiles[i]),
        acceptedSpanish(exercise.item),
      );
    } else if (exercise.kind === 'type') {
      result = gradeTyped(answer.text, acceptedSpanish(exercise.item));
    } else {
      return;
    }

    // Haptic in the same frame as the visual result, never on its own.
    Haptics.notificationAsync(
      result.verdict === 'wrong' ? Haptics.NotificationFeedbackType.Error : Haptics.NotificationFeedbackType.Success,
    );
    if (!retries.has(index)) {
      setStats((s) => ({
        graded: s.graded + 1,
        firstTry: s.firstTry + (result.verdict === 'wrong' ? 0 : 1),
      }));
    }
    outcomes.current.set(exercise.item.en, [...(outcomes.current.get(exercise.item.en) ?? []), result.verdict]);
    setGrade(result);
  };

  const next = () => {
    // In a lesson a missed exercise comes back; in a test it doesn't.
    if (grade?.verdict === 'wrong' && !isTest) {
      // A missed exercise comes back at the end, so the lesson ends only when everything is right.
      setRetries((r) => new Set(r).add(queue.length));
      setQueue((q) => [...q, exercise]);
    }
    setGrade(null);
    setAnswer(EMPTY);
    setMatchDone(false);
    setIndex((i) => i + 1);
  };

  const canCheck =
    exercise.kind === 'pick-spanish' || exercise.kind === 'pick-english'
      ? answer.selected !== null
      : exercise.kind === 'build'
        ? answer.tiles.length > 0
        : exercise.kind === 'type'
          ? answer.text.trim().length > 0
          : false;

  if (done && isTest) {
    return (
      <TestResult
        items={setup.items.slice(0, 4)}
        correct={stats.firstTry}
        total={stats.graded}
        passed={stats.firstTry >= Math.ceil(stats.graded * TEST_PASS_SHARE)}
        onPass={passTest}
        onStartLessons={startFromLessonOne}
        onBack={() => router.back()}
      />
    );
  }
  if (done) {
    return (
      <LessonComplete
        items={setup.items}
        title={
          isReview
            ? 'Review done'
            : isCheckpoint
              ? `${setup.unit.label}, learned`
              : `Lección ${setup.lessonNumber}, learned`
        }
        firstTry={stats.firstTry}
        graded={stats.graded}
        isCheckpoint={isCheckpoint}
        onDone={finish}
      />
    );
  }

  const footer = grade ? (
    <FeedbackPanel grade={grade} praiseIndex={index} bottomInset={bottom} onContinue={next} />
  ) : (
    <View style={[styles.footer, { paddingBottom: Space.base + bottom }]}>
      {exercise.kind === 'meet' ? (
        <Button label="Got it" onPress={next} />
      ) : exercise.kind === 'match' ? (
        <Button label="Continue" disabled={!matchDone} onPress={next} />
      ) : (
        <Button label="Check" disabled={!canCheck} onPress={check} />
      )}
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.canvas, paddingTop: top }]}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close lesson"
            hitSlop={12}
            onPress={() => router.back()}>
            <Icon name={{ ios: 'xmark', android: 'close' }} size={22} tone="inkMuted" />
          </Pressable>
          <ProgressBar progress={index / queue.length} />
        </View>

        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Animated.View key={index} entering={NEXT}>
            {exercise.kind === 'meet' ? <MeetView item={exercise.item} /> : null}
            {exercise.kind === 'pick-spanish' || exercise.kind === 'pick-english' ? (
              <PickView
                exercise={exercise}
                selected={answer.selected}
                grade={grade}
                onSelect={(selected) => setAnswer({ ...answer, selected })}
              />
            ) : null}
            {exercise.kind === 'build' ? (
              <BuildView
                exercise={exercise}
                chosen={answer.tiles}
                grade={grade}
                onChange={(tiles) => setAnswer({ ...answer, tiles })}
              />
            ) : null}
            {exercise.kind === 'type' ? (
              <TypeView
                exercise={exercise}
                value={answer.text}
                grade={grade}
                onChange={(text) => setAnswer({ ...answer, text })}
                onSubmit={() => {
                  if (canCheck && !grade) check();
                }}
              />
            ) : null}
            {exercise.kind === 'match' ? (
              <MatchView
                exercise={exercise}
                onComplete={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  setMatchDone(true);
                }}
                onMistake={() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)}
              />
            ) : null}
          </Animated.View>
        </ScrollView>

        {footer}
      </KeyboardAvoidingView>
    </View>
  );
}

function Fallback({
  title,
  body,
  action,
  onAction,
}: {
  title: string;
  body: string;
  action: string;
  onAction: () => void;
}) {
  const colors = useTheme();
  const { top, bottom } = useSafeAreaInsets();
  return (
    <View style={[styles.root, { backgroundColor: colors.canvas, paddingTop: top, paddingBottom: bottom }]}>
      <View style={[styles.body, styles.fallback]}>
        <Text variant="displayMd">{title}</Text>
        <Text variant="bodyLg" tone="inkSoft">
          {body}
        </Text>
      </View>
      <View style={styles.footer}>
        <Button label={action} onPress={onAction} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.base,
    paddingHorizontal: Layout.screenGutter,
    paddingTop: Space.sm,
    paddingBottom: Space.base,
  },
  body: {
    flexGrow: 1,
    width: '100%',
    maxWidth: Layout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Layout.screenGutter,
    paddingTop: Space.base,
    paddingBottom: Space.xl,
  },
  fallback: {
    flex: 1,
    justifyContent: 'center',
    gap: Space.md,
  },
  footer: {
    width: '100%',
    maxWidth: Layout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Layout.screenGutter,
    paddingTop: Space.md,
    paddingBottom: Space.base,
  },
});
