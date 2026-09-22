import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { Platform } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

// The platform's real tab bar. Tabs are peers, so switching between them never animates.
export default function TabsLayout() {
  const colors = useTheme();

  return (
    <NativeTabs
      tintColor={colors.primary}
      backgroundColor={Platform.OS === 'android' ? colors.canvas : undefined}
      indicatorColor={colors.surfaceMuted}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Learn</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'sun.max', selected: 'sun.max.fill' }} md="wb_sunny" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="words">
        <NativeTabs.Trigger.Label>Words</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'text.bubble', selected: 'text.bubble.fill' }}
          md="chat_bubble"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>You</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }}
          md="account_circle"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
