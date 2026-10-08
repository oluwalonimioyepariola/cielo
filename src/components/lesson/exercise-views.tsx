import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { FontFamily, Radius, Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { acceptedSpanish, type Exercise, type Teachable } from '@/learning/exercises';
import type { Grade } from '@/learning/grading';
import { sayAloud } from '@/lib/speak';

import { EASE_OUT, Instruction, OptionCard, SpeakButton, type OptionState } from './parts';

// --- Meet: the first look at a phrase -------------------------------------------------------

export function MeetView({ item }: { item: Teachable }) {
  const colors = useTheme();
  return (
    <View style={styles.stack}>
      <Instruction>New phrase</Instruction>
      <Text variant="bodyLg" tone="inkMuted">
        You say “{item.en}”
      </Text>
      <View style={styles.spanishRow}>
        <Text variant="displayMd" style={styles.flex}>
          {item.t.es}
        </Text>
        <SpeakButton text={item.t.es} />
      </View>

      {item.t.alts.length ? (
        <View style={styles.alts}>
          {item.t.alts.map((alt) => (
            <Text key={alt.es} variant="body" tone="inkSoft">
              {alt.es} <Text variant="bodySm" tone="inkMuted">· {alt.when}</Text>
            </Text>
          ))}
        </View>
      ) : null}

      {item.t.note ? (
        <View style={[styles.note, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
          <Text variant="bodySm" tone="inkSoft">
            {item.t.note}
          </Text>
        </View>
      ) : null}

      {item.example ? (
        // The user's own message, as a sent bubble: this is why the phrase is here.
        <View style={styles.exampleWrap}>
          <Text variant="caption" tone="inkMuted">
            YOU WROTE
          </Text>
          <View style={[styles.exampleBubble, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
            <Text variant="body">{item.example}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

// --- Pick: three choices --------------------------------------------------------------------

type PickProps = {
  exercise: Extract<Exercise, { kind: 'pick-spanish' | 'pick-english' }>;
  selected: string | null;
  grade: Grade | null;
  onSelect: (option: string) => void;
};

export function PickView({ exercise, selected, grade, onSelect }: PickProps) {
  const toSpanish = exercise.kind === 'pick-spanish';
  const correct = toSpanish ? acceptedSpanish(exercise.item) : [exercise.item.en];

  const stateOf = (option: string): OptionState => {
    if (!grade) return option === selected ? 'selected' : 'idle';
    if (correct.includes(option)) return 'correct';
    return option === selected ? 'wrong' : 'dimmed';
  };

  return (
    <View style={styles.stack}>
      <Instruction>{toSpanish ? 'Pick the Spanish' : 'What does this mean?'}</Instruction>
      {toSpanish ? (
        <Text variant="displayMd">“{exercise.item.en}”</Text>
      ) : (
        <View style={styles.spanishRow}>
          <Text variant="displayMd" style={styles.flex}>
            {exercise.item.t.es}
          </Text>
          <SpeakButton text={exercise.item.t.es} />
        </View>
      )}
      <View style={styles.options}>
        {exercise.options.map((option) => (
          <OptionCard
            key={option}
            state={stateOf(option)}
            disabled={!!grade}
            onPress={() => {
              // Hear each Spanish answer as you consider it.
              if (toSpanish) sayAloud(option);
              onSelect(option);
            }}
            accessibilityLabel={option}>
            <Text variant="bodyLg">{option}</Text>
          </OptionCard>
        ))}
      </View>
    </View>
  );
}

// --- Build: put the Spanish word tiles in order -----------------------------------------------

type BuildProps = {
  exercise: Extract<Exercise, { kind: 'build' }>;
  /** Indexes into `exercise.tiles`, in the order chosen. */
  chosen: number[];
  grade: Grade | null;
  onChange: (chosen: number[]) => void;
};

export function BuildView({ exercise, chosen, grade, onChange }: BuildProps) {
  const colors = useTheme();
  const answerBorder = grade ? (grade.verdict === 'wrong' ? colors.danger : colors.success) : colors.hairline;

  return (
    <View style={styles.stack}>
      <Instruction>Build it in Spanish</Instruction>
      <Text variant="displayMd">“{exercise.item.en}”</Text>

      <View style={[styles.answerLine, { borderColor: answerBorder }]} accessibilityLabel="Your answer">
        {chosen.length ? (
          chosen.map((tileIndex, position) => (
            <Tile
              key={`${tileIndex}-${position}`}
              word={exercise.tiles[tileIndex]}
              disabled={!!grade}
              onPress={() => onChange(chosen.filter((_, i) => i !== position))}
            />
          ))
        ) : (
          <Text variant="body" tone="inkMuted">
            Tap the words below
          </Text>
        )}
      </View>

      <View style={styles.tileBank}>
        {exercise.tiles.map((word, i) => {
          const used = chosen.includes(i);
          return (
            <Tile
              key={`${word}-${i}`}
              word={word}
              used={used}
              disabled={used || !!grade}
              onPress={() => {
                sayAloud(word);
                onChange([...chosen, i]);
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

function Tile({ word, used, disabled, onPress }: { word: string; used?: boolean; disabled?: boolean; onPress: () => void }) {
  const colors = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={word}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: used ? colors.surfaceMuted : pressed ? colors.surfaceMuted : colors.surface,
          borderColor: used ? colors.surfaceMuted : colors.hairline,
        },
      ]}>
      {/* A used tile keeps its space, so the bank never reflows under the finger. */}
      <Text variant="bodyStrong" style={used && styles.hidden}>
        {word}
      </Text>
    </Pressable>
  );
}

// --- Type: from memory ------------------------------------------------------------------------

type TypeProps = {
  exercise: Extract<Exercise, { kind: 'type' }>;
  value: string;
  grade: Grade | null;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export function TypeView({ exercise, value, grade, onChange, onSubmit }: TypeProps) {
  const colors = useTheme();
  const input = useRef<TextInput>(null);
  const border = grade ? (grade.verdict === 'wrong' ? colors.danger : colors.success) : colors.hairline;

  useEffect(() => {
    // Give the screen transition a moment before the keyboard rises.
    const timer = setTimeout(() => input.current?.focus(), 350);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.stack}>
      <Instruction>Type it in Spanish</Instruction>
      <Text variant="displayMd">“{exercise.item.en}”</Text>
      <TextInput
        ref={input}
        value={value}
        onChangeText={onChange}
        onSubmitEditing={onSubmit}
        editable={!grade}
        placeholder="Escribe aquí…"
        placeholderTextColor={colors.inkMuted}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        returnKeyType="done"
        accessibilityLabel={`Type "${exercise.item.en}" in Spanish`}
        style={[
          styles.input,
          { backgroundColor: colors.surface, borderColor: border, color: colors.ink },
          Platform.OS === 'android' && styles.inputAndroid,
        ]}
      />
    </View>
  );
}

// --- Match: tap an English phrase, then its Spanish -------------------------------------------

type MatchProps = {
  exercise: Extract<Exercise, { kind: 'match' }>;
  onComplete: () => void;
  onMistake: () => void;
};

export function MatchView({ exercise, onComplete, onMistake }: MatchProps) {
  const [pickedEnglish, setPickedEnglish] = useState<number | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [miss, setMiss] = useState<{ en: number; es: number } | null>(null);

  useEffect(() => {
    if (!miss) return;
    const timer = setTimeout(() => setMiss(null), 600);
    return () => clearTimeout(timer);
  }, [miss]);

  const tapSpanish = (pair: number) => {
    if (pickedEnglish === null) return;
    sayAloud(exercise.pairs[pair].t.es);
    if (pair === pickedEnglish) {
      const next = new Set(matched).add(pair);
      setMatched(next);
      if (next.size === exercise.pairs.length) onComplete();
    } else {
      setMiss({ en: pickedEnglish, es: pair });
      onMistake();
    }
    setPickedEnglish(null);
  };

  const stateOf = (pair: number, side: 'en' | 'es'): OptionState => {
    if (matched.has(pair)) return 'dimmed';
    if (miss && miss[side] === pair) return 'wrong';
    if (side === 'en' && pickedEnglish === pair) return 'selected';
    return 'idle';
  };

  return (
    <View style={styles.stack}>
      <Instruction>Match the pairs</Instruction>
      <View style={styles.matchColumns}>
        <View style={styles.matchColumn}>
          {exercise.pairs.map((item, i) => (
            <OptionCard
              key={item.en}
              state={stateOf(i, 'en')}
              disabled={matched.has(i)}
              onPress={() => setPickedEnglish(i)}
              accessibilityLabel={item.en}>
              <Text variant="bodyStrong">{item.en}</Text>
            </OptionCard>
          ))}
        </View>
        <View style={styles.matchColumn}>
          {exercise.spanishOrder.map((i) => (
            <OptionCard
              key={exercise.pairs[i].t.es}
              state={stateOf(i, 'es')}
              disabled={matched.has(i) || pickedEnglish === null}
              onPress={() => tapSpanish(i)}
              accessibilityLabel={exercise.pairs[i].t.es}>
              <Text variant="bodyStrong">{exercise.pairs[i].t.es}</Text>
            </OptionCard>
          ))}
        </View>
      </View>
      {matched.size === exercise.pairs.length ? (
        <Animated.View
          style={{
            animationName: { from: { opacity: 0 }, to: { opacity: 1 } },
            animationDuration: 200,
            animationTimingFunction: EASE_OUT,
          }}>
          <Text variant="bodyStrong" tone="success">
            All matched
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: Space.base,
  },
  flex: {
    flex: 1,
  },
  spanishRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
  },
  alts: {
    gap: Space.xxs,
  },
  note: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Space.base,
  },
  exampleWrap: {
    alignItems: 'flex-end',
    gap: Space.xs,
    paddingTop: Space.sm,
  },
  exampleBubble: {
    maxWidth: '85%',
    borderRadius: Radius.lg,
    borderBottomRightRadius: Space.xs,
    borderWidth: 1,
    paddingHorizontal: Space.base,
    paddingVertical: Space.md,
  },
  options: {
    gap: Space.md,
    paddingTop: Space.sm,
  },
  answerLine: {
    minHeight: 64,
    borderBottomWidth: 2,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Space.sm,
    paddingVertical: Space.sm,
  },
  tileBank: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Space.sm,
    paddingTop: Space.base,
  },
  tile: {
    minHeight: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Space.base,
    justifyContent: 'center',
  },
  hidden: {
    opacity: 0,
  },
  input: {
    minHeight: 58,
    borderRadius: Radius.sm,
    borderWidth: 2,
    paddingHorizontal: Space.base,
    fontFamily: FontFamily.medium,
    fontSize: 20,
  },
  inputAndroid: {
    paddingVertical: Space.sm,
  },
  matchColumns: {
    flexDirection: 'row',
    gap: Space.md,
  },
  matchColumn: {
    flex: 1,
    gap: Space.md,
  },
});
