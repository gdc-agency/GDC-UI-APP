import React from 'react';
import { Text, View } from 'react-native';

/**
 * @param {{
 *   progress: number;
 *   trackColor?: string;
 *   fillColor?: string;
 *   percentColor?: string;
 * }} props
 */
export function DocumentProgressBar({
  progress,
  trackColor = 'rgba(18,102,241,0.18)',
  fillColor = '#1266f1',
  percentColor = '#1266f1',
}) {
  const ratio = Math.min(1, Math.max(0, progress));
  const pct = Math.round(ratio * 100);

  return (
    <View className="mt-1.5 flex-row items-center gap-2">
      <View className="h-[5px] flex-1 overflow-hidden rounded-pill" style={{ backgroundColor: trackColor }}>
        <View
          className="h-full rounded-pill"
          style={{ backgroundColor: fillColor, width: `${pct}%` }}
        />
      </View>
      <Text className="min-w-[34px] text-right text-xs font-extrabold" style={{ color: percentColor }}>
        {pct}%
      </Text>
    </View>
  );
}
