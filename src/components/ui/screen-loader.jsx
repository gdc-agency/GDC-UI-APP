import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useTheme } from '@/context/theme-context';

/** Lightweight suspense fallback — matches existing theme, no UI change. */
export function ScreenLoader() {
  const { colors } = useTheme();
  return (
    <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.pageBg }}>
      <ActivityIndicator size="large" color={colors.primaryMid} />
    </View>
  );
}
