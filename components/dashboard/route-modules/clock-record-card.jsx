import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import React from 'react';
import { Text, View } from 'react-native';

import { formatAttendanceDuration } from '@/utils/attendance-export';

import { TimesheetUserAvatar } from './timesheet-user-avatar';
import { TsColors, timesheetStyles as ts } from './timesheet-styles';

export function formatClockDisplayDate(iso) {
  if (!iso) return '—';
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function roleSubtitleForClock(role, team) {
  const r = String(role || '').trim();
  const t = String(team || '').trim();
  if (r && t && t !== '—') return `${r} • ${t}`;
  return r || t || '—';
}

function durationForEntry(entry) {
  return entry.durationLabel || formatAttendanceDuration(entry.hours, entry.hours);
}

function MetaTile({ icon, label, value, tone = 'blue' }) {
  const iconColor = tone === 'amber' ? '#F59E0B' : '#3B82F6';
  return (
    <View style={ts.logMetaTile}>
      <MaterialCommunityIcons name={icon} size={18} color={iconColor} />
      <Text style={ts.logMetaTileLbl}>{label}</Text>
      <Text style={ts.logMetaTileVal} numberOfLines={2}>
        {value || '—'}
      </Text>
    </View>
  );
}

function DurationChip({ duration, variant = 'clock' }) {
  const isManual = variant === 'manual';
  return (
    <View style={[ts.logDurationChip, isManual && ts.logDurationChipAmber]}>
      <MaterialCommunityIcons
        name="clock-outline"
        size={15}
        color={isManual ? '#EA580C' : TsColors.blue}
      />
      <Text style={[ts.logDurationChipText, isManual && ts.logDurationChipTextAmber]}>{duration}</Text>
    </View>
  );
}

function TimePanel({ label, time, isIn }) {
  return (
    <View style={ts.logTimePanel}>
      <MaterialCommunityIcons name={isIn ? 'login' : 'logout'} size={22} color={TsColors.blue} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={ts.logTimePanelLbl}>{label}</Text>
        <Text style={ts.logTimePanelVal} numberOfLines={1}>
          {time || '—'}
        </Text>
      </View>
    </View>
  );
}

/** Reference-style clock history card (TL my attendance, Admin/HR clock records). */
export function ClockRecordCard({ entry }) {
  const name = entry.user?.name || entry.userName || '—';
  const dept = entry.user?.team || entry.department || entry.team || '—';
  const role = entry.user?.role || entry.userRole || '—';
  const avatarUrl = entry.user?.avatarUrl || entry.avatarUrl;
  const duration = durationForEntry(entry);

  return (
    <View style={ts.logRecordCard}>
      <View style={ts.logRecordTop}>
        <TimesheetUserAvatar name={name} avatarUrl={avatarUrl} size={48} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={ts.logRecordName} numberOfLines={1}>
            {name}
          </Text>
          <Text style={ts.logRecordSub} numberOfLines={1}>
            {roleSubtitleForClock(role, dept)}
          </Text>
        </View>
        <DurationChip duration={duration} variant="clock" />
      </View>

      <View style={ts.logMetaBar}>
        <MetaTile icon="card-account-details-outline" label="GDC ID" value={entry.gdcId} />
        <MetaTile icon="calendar-month-outline" label="Date" value={formatClockDisplayDate(entry.date)} />
      </View>

      <View style={ts.logInOutRow}>
        <TimePanel label="CHECK IN" time={entry.checkIn} isIn />
        <MaterialCommunityIcons name="arrow-right" size={18} color="#94A3B8" />
        <TimePanel label="CHECK OUT" time={entry.checkOut} isIn={false} />
      </View>
    </View>
  );
}
