import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { BRAND_NAVY, BRAND_ORANGE } from '@/data/constants/brand';

const SIZE = 54;
const STROKE = 4;
const RADIUS = (SIZE - STROKE) / 2;

/** Indeterminate orange ring + label — first-install splash. */
export function SplashLoadingRing({ label = 'Loading...' }) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 1000, easing: Easing.linear }),
      -1,
      false,
    );
  }, [rotation]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View className="mt-9 items-center">
      <Animated.View style={spinStyle}>
        <Svg width={SIZE} height={SIZE}>
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke="#CBD5E1"
            strokeWidth={STROKE}
            fill="none"
          />
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke={BRAND_ORANGE}
            strokeWidth={STROKE}
            fill="none"
            strokeDasharray={`${RADIUS * 1.6} ${RADIUS * 4.8}`}
            strokeLinecap="round"
          />
        </Svg>
      </Animated.View>
      <Text className="mt-3.5 text-[15px] font-medium" style={{ color: BRAND_NAVY }}>
        {label}
      </Text>
    </View>
  );
}
