import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { TsColors, timesheetStyles as ts } from './timesheet-styles';

const SEGMENTS = [
  { id: 'timesheet', label: 'Attendance', icon: 'view-grid-outline' },
  { id: 'clock-records', label: 'Clock Record', icon: 'clock-outline' },
  { id: 'manual-records', label: 'Manual Record', icon: 'clipboard-text-outline' },
];

const INACTIVE_COLOR = '#64748B';

function SegmentTab({ seg, active, onPress }) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={seg.label}
      android_ripple={{ color: 'rgba(37, 99, 235, 0.12)' }}
      style={({ pressed }) => [
        ts.segmentBtn,
        active && ts.segmentBtnActive,
        pressed && ts.segmentBtnPressed,
      ]}
      onPress={onPress}
    >
      <View style={ts.segmentBtnContent}>
        <MaterialCommunityIcons
          name={seg.icon}
          size={22}
          color={active ? TsColors.blue : INACTIVE_COLOR}
        />
        <Text style={[ts.segmentText, active && ts.segmentTextActive]} numberOfLines={2}>
          {seg.label}
        </Text>
      </View>
      {active ? <View style={ts.segmentIndicator} /> : <View style={ts.segmentIndicatorSpacer} />}
    </Pressable>
  );
}

/** Top title + segmented tabs (Attendance / Clock / Manual). */
export function TimesheetPageHeader({ slug, router }) {
  return (
    <View style={ts.headerBlock}>
      <Text style={ts.screenTitle}>Timesheet</Text>
      <View style={ts.segmentedWrap}>
        {SEGMENTS.map((seg) => (
          <SegmentTab
            key={seg.id}
            seg={seg}
            active={slug === seg.id}
            onPress={() => router.push(`/dashboard/(tabs)/route/${seg.id}`)}
          />
        ))}
      </View>
    </View>
  );
}
