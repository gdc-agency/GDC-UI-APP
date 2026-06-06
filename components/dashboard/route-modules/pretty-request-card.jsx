import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import React, { useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { useTheme } from '@/context/theme-context';
import { formatRequestDisplayDate } from '@/utils/attendance-ui-map';

import { TimesheetUserAvatar } from './timesheet-user-avatar';
import { requestStatusStyle } from './request-styles';

function roleSubtitle(role, team) {
  const r = String(role || '').trim();
  const t = String(team || '').trim();
  if (r && t && t !== '—') return `${r} • ${t}`;
  return r || t || '—';
}

function toneColors(status, rq) {
  const s = String(status || '');
  if (s === 'Approved') return { bg: rq.greenBg, border: '#BBF7D0', iconBg: rq.greenBg, icon: rq.greenText };
  if (s === 'Rejected') return { bg: rq.redBg, border: rq.redBg, iconBg: rq.redBg, icon: rq.redText };
  return { bg: rq.amberBg, border: rq.amberBg, iconBg: rq.amberBg, icon: rq.amberText };
}

function DetailRow({ cardStyles, tone, iconName, label, value, valueNumberOfLines = 2 }) {
  return (
    <View style={cardStyles.row}>
      <View style={[cardStyles.rowIconWrap, { backgroundColor: tone.iconBg }]}>
        <MaterialCommunityIcons name={iconName} size={18} color={tone.icon} />
      </View>
      <View style={cardStyles.rowTextCol}>
        <Text style={cardStyles.rowLabel}>{label}</Text>
        <Text style={cardStyles.rowValue} numberOfLines={valueNumberOfLines}>
          {value || '—'}
        </Text>
      </View>
    </View>
  );
}

function ManualTwoColRow({ cardStyles, tone, left, right }) {
  return (
    <View style={cardStyles.twoColRow}>
      <View style={cardStyles.twoColCell}>
        <View style={[cardStyles.rowIconWrap, { backgroundColor: tone.iconBg }]}>
          <MaterialCommunityIcons name={left.icon} size={18} color={tone.icon} />
        </View>
        <View style={cardStyles.rowTextCol}>
          <Text style={cardStyles.rowLabel}>{left.label}</Text>
          <Text style={cardStyles.rowValue} numberOfLines={1}>
            {left.value || '—'}
          </Text>
        </View>
      </View>

      <View style={cardStyles.twoColDivider} />

      <View style={cardStyles.twoColCell}>
        <View style={[cardStyles.rowIconWrap, { backgroundColor: tone.iconBg }]}>
          <MaterialCommunityIcons name={right.icon} size={18} color={tone.icon} />
        </View>
        <View style={cardStyles.rowTextCol}>
          <Text style={cardStyles.rowLabel}>{right.label}</Text>
          <Text style={cardStyles.rowValue} numberOfLines={1}>
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
  const { colors, moduleStyles } = useTheme();
  const rq = moduleStyles.request.colors;
  const isSmall = width < 380;

  const cardStyles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          borderRadius: 16,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.borderStrong,
          padding: 14,
          marginBottom: 12,
          overflow: 'hidden',
          ...Platform.select({
            ios: {
              shadowColor: colors.text,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.05,
              shadowRadius: 12,
            },
            android: { elevation: 2 },
            default: {},
          }),
        },
        headRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
        userRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, flex: 1, minWidth: 0 },
        userTextCol: { flex: 1, minWidth: 0, gap: 4 },
        userName: { fontSize: 16, fontWeight: '800', color: colors.text, lineHeight: 22, flexShrink: 1 },
        userMeta: { fontSize: 12, fontWeight: '600', color: colors.textMuted, lineHeight: 17 },
        statusPill: {
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          gap: 5,
          marginTop: 6,
          paddingHorizontal: 10,
          paddingVertical: 5,
          borderRadius: 8,
          maxWidth: '100%',
        },
        statusText: { fontSize: 12, fontWeight: '800' },
        statusPillCompact: { paddingHorizontal: 8, paddingVertical: 4, gap: 4 },
        statusTextCompact: { fontSize: 11 },
        divider: { height: 1, backgroundColor: colors.borderStrong, marginTop: 12, marginBottom: 12 },
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
        rowLabel: { fontSize: 12, fontWeight: '800', color: colors.textMuted },
        rowValue: { marginTop: 3, fontSize: 14, fontWeight: '800', color: colors.text },
        twoColRow: { flexDirection: 'row', alignItems: 'center' },
        twoColCell: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
        twoColDivider: { width: 1, height: 40, backgroundColor: colors.borderStrong, marginHorizontal: 8 },
        actionsRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
        actionBtn: { flex: 1, borderRadius: 12, paddingVertical: 11, alignItems: 'center', justifyContent: 'center' },
        approveBtn: { backgroundColor: rq.green },
        rejectBtn: { backgroundColor: rq.red },
        actionText: { color: '#fff', fontSize: 13, fontWeight: '800' },
        feedbackBox: {
          marginTop: 12,
          padding: 10,
          borderRadius: 12,
          backgroundColor: rq.redBg,
          borderWidth: 1,
          borderColor: colors.dangerBorder,
        },
        feedbackTitle: { fontSize: 12, fontWeight: '800', color: rq.redText, marginBottom: 4 },
        feedbackText: { fontSize: 13, fontWeight: '600', color: colors.text, lineHeight: 18 },
      }),
    [colors, rq],
  );

  const st = useMemo(() => requestStatusStyle(req?.status, rq), [req?.status, rq]);
  const tone = useMemo(() => toneColors(req?.status, rq), [req?.status, rq]);

  const subTitle = roleSubtitle(req?.role, req?.team);
  const dateLabel = isManual
    ? formatRequestDisplayDate(req?.date)
    : `${formatRequestDisplayDate(req?.from)} - ${formatRequestDisplayDate(req?.to)}`;

  const manualTime = isManual ? `${req?.clockIn || '--'} → ${req?.clockOut || '--'}` : '';
  const breakLabel = isManual ? String(req?.breakOut || '').trim() : '';

  return (
    <View style={cardStyles.card}>
      <View style={cardStyles.headRow}>
        <View style={cardStyles.userRow}>
          <TimesheetUserAvatar name={req?.employee} avatarUrl={req?.avatarUrl} size={48} />
          <View style={cardStyles.userTextCol}>
            <Text style={cardStyles.userName}>{req?.employee || '—'}</Text>
            <Text style={cardStyles.userMeta}>{subTitle}</Text>
            <View style={[cardStyles.statusPill, isSmall && cardStyles.statusPillCompact, { backgroundColor: st.bg }]}>
              <MaterialCommunityIcons name={st.icon} size={isSmall ? 14 : 15} color={st.color} />
              <Text style={[cardStyles.statusText, isSmall && cardStyles.statusTextCompact, { color: st.color }]}>
                {req?.status || '—'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={cardStyles.divider} />

      <View style={cardStyles.body}>
        {isManual ? (
          breakLabel ? (
            <>
              <ManualTwoColRow
                cardStyles={cardStyles}
                tone={tone}
                left={{ icon: 'calendar-month-outline', label: 'Date', value: dateLabel }}
                right={{ icon: 'coffee-outline', label: 'Break', value: breakLabel }}
              />
              <DetailRow
                cardStyles={cardStyles}
                tone={tone}
                iconName="clock-outline"
                label="Manual Time"
                value={manualTime}
                valueNumberOfLines={1}
              />
            </>
          ) : (
            <>
              <DetailRow cardStyles={cardStyles} tone={tone} iconName="calendar-month-outline" label="Date" value={dateLabel} />
              <DetailRow
                cardStyles={cardStyles}
                tone={tone}
                iconName="clock-outline"
                label="Manual Time"
                value={manualTime}
                valueNumberOfLines={1}
              />
            </>
          )
        ) : (
          <>
            <DetailRow cardStyles={cardStyles} tone={tone} iconName="calendar-month-outline" label="Date" value={dateLabel} />
            <DetailRow
              cardStyles={cardStyles}
              tone={tone}
              iconName="bag-suitcase-outline"
              label="Leave Type"
              value={req?.type}
              valueNumberOfLines={1}
            />
          </>
        )}

        <DetailRow cardStyles={cardStyles} tone={tone} iconName="account-outline" label="Reason" value={req?.reason} />
      </View>

      {showActions && req?.status === 'Pending' ? (
        <View style={cardStyles.actionsRow}>
          <Pressable style={[cardStyles.actionBtn, cardStyles.approveBtn]} onPress={onApprove}>
            <Text style={cardStyles.actionText}>Approve</Text>
          </Pressable>
          <Pressable style={[cardStyles.actionBtn, cardStyles.rejectBtn]} onPress={onOpenReject ?? onReject}>
            <Text style={cardStyles.actionText}>Reject</Text>
          </Pressable>
        </View>
      ) : null}

      {!showActions && req?.status === 'Rejected' && req?.adminReason ? (
        <View style={cardStyles.feedbackBox}>
          <Text style={cardStyles.feedbackTitle}>Admin feedback</Text>
          <Text style={cardStyles.feedbackText}>{req.adminReason}</Text>
        </View>
      ) : null}
    </View>
  );
}
