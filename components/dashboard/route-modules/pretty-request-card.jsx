import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import React, { useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { formatRequestDisplayDate } from '@/utils/attendance-ui-map';

import { TimesheetUserAvatar } from './timesheet-user-avatar';
import { RqColors, requestStatusStyle } from './request-styles';

function roleSubtitle(role, team) {
  const r = String(role || '').trim();
  const t = String(team || '').trim();
  if (r && t && t !== '—') return `${r} • ${t}`;
  return r || t || '—';
}

function statusPillTone(status) {
  const st = requestStatusStyle(status);
  const icon = st.icon;
  const bg = st.bg;
  const color = st.color;
  return { icon, bg, color };
}

function toneColors(status) {
  const s = String(status || '');
  if (s === 'Approved') return { bg: '#ECFDF5', border: '#BBF7D0', iconBg: '#DCFCE7', icon: '#16A34A' };
  if (s === 'Rejected') return { bg: '#FEF2F2', border: '#FECACA', iconBg: '#FEE2E2', icon: '#DC2626' };
  return { bg: '#FFFBEB', border: '#FDE68A', iconBg: '#FEF3C7', icon: '#F59E0B' };
}

function DetailRow({ tone, iconName, label, value, valueNumberOfLines = 2 }) {
  return (
    <View style={p.row}>
      <View style={[p.rowIconWrap, { backgroundColor: tone.iconBg }]}>
        <MaterialCommunityIcons name={iconName} size={18} color={tone.icon} />
      </View>
      <View style={p.rowTextCol}>
        <Text style={p.rowLabel}>{label}</Text>
        <Text style={p.rowValue} numberOfLines={valueNumberOfLines}>
          {value || '—'}
        </Text>
      </View>
    </View>
  );
}

function ManualTwoColRow({ tone, left, right }) {
  return (
    <View style={p.twoColRow}>
      <View style={p.twoColCell}>
        <View style={[p.rowIconWrap, { backgroundColor: tone.iconBg }]}>
          <MaterialCommunityIcons name={left.icon} size={18} color={tone.icon} />
        </View>
        <View style={p.rowTextCol}>
          <Text style={p.rowLabel}>{left.label}</Text>
          <Text style={p.rowValue} numberOfLines={1}>
            {left.value || '—'}
          </Text>
        </View>
      </View>

      <View style={p.twoColDivider} />

      <View style={p.twoColCell}>
        <View style={[p.rowIconWrap, { backgroundColor: tone.iconBg }]}>
          <MaterialCommunityIcons name={right.icon} size={18} color={tone.icon} />
        </View>
        <View style={p.rowTextCol}>
          <Text style={p.rowLabel}>{right.label}</Text>
          <Text style={p.rowValue} numberOfLines={1}>
            {right.value || '—'}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function PrettyRequestCard({
  req,
  isManual,
  onApprove,
  onReject,
  onOpenReject,
  showActions = false,
}) {
  const { width } = useWindowDimensions();
  const isSmall = width < 380;
  const st = useMemo(() => statusPillTone(req?.status), [req?.status]);
  const tone = useMemo(() => toneColors(req?.status), [req?.status]);

  const subTitle = roleSubtitle(req?.role, req?.team);
  const dateLabel = isManual
    ? formatRequestDisplayDate(req?.date)
    : `${formatRequestDisplayDate(req?.from)} - ${formatRequestDisplayDate(req?.to)}`;

  const manualTime = isManual ? `${req?.clockIn || '--'} → ${req?.clockOut || '--'}` : '';
  const breakLabel = isManual ? String(req?.breakOut || '').trim() : '';

  return (
    <View style={p.card}>
      <View style={p.headRow}>
        <View style={p.userRow}>
          <TimesheetUserAvatar name={req?.employee} avatarUrl={req?.avatarUrl} size={52} />
          <View style={p.userTextCol}>
            <View style={p.nameStatusRow}>
              <Text style={p.userName} numberOfLines={1}>
                {req?.employee || '—'}
              </Text>
              <View style={[p.statusPill, isSmall && p.statusPillCompact, { backgroundColor: st.bg }]}>
                <MaterialCommunityIcons name={st.icon} size={isSmall ? 15 : 16} color={st.color} />
                <Text style={[p.statusText, isSmall && p.statusTextCompact, { color: st.color }]} numberOfLines={1}>
                  {req?.status || '—'}
                </Text>
              </View>
            </View>
            <Text style={p.userMeta} numberOfLines={1}>
              {subTitle}
            </Text>
          </View>
        </View>
      </View>

      <View style={p.divider} />

      <View style={p.body}>
        {isManual ? (
          breakLabel ? (
            <>
              <ManualTwoColRow
                tone={tone}
                left={{ icon: 'calendar-month-outline', label: 'Date', value: dateLabel }}
                right={{ icon: 'coffee-outline', label: 'Break', value: breakLabel }}
              />
              <DetailRow tone={tone} iconName="clock-outline" label="Manual Time" value={manualTime} valueNumberOfLines={1} />
            </>
          ) : (
            <>
              <DetailRow tone={tone} iconName="calendar-month-outline" label="Date" value={dateLabel} />
              <DetailRow tone={tone} iconName="clock-outline" label="Manual Time" value={manualTime} valueNumberOfLines={1} />
            </>
          )
        ) : (
          <>
            <DetailRow tone={tone} iconName="calendar-month-outline" label="Date" value={dateLabel} />
            <DetailRow
              tone={tone}
              iconName="bag-suitcase-outline"
              label="Leave Type"
              value={req?.type}
              valueNumberOfLines={1}
            />
          </>
        )}

        <DetailRow tone={tone} iconName="account-outline" label="Reason" value={req?.reason} />
      </View>

      {showActions && req?.status === 'Pending' ? (
        <View style={p.actionsRow}>
          <Pressable style={[p.actionBtn, p.approveBtn]} onPress={onApprove}>
            <Text style={p.actionText}>Approve</Text>
          </Pressable>
          <Pressable style={[p.actionBtn, p.rejectBtn]} onPress={onOpenReject ?? onReject}>
            <Text style={p.actionText}>Reject</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const p = StyleSheet.create({
  card: {
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  userTextCol: { flex: 1, minWidth: 0 },
  nameStatusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  userName: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  userMeta: { marginTop: 2, fontSize: 13, fontWeight: '700', color: '#64748B' },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    flexShrink: 0,
  },
  statusText: { fontSize: 14, fontWeight: '800' },
  statusPillCompact: { paddingHorizontal: 10, paddingVertical: 6, gap: 5 },
  statusTextCompact: { fontSize: 12 },
  divider: { height: 1, backgroundColor: '#E2E8F0', marginTop: 12, marginBottom: 12 },
  body: { gap: 12 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTextCol: { flex: 1, minWidth: 0 },
  rowLabel: { fontSize: 12, fontWeight: '800', color: '#64748B' },
  rowValue: { marginTop: 3, fontSize: 14, fontWeight: '800', color: '#0F172A' },

  twoColRow: { flexDirection: 'row', alignItems: 'center' },
  twoColCell: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  twoColDivider: { width: 1, height: 40, backgroundColor: '#E2E8F0', marginHorizontal: 8 },

  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionBtn: { flex: 1, borderRadius: 12, paddingVertical: 11, alignItems: 'center', justifyContent: 'center' },
  approveBtn: { backgroundColor: RqColors.green },
  rejectBtn: { backgroundColor: RqColors.red },
  actionText: { color: '#fff', fontSize: 13, fontWeight: '800' },
});

