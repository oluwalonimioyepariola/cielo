import { StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeInDown, ReduceMotion } from 'react-native-reanimated';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Radius, Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Grade } from '@/learning/grading';

const ENTER = FadeInDown.duration(220)
  .easing(Easing.bezier(0.23, 1, 0.32, 1))
  .reduceMotion(ReduceMotion.System);

const PRAISE = ['¡Muy bien!', 'Nice!', '¡Perfecto!', "That's it", '¡Eso es!'];

type FeedbackProps = { grade: Grade; praiseIndex: number; bottomInset: number; onContinue: () => void };

/** The panel that rises after "Check": right or wrong, with the exact answer either way. */
export function FeedbackPanel({ grade, praiseIndex, bottomInset, onContinue }: FeedbackProps) {
  const colors = useTheme();
  const wrong = grade.verdict === 'wrong';

  return (
    <Animated.View
      entering={ENTER}
      accessibilityLiveRegion="assertive"
      style={[
        styles.panel,
        { backgroundColor: wrong ? colors.dangerSoft : colors.successSoft, paddingBottom: Space.base + bottomInset },
      ]}>
      <View style={styles.headline}>
        <Icon
          name={wrong ? { ios: 'xmark.circle.fill', android: 'cancel' } : { ios: 'checkmark.circle.fill', android: 'check_circle' }}
          size={26}
          tone={wrong ? 'danger' : 'success'}
        />
        <Text variant="headingMd" tone={wrong ? 'danger' : 'success'}>
          {wrong ? 'Not quite' : grade.hint ?? PRAISE[praiseIndex % PRAISE.length]}
        </Text>
      </View>
      {wrong || grade.hint ? (
        <Text variant="body" tone="ink">
          {wrong ? 'Correct answer: ' : "It's "}
          <Text variant="bodyStrong">{grade.expected}</Text>
        </Text>
      ) : null}
      <Button label={wrong ? 'Got it' : 'Continue'} onPress={onContinue} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Space.lg,
    gap: Space.md,
  },
  headline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },
});
