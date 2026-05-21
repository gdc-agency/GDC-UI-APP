import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

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
    <View style={styles.row}>
      <View style={[styles.track, { backgroundColor: trackColor }]}>
        <View style={[styles.fill, { backgroundColor: fillColor, width: `${pct}%` }]} />
      </View>
      <Text style={[styles.pct, { color: percentColor }]}>{pct}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  track: {
    flex: 1,
    height: 5,
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
  pct: { fontSize: 12, fontWeight: '800', minWidth: 34, textAlign: 'right' },
});
