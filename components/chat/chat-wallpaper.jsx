import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/context/theme-context';

/**
 * Plain chat background (no decorative circles).
 * @param {{ children: import('react').ReactNode; style?: object }} props
 */
export function ChatWallpaper({ children, style }) {
  const { chatTheme } = useTheme();

  return <View style={[styles.root, { backgroundColor: chatTheme.wallpaper }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
