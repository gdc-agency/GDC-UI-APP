import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

/**
 * @param {{
 *   progress: number;
 *   size?: number;
 *   strokeWidth?: number;
 *   trackColor?: string;
 *   progressColor?: string;
 *   labelColor?: string;
 * }} props
 */
export function CircularProgressRing({
  progress,
  size = 44,
  strokeWidth = 3.5,
  trackColor = '#e8edf4',
  progressColor = '#1266f1',
  labelColor = '#334155',
}) {
  const ratio = Math.min(1, Math.max(0, progress));
  const pct = Math.round(ratio * 100);
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - ratio);

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
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
      <Text style={[styles.label, { color: labelColor, fontSize: size < 40 ? 9 : 10 }]}>{pct}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  label: {
    position: 'absolute',
    fontWeight: '800',
    textAlign: 'center',
  },
});
