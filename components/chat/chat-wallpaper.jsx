import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ChatTheme } from '@/constants/chat-theme';

/**
 * Plain chat background (no decorative circles).
 * @param {{ children: import('react').ReactNode; style?: object }} props
 */
export function ChatWallpaper({ children, style }) {
  return <View style={[styles.root, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: ChatTheme.wallpaper,
  },
});
