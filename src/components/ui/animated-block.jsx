import React from 'react';
import Animated from 'react-native-reanimated';

import { enterDown, staggerDelay } from '@/theme/animations/motion';

/**
 * Fade-in-down block for screen sections and list rows.
 * Pass `delay` directly, or `index` + `baseDelay` for staggered lists.
 */
export function AnimatedBlock({
  delay,
  index,
  baseDelay = 0,
  entering,
  style,
  className,
  children,
}) {
  const resolvedDelay = delay ?? (index != null ? staggerDelay(baseDelay, index) : baseDelay);
  return (
    <Animated.View
      entering={entering ?? enterDown(resolvedDelay)}
      style={style}
      className={className}>
      {children}
    </Animated.View>
  );
}

export function AnimatedTextBlock({ delay, index, baseDelay = 0, style, className, children }) {
  const resolvedDelay = delay ?? (index != null ? staggerDelay(baseDelay, index) : baseDelay);
  return (
    <Animated.Text entering={enterDown(resolvedDelay)} style={style} className={className}>
      {children}
    </Animated.Text>
  );
}
