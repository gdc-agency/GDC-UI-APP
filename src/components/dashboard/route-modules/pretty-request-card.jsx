import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import React, { useMemo } from 'react';
import { Platform, Pressable, Text, View, useWindowDimensions } from 'react-native';

import { useTheme } from '@/context/theme-context';
import { formatRequestDisplayDate } from '@/utils/attendance-ui-map';
import { cn } from '@/theme/cn';

import { TimesheetUserAvatar } from './timesheet-user-avatar';
import { requestStatusStyle } from '@/theme/module-styles/request-styles';

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

function DetailRow({ tone, iconName, label, value, valueNumberOfLines = 2 }) {
  return (
    <View className="flex-row items-center gap-2.5">
      <View className="h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: tone.iconBg }}>
        <MaterialCommunityIcons name={iconName} size={18} color={tone.icon} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-xs font-extrabold text-text-muted">{label}</Text>
        <Text className="mt-[3px] text-sm font-extrabold text-text" numberOfLines={valueNumberOfLines}>
          {value || '—'}
        </Text>
      </View>
    </View>
  );
}

function ManualTwoColRow({ tone, left, right }) {
  return (
    <View className="flex-row items-center">
      <View className="min-w-0 flex-1 flex-row items-center gap-2.5">
        <View className="h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: tone.iconBg }}>
          <MaterialCommunityIcons name={left.icon} size={18} color={tone.icon} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-xs font-extrabold text-text-muted">{left.label}</Text>
          <Text className="mt-[3px] text-sm font-extrabold text-text" numberOfLines={1}>
            {left.value || '—'}
          </Text>
        </View>
      </View>

      <View className="mx-2 h-10 w-px bg-border-strong" />

      <View className="min-w-0 flex-1 flex-row items-center gap-2.5">
        <View className="h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: tone.iconBg }}>
          <MaterialCommunityIcons name={right.icon} size={18} color={tone.icon} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-xs font-extrabold text-text-muted">{right.label}</Text>
          <Text className="mt-[3px] text-sm font-extrabold text-text" numberOfLines={1}>
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

  const cardShadowStyle = Platform.select({
    ios: {
      shadowColor: colors.text,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
    },
    android: { elevation: 2 },
    default: {},
  });

  const st = useMemo(() => requestStatusStyle(req?.status, rq), [req?.status, rq]);
  const tone = useMemo(() => toneColors(req?.status, rq), [req?.status, rq]);

  const subTitle = roleSubtitle(req?.role, req?.team);
  const dateLabel = isManual
    ? formatRequestDisplayDate(req?.date)
    : `${formatRequestDisplayDate(req?.from)} - ${formatRequestDisplayDate(req?.to)}`;

  const manualTime = isManual ? `${req?.clockIn || '--'} → ${req?.clockOut || '--'}` : '';
  const breakLabel = isManual ? String(req?.breakOut || '').trim() : '';

  return (
    <View
      className="mb-3 overflow-hidden rounded-2xl border border-border-strong bg-card p-3.5"
      style={cardShadowStyle}>
      <View className="flex-row items-start gap-2.5">
        <View className="min-w-0 flex-1 flex-row items-start gap-3">
          <TimesheetUserAvatar name={req?.employee} avatarUrl={req?.avatarUrl} size={48} />
          <View className="min-w-0 flex-1 gap-1">
            <Text className="shrink text-base font-extrabold leading-[22px] text-text">{req?.employee || '—'}</Text>
            <Text className="text-xs font-semibold leading-[17px] text-text-muted">{subTitle}</Text>
            <View
              className={cn(
                'mt-1.5 max-w-full flex-row items-center gap-[5px] self-start rounded-lg px-2.5 py-[5px]',
                isSmall && 'gap-1 px-2 py-1',
              )}
              style={{ backgroundColor: st.bg }}>
              <MaterialCommunityIcons name={st.icon} size={isSmall ? 14 : 15} color={st.color} />
              <Text
                className={cn('text-xs font-extrabold', isSmall && 'text-[11px]')}
                style={{ color: st.color }}>
                {req?.status || '—'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View className="my-3 h-px bg-border-strong" />

      <View className="gap-3">
        {isManual ? (
          breakLabel ? (
            <>
              <ManualTwoColRow
                tone={tone}
                left={{ icon: 'calendar-month-outline', label: 'Date', value: dateLabel }}
                right={{ icon: 'coffee-outline', label: 'Break', value: breakLabel }}
              />
              <DetailRow
                tone={tone}
                iconName="clock-outline"
                label="Manual Time"
                value={manualTime}
                valueNumberOfLines={1}
              />
            </>
          ) : (
            <>
              <DetailRow tone={tone} iconName="calendar-month-outline" label="Date" value={dateLabel} />
              <DetailRow
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
        <View className="mt-3.5 flex-row gap-2.5">
          <Pressable
            className="flex-1 items-center justify-center rounded-xl py-[11px]"
            style={{ backgroundColor: rq.green }}
            onPress={onApprove}>
            <Text className="text-[13px] font-extrabold text-white">Approve</Text>
          </Pressable>
          <Pressable
            className="flex-1 items-center justify-center rounded-xl py-[11px]"
            style={{ backgroundColor: rq.red }}
            onPress={onOpenReject ?? onReject}>
            <Text className="text-[13px] font-extrabold text-white">Reject</Text>
          </Pressable>
        </View>
      ) : null}

      {!showActions && req?.status === 'Rejected' && req?.adminReason ? (
        <View className="mt-3 rounded-xl border border-danger-border p-2.5" style={{ backgroundColor: rq.redBg }}>
          <Text className="mb-1 text-xs font-extrabold" style={{ color: rq.redText }}>
            Admin feedback
          </Text>
          <Text className="text-[13px] font-semibold leading-[18px] text-text">{req.adminReason}</Text>
        </View>
      ) : null}
    </View>
  );
}
