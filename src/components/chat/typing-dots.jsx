import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';

export function TypingDots({ color = '#64748b', size = 5 }) {
  const dots = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;

  useEffect(() => {
    const animations = dots.map((value, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 90),
          Animated.timing(value, { toValue: 1, duration: 180, useNativeDriver: true }),
          Animated.timing(value, { toValue: 0, duration: 180, useNativeDriver: true }),
          Animated.delay(160),
        ]),
      ),
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, [dots]);

  return (
    <View className="flex-row items-center gap-1">
      {dots.map((value, index) => (
        <Animated.View
          key={index}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            opacity: value.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
            transform: [
              {
                translateY: value.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }),
              },
            ],
          }}
        />
      ))}
    </View>
  );
}
