import React from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ScreenTransition } from '@/theme/animations';
import { useTheme } from '@/context/theme-context';

/**
 * Standard screen wrapper — same layout/colors, subtle enter animation.
 */
export function ScreenContainer({ children, className = '', style, animated = true, ...rest }) {
  const { colors } = useTheme();
  const Wrapper = animated ? Animated.View : View;

  return (
    <Wrapper
      {...rest}
      entering={animated ? ScreenTransition.entering : undefined}
      className={`flex-1 ${className}`}
      style={[{ backgroundColor: colors.pageBg }, style]}>
      {children}
    </Wrapper>
  );
}
