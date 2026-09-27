import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { VocabItem } from '@/brain';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Layout, Radius, Space } from '@/constants/theme';
import { translate } from '@/learning/phrase-bank';
import { useTheme } from '@/hooks/use-theme';
import { getVocab } from '@/lib/db';

export default function WordsScreen() {
  const colors = useTheme();
  const [vocab, setVocab] = useState<VocabItem[]>([]);

  // Re-read when the tab comes into view, so a fresh import shows up straight away.
  useFocusEffect(useCallback(() => setVocab(getVocab()), []));

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: colors.canvas }]}>
      <FlatList
        data={vocab}
        keyExtractor={(item) => item.text}
        contentContainerStyle={styles.list}
        contentInsetAdjustmentBehavior="automatic"
        ItemSeparatorComponent={() => <View style={{ height: Space.sm }} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text variant="displayMd">Your words</Text>
            {vocab.length ? (
              <Text variant="body" tone="inkMuted">
                {vocab.length} words and phrases from your chat, most used first.
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={<EmptyState />}
        renderItem={({ item }) => <WordRow item={item} />}
      />
    </SafeAreaView>
  );
}

function WordRow({ item }: { item: VocabItem }) {
  const colors = useTheme();
  const example = item.examples[0];
  const spanish = translate(item.text)?.es;

  return (
    <View
      style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.hairline }]}
      accessible
      accessibilityLabel={`${item.text}${spanish ? `, in Spanish ${spanish}` : ''}, used ${item.count} times`}>
      <View style={styles.rowTop}>
        <Text variant="headingMd" style={styles.rowText}>
          {item.text}
        </Text>
        <Text variant="caption" tone="inkMuted">
          ×{item.count}
        </Text>
      </View>
      <Text variant="bodyLg" tone={spanish ? 'inkSoft' : 'inkMuted'}>
        {spanish ?? 'Spanish coming soon'}
      </Text>
      {example ? (
        <Text variant="bodySm" tone="inkMuted" numberOfLines={2}>
          “{example}”
        </Text>
      ) : null}
    </View>
  );
}

function EmptyState() {
  const colors = useTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyBadge, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
        <Icon name={{ ios: 'text.bubble.fill', android: 'chat_bubble' }} size={30} tone="sky" />
      </View>
      <Text variant="headingMd" style={styles.center}>
        Your words will live here
      </Text>
      <Text variant="body" tone="inkMuted" style={styles.center}>
        Every word and phrase Cielo finds in your chat, sorted by how often you say it.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  list: {
    width: '100%',
    maxWidth: Layout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Layout.screenGutter,
    paddingTop: Space.lg,
    paddingBottom: Space.xl,
    flexGrow: 1,
  },
  header: {
    gap: Space.xxs,
    paddingBottom: Space.lg,
  },
  row: {
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Space.base,
    paddingVertical: Space.md,
    gap: Space.xxs,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Space.md,
  },
  rowText: {
    flex: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.md,
    paddingHorizontal: Space.base,
    paddingBottom: Space.xxl,
  },
  emptyBadge: {
    width: 72,
    height: 72,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Space.xs,
  },
  center: {
    textAlign: 'center',
  },
});
