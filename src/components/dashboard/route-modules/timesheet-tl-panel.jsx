import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { useTheme } from '@/context/theme-context';
import { attachClockLogUser } from '@/utils/attendance-ui-map';

import { AttendanceMemberCardList } from './attendance-member-card';
import { ClockRecordCard } from './clock-record-card';
import { TimesheetRecordsView } from './timesheet-records-view';

const PERIODS = [
  ['today', 'Today'],
  ['7d', '7 days'],
  ['30d', '30 days'],
];

function formatRangeLabel(window, days) {
  const now = new Date();
  if (window === 'today') {
    return `Today, ${now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  }
  if (window === '7d') {
    const start = days[0];
    const end = days[days.length - 1];
    if (start && end) {
      const fmt = (iso) =>
        new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      return `${fmt(start)} – ${fmt(end)}, ${now.getFullYear()}`;
    }
    return 'Last 7 days';
  }
  if (window === '30d') {
    const start = days[0];
    const end = days[days.length - 1];
    if (start && end) {
      const fmt = (iso) =>
        new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      return `${fmt(start)} – ${fmt(end)}, ${now.getFullYear()}`;
    }
    return 'Last 30 days';
  }
  return '';
}

function rangeLabelShort(window) {
  if (window === 'today') return 'Today';
  if (window === '7d') return 'Last 7 days';
  if (window === '30d') return 'Last 30 days';
  return '';
}

function PeriodPills({ timesheetWindow, setTimesheetWindow, blueActive }) {
  const { moduleStyles } = useTheme();
  const tls = moduleStyles.timesheetTl.styles;

  return (
    <View style={tls.periodWrap}>
      {PERIODS.map(([key, label]) => {
        const active = timesheetWindow === key;
        return (
          <Pressable
            key={key}
            onPress={() => setTimesheetWindow(key)}
            style={[
              tls.periodBtn,
              active && (blueActive ? tls.periodBtnBlueActive : tls.periodBtnActive),
            ]}>
            <Text
              style={[
                tls.periodText,
                active && (blueActive ? tls.periodTextBlueActive : tls.periodTextActive),
              ]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function HeroCard({ icon, title, timesheetWindow, setTimesheetWindow, timesheetDays, bluePills }) {
  const { moduleStyles } = useTheme();
  const tls = moduleStyles.timesheetTl.styles;
  const TlColors = moduleStyles.timesheetTl.colors;

  return (
    <View style={tls.heroCard}>
      <LinearGradient colors={['#4F46E5', '#7C3AED', '#94A3B8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={tls.heroAccent} />
      <View style={tls.heroBody}>
        <View style={tls.heroTitleRow}>
          <View style={tls.heroIcon}>
            <MaterialCommunityIcons name={icon} size={22} color="#fff" />
          </View>
          <Text style={tls.heroTitle}>{title}</Text>
        </View>
        <PeriodPills timesheetWindow={timesheetWindow} setTimesheetWindow={setTimesheetWindow} blueActive={bluePills} />
        <View style={tls.dateRow}>
          <View style={{ borderRadius: 10, backgroundColor: TlColors.indigoLight, padding: 8 }}>
            <MaterialCommunityIcons name="calendar-month-outline" size={18} color={TlColors.indigo} />
          </View>
          <View style={tls.dateMeta}>
            <Text style={tls.dateLabel}>{rangeLabelShort(timesheetWindow)}</Text>
            <Text style={tls.dateValue}>{formatRangeLabel(timesheetWindow, timesheetDays)}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-down" size={20} color="#94A3B8" />
        </View>
      </View>
    </View>
  );
}

function TlMyAttendance({ ctx, router }) {
  const { moduleStyles } = useTheme();
  const tls = moduleStyles.timesheetTl.styles;
  const TlColors = moduleStyles.timesheetTl.colors;
  const TsColors = moduleStyles.timesheet.colors;

  const {
    timesheetWindow,
    setTimesheetWindow,
    timesheetDays,
    tlMyAttendanceSummary,
    tlMyAttendanceLogs,
    tlProfile,
  } = ctx;
  const rangeShort = rangeLabelShort(timesheetWindow);

  return (
    <View style={tls.stack}>
      <HeroCard
        icon="clock-outline"
        title="My attendance"
        timesheetWindow={timesheetWindow}
        setTimesheetWindow={setTimesheetWindow}
        timesheetDays={timesheetDays}
      />

      <Text style={[tls.panelSub, { marginTop: -4, marginBottom: 4 }]}>
        Track and manage your work hours
      </Text>

      <View style={tls.statsGrid}>
        <View style={tls.statTile}>
          <Text style={tls.statTileLabel}>Total hours</Text>
          <Text style={[tls.statTileValue, { color: TsColors.blue }]}>
            {(tlMyAttendanceSummary?.totalHours ?? 0).toFixed(1)}
          </Text>
          <Text style={tls.statTileUnit}>hours</Text>
          <MaterialCommunityIcons name="chart-line" size={56} color="#DBEAFE" style={tls.statDeco} />
        </View>
        <View style={tls.statTile}>
          <Text style={tls.statTileLabel}>Overtime</Text>
          <Text style={[tls.statTileValue, { color: TlColors.violet }]}>
            {(tlMyAttendanceSummary?.overtime ?? 0).toFixed(1)}
          </Text>
          <Text style={tls.statTileUnit}>hours</Text>
          <MaterialCommunityIcons name="trending-up" size={56} color="#EDE9FE" style={tls.statDeco} />
        </View>
        <View style={[tls.statTile, { flexBasis: '100%' }]}>
          <Text style={tls.statTileLabel}>Late marks</Text>
          <Text
            style={[
              tls.statTileValue,
              { color: (tlMyAttendanceSummary?.lateMarks ?? 0) > 0 ? '#DC2626' : '#16A34A' },
            ]}>
            {tlMyAttendanceSummary?.lateMarks ?? 0}
          </Text>
          <Text style={tls.statTileUnit}>instances</Text>
          <MaterialCommunityIcons name="alert-circle-outline" size={56} color="#FEE2E2" style={tls.statDeco} />
        </View>
      </View>

      <View style={tls.panelCard}>
        <View style={tls.panelHead}>
          <View style={tls.panelHeadLeft}>
            <View style={[tls.panelIcon, { backgroundColor: TlColors.indigoLight }]}>
              <MaterialCommunityIcons name="timer-outline" size={20} color={TlColors.indigo} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={tls.panelTitle}>Clock history</Text>
              <Text style={tls.panelSub}>
                {rangeShort} · {tlMyAttendanceLogs.length} record{tlMyAttendanceLogs.length === 1 ? '' : 's'}
              </Text>
            </View>
          </View>
          {typeof router?.push === 'function' ? (
            <Pressable
              onPress={() => router.push('/dashboard/(tabs)/route/my-requests?tab=manual')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingHorizontal: 10,
                paddingVertical: 8,
                borderRadius: 10,
                backgroundColor: '#EEF2FF',
              }}>
              <MaterialCommunityIcons name="plus" size={16} color={TlColors.indigo} />
              <Text style={{ fontSize: 12, fontWeight: '800', color: TlColors.indigo }}>Request manual time</Text>
            </Pressable>
          ) : null}
        </View>

        {tlMyAttendanceLogs.length === 0 ? (
          <View style={tls.emptyBox}>
            <MaterialCommunityIcons name="clipboard-text-clock-outline" size={48} color="#CBD5E1" />
            <Text style={tls.emptyTitle}>No shifts in this window</Text>
            <Text style={tls.emptySub}>Your clock in/out history will appear here.</Text>
          </View>
        ) : (
          tlMyAttendanceLogs.map((entry) => (
            <ClockRecordCard
              key={entry.id}
              entry={attachClockLogUser(entry, tlProfile)}
            />
          ))
        )}
      </View>
    </View>
  );
}

function TlTeamOverview({ ctx }) {
  const { moduleStyles } = useTheme();
  const tls = moduleStyles.timesheetTl.styles;
  const TsColors = moduleStyles.timesheet.colors;

  const { timesheetWindow, setTimesheetWindow, timesheetDays, tlTeamSearch, setTlTeamSearch, tlTeamOverviewRows } = ctx;

  return (
    <View style={tls.stack}>
      <HeroCard
        icon="account-group-outline"
        title="Team attendance"
        timesheetWindow={timesheetWindow}
        setTimesheetWindow={setTimesheetWindow}
        timesheetDays={timesheetDays}
        bluePills
      />

      <View style={tls.panelCard}>
        <View style={tls.searchRow}>
          <View style={tls.searchField}>
            <MaterialCommunityIcons name="magnify" size={18} color={TsColors.textMuted} />
            <TextInput
              value={tlTeamSearch}
              onChangeText={setTlTeamSearch}
              placeholder="Search by name, ID or code…"
              placeholderTextColor="#94A3B8"
              style={tls.searchInput}
            />
          </View>
          <Pressable style={tls.filterBtn}>
            <MaterialCommunityIcons name="filter-outline" size={18} color={TsColors.blue} />
            <Text style={tls.filterBtnText}>Filters</Text>
          </Pressable>
        </View>
      </View>

      {tlTeamOverviewRows.length === 0 ? (
        <Text style={[tls.emptySub, { textAlign: 'center', paddingVertical: 24 }]}>No team members in scope.</Text>
      ) : (
        <AttendanceMemberCardList
          rows={tlTeamOverviewRows}
          timesheetDays={timesheetDays}
          timesheetWindow={timesheetWindow}
        />
      )}
      {tlTeamOverviewRows.length > 0 ? (
        <Text style={tls.footerNote}>
          {timesheetWindow === 'today' ? 'Today' : timesheetWindow === '7d' ? '7-day grid' : '30-day summary'} ·{' '}
          {tlTeamOverviewRows.length} team member{tlTeamOverviewRows.length === 1 ? '' : 's'}
        </Text>
      ) : null}
    </View>
  );
}

function TlTeamRecords({ ctx }) {
  const { moduleStyles } = useTheme();
  const tls = moduleStyles.timesheetTl.styles;

  const {
    tlFilteredTeamRecords,
    tlRecordExportQuery,
    tlTeamRecordDepartmentOptions,
    tlProviderFilterOptions,
    recordDepartmentFilter,
    setRecordDepartmentFilter,
    recordProviderFilter,
    setRecordProviderFilter,
    recordSearch,
    setRecordSearch,
    recordFromDate,
    setRecordFromDate,
    recordToDate,
    setRecordToDate,
    token,
    attendanceLoading,
  } = ctx;

  return (
    <View style={tls.stack}>
      <TimesheetRecordsView
        variant="clock"
        records={tlFilteredTeamRecords}
        loading={attendanceLoading}
        token={token}
        exportQuery={tlRecordExportQuery}
        departmentFilter={recordDepartmentFilter}
        setDepartmentFilter={setRecordDepartmentFilter}
        departmentOptions={tlTeamRecordDepartmentOptions}
        roleFilter={recordProviderFilter}
        setRoleFilter={setRecordProviderFilter}
        roleOptions={tlProviderFilterOptions}
        recordSearch={recordSearch}
        setRecordSearch={setRecordSearch}
        recordFromDate={recordFromDate}
        setRecordFromDate={setRecordFromDate}
        recordToDate={recordToDate}
        setRecordToDate={setRecordToDate}
      />
    </View>
  );
}

export function TimesheetTlPanel({ ctx, router }) {
  const { tlTimesheetTab } = ctx;

  if (tlTimesheetTab === 'team-overview') {
    return <TlTeamOverview ctx={ctx} />;
  }
  if (tlTimesheetTab === 'team-records') {
    return <TlTeamRecords ctx={ctx} />;
  }
  return <TlMyAttendance ctx={ctx} router={router} />;
}

