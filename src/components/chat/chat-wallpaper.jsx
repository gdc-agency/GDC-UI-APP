import React from 'react';
import { View } from 'react-native';

import { cn } from '@/theme/cn';

/**
 * Plain chat background (no decorative circles).
 * @param {{ children: import('react').ReactNode; style?: object; className?: string }} props
 */
export function ChatWallpaper({ children, style, className }) {
  return (
    <View className={cn('flex-1 bg-chat-wallpaper', className)} style={style}>
      {children}
    </View>
  );
}
