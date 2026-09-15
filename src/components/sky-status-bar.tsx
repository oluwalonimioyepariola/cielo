import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';

/**
 * Light status bar text while a sky screen is focused. Screens pushed on top are cream, so the
 * override has to go away when this screen loses focus, not only when it unmounts.
 */
export function SkyStatusBar() {
  const [focused, setFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  return focused ? <StatusBar style="light" /> : null;
}
