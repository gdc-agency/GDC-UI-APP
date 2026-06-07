import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTheme } from '@/context/theme-context';

import { TimesheetUserAvatar } from './timesheet-user-avatar';
import { statusDotStyle } from '@/theme/module-styles/timesheet-styles';

export function dayNum(iso) {
  if (!iso) return '—';
  const p = String(iso).slice(8, 10);
  return p.startsWith('0') ? p.slice(1) : p;
}

export function dayShort(iso) {
  if (!iso) return '';
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

export function roleSubtitle(role, team) {
  const r = String(role || '').trim();
  const t = String(team || '').trim();
  if (r && t && t !== '—') return `${r} • ${t}`;
  return r || t || '—';
}

function StatusDot({ code, ts, tsColors }) {
  const s = statusDotStyle(code, tsColors);
  return (
    <View style={[ts.statusDot, { backgroundColor: s.bg }]}>
      <Text style={ts.statusDotText}>{s.label}</Text>
    </View>
  );
}

export function AttendanceLegend() {
  const { moduleStyles } = useTheme();
  const ts = moduleStyles.timesheet.styles;
  const TsColors = moduleStyles.timesheet.colors;

  const items = [
    { label: 'Present', color: TsColors.green },
    { label: 'Absent', color: TsColors.red },
    { label: 'Leave', color: TsColors.orange },
    { label: 'Late', color: TsColors.purple },
  ];
  return (
    <View style={ts.legendRow}>
      {items.map((item) => (
        <View key={item.label} style={ts.legendItem}>
          <View style={[ts.legendDot, { backgroundColor: item.color }]} />
          <Text style={ts.legendText}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Expandable attendance card — 7d timeline + legend, 30d summary counts (admin style).
 */
export function AttendanceMemberCard({ entry, timesheetDays, timesheetWindow, expanded, onToggle }) {
  const { moduleStyles } = useTheme();
  const ts = moduleStyles.timesheet.styles;
  const TsColors = moduleStyles.timesheet.colors;

  const showTimeline = timesheetWindow === '7d' && Array.isArray(entry.cells) && entry.cells.length > 0;

  return (
    <View style={ts.employeeCard}>
      <Pressable style={ts.employeeHead} onPress={onToggle}>
        <TimesheetUserAvatar name={entry.name} avatarUrl={entry.avatarUrl} />
        <View style={ts.employeeMeta}>
          <Text style={ts.employeeName} numberOfLines={1}>
            {entry.name}
          </Text>
          <Text style={ts.employeeRole} numberOfLines={1}>
            {roleSubtitle(entry.role, entry.team)}
          </Text>
        </View>
        <View style={ts.employeeRight}>
          <Text style={ts.employeeGdc} numberOfLines={1}>
            {entry.gdcId}
          </Text>
          <MaterialCommunityIcons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={TsColors.textMuted} />
        </View>
      </Pressable>

      {expanded ? (
        <View style={ts.expandedBody}>
          {showTimeline ? (
            <>
              <View style={ts.timelineRow}>
                {timesheetDays.map((day, idx) => (
                  <View key={`${entry.gdcId}-${day}`} style={ts.timelineCol}>
                    <Text style={ts.timelineDate}>{dayNum(day)}</Text>
                    <Text style={ts.timelineDay}>{dayShort(day)}</Text>
                    <StatusDot code={entry.cells[idx] || 'A'} ts={ts} tsColors={TsColors} />
                  </View>
                ))}
              </View>
              <AttendanceLegend />
            </>
          ) : timesheetWindow === 'today' ? (
            <View style={ts.summaryCountsRow}>
              <View style={ts.summaryCountItem}>
                <StatusDot code={entry.cells?.[0] || 'A'} ts={ts} tsColors={TsColors} />
                <Text style={ts.summaryCountLbl}>Today</Text>
              </View>
            </View>
          ) : timesheetWindow === '30d' ? (
            <View style={ts.summaryCountsRow}>
              <View style={ts.summaryCountItem}>
                <Text style={[ts.summaryCountVal, { color: TsColors.green }]}>{entry.counts?.present ?? 0}</Text>
                <Text style={ts.summaryCountLbl}>Present</Text>
              </View>
              <View style={ts.summaryCountItem}>
                <Text style={[ts.summaryCountVal, { color: TsColors.purple }]}>{entry.counts?.late ?? 0}</Text>
                <Text style={ts.summaryCountLbl}>Late</Text>
              </View>
              <View style={ts.summaryCountItem}>
                <Text style={[ts.summaryCountVal, { color: TsColors.red }]}>{entry.counts?.absent ?? 0}</Text>
                <Text style={ts.summaryCountLbl}>Absent</Text>
              </View>
              <View style={ts.summaryCountItem}>
                <Text style={[ts.summaryCountVal, { color: TsColors.orange }]}>{entry.leaveDays ?? 0}</Text>
                <Text style={ts.summaryCountLbl}>Leave</Text>
              </View>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/**
 * @param {Array} rows
 * @param {string[]} timesheetDays
 * @param {'today'|'7d'|'30d'} timesheetWindow
 */
export function AttendanceMemberCardList({ rows, timesheetDays, timesheetWindow }) {
  const [expandedId, setExpandedId] = useState(/** @type {string | null} */ (null));

  useEffect(() => {
    if (rows.length === 0) {
      setExpandedId(null);
      return;
    }
    setExpandedId(rows[0].gdcId);
  }, [rows, timesheetWindow]);

  if (!rows.length) {
    return null;
  }

  return (
    <>
      {rows.map((entry) => (
        <AttendanceMemberCard
          key={entry.gdcId}
          entry={entry}
          timesheetDays={timesheetDays}
          timesheetWindow={timesheetWindow}
          expanded={expandedId === entry.gdcId}
          onToggle={() => setExpandedId((prev) => (prev === entry.gdcId ? null : entry.gdcId))}
        />
      ))}
    </>
  );
}
