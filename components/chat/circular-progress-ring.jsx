import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

/**
 * WhatsApp-style circular progress with optional center icon.
 * @param {{
 *   progress: number;
 *   size?: number;
 *   strokeWidth?: number;
 *   trackColor?: string;
 *   progressColor?: string;
 *   labelColor?: string;
 *   centerIcon?: string;
 *   centerIconColor?: string;
 *   showLabel?: boolean;
 * }} props
 */
export function CircularProgressRing({
  progress,
  size = 44,
  strokeWidth = 3.5,
  trackColor = '#e8edf4',
  progressColor = '#1266f1',
  labelColor = '#334155',
  centerIcon,
  centerIconColor = '#54656f',
  showLabel = true,
}) {
  const anim = useRef(new Animated.Value(progress)).current;
  const display = useRef(progress);

  useEffect(() => {
    Animated.timing(anim, {
      toValue: Math.min(1, Math.max(0, progress)),
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    display.current = progress;
  }, [anim, progress]);

  const [displayRatio, setDisplayRatio] = React.useState(progress);
  useEffect(() => {
    const id = anim.addListener(({ value }) => setDisplayRatio(value));
    return () => anim.removeListener(id);
  }, [anim]);

  const ratio = Math.min(1, Math.max(0, displayRatio));
  const pct = Math.round(ratio * 100);
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - ratio);

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={progressColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          rotation={-90}
          origin={`${cx}, ${cy}`}
        />
      </Svg>
      {centerIcon ? (
        <View style={styles.centerIcon} pointerEvents="none">
          <MaterialCommunityIcons name={centerIcon} size={size * 0.38} color={centerIconColor} />
        </View>
      ) : null}
      {showLabel && !centerIcon ? (
        <Text style={[styles.label, { color: labelColor, fontSize: size < 40 ? 9 : 10 }]}>{pct}%</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  centerIcon: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    position: 'absolute',
    fontWeight: '800',
    textAlign: 'center',
  },
});
