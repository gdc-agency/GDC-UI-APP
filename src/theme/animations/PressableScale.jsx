import React, { useCallback } from 'react';
import { Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Subtle press feedback for buttons/cards — same behavior, smoother feel.
 */
export function PressableScale({
  children,
  scale = 0.98,
  style,
  onPressIn,
  onPressOut,
  ...rest
}) {
  const pressed = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressed.value }],
  }));

  const handlePressIn = useCallback(
    (e) => {
      pressed.value = withSpring(scale, { damping: 20, stiffness: 320 });
      onPressIn?.(e);
    },
    [onPressIn, pressed, scale],
  );

  const handlePressOut = useCallback(
    (e) => {
      pressed.value = withSpring(1, { damping: 18, stiffness: 280 });
      onPressOut?.(e);
    },
    [onPressOut, pressed],
  );

  return (
    <AnimatedPressable
      {...rest}
      style={[style, animatedStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}>
      {children}
    </AnimatedPressable>
  );
}
