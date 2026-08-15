import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { Layout, Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ScreenProps = {
  children: ReactNode;
  /** Pinned to the bottom, outside the scroll — for the screen's main action. */
  footer?: ReactNode;
  edges?: Edge[];
  contentStyle?: ViewStyle;
};

export function Screen({ children, footer, edges = ['top', 'bottom'], contentStyle }: ScreenProps) {
  const colors = useTheme();

  return (
    <SafeAreaView edges={edges} style={[styles.root, { backgroundColor: colors.canvas }]}>
      <ScrollView
        contentContainerStyle={[styles.content, contentStyle]}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: Layout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Layout.screenGutter,
    paddingTop: Space.lg,
    paddingBottom: Space.xl,
    gap: Space.lg,
  },
  footer: {
    width: '100%',
    maxWidth: Layout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Layout.screenGutter,
    paddingTop: Space.md,
    paddingBottom: Space.base,
    gap: Space.sm,
  },
});
