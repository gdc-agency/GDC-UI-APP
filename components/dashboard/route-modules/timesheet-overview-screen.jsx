import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { isAdminRole } from '@/utils/roles';

import { TsColors, statusDotStyle, timesheetStyles as ts } from './timesheet-styles';

import { TimesheetPageHeader } from './timesheet-page-header';
import { TimesheetUserAvatar } from './timesheet-user-avatar';
import { TimesheetRecordsView } from './timesheet-records-view';

const DATE_OPTIONS = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
];

const ROLE_OPTIONS = [
  { key: 'all', label: 'All Roles' },
  { key: 'Employee', label: 'Employee' },
  { key: 'Team Leader', label: 'Team Leader' },
  { key: 'HR', label: 'HR' },
];

function dayNum(iso) {
  if (!iso) return '—';
  const p = String(iso).slice(8, 10);
  return p.startsWith('0') ? p.slice(1) : p;
}

function dayShort(iso) {
  if (!iso) return '';
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

function roleSubtitle(role, team) {
  const r = String(role || '').trim();
  const t = String(team || '').trim();
  if (r && t && t !== '—') return `${r} • ${t}`;
  return r || t || '—';
}

function formatDashboardDate(timesheetWindow) {
  const now = new Date();
  if (timesheetWindow === 'today') {
    return `Today, ${now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;
  }
  if (timesheetWindow === '7d') return 'Last 7 days';
  if (timesheetWindow === '30d') return 'Last 30 days';
  return 'Attendance summary';
}

function computeOverviewStats(rows, timesheetWindow) {
  let present = 0;
  let absent = 0;
  let late = 0;
  let leave = 0;
  if (timesheetWindow === '30d') {
    rows.forEach((r) => {
      present += Number(r.counts?.present) || 0;
      late += Number(r.counts?.late) || 0;
      absent += Number(r.counts?.absent) || 0;
      leave += Number(r.leaveDays) || 0;
    });
  } else {
    rows.forEach((r) => {
      (r.cells || []).forEach((c) => {
        if (c === 'P') present += 1;
        else if (c === 'A') absent += 1;
        else if (c === 'LT') late += 1;
        else if (c === 'LV') leave += 1;
      });
    });
  }
  return { present, absent, late, leave };
}

function DashboardStatTile({ label, value, icon, tint, iconColor }) {
  return (
    <View style={ts.dashboardTile}>
      <View style={[ts.dashboardTileIcon, { backgroundColor: tint }]}>
        <MaterialCommunityIcons name={icon} size={20} color={iconColor} />
      </View>
      <View style={ts.dashboardTileText}>
        <Text style={ts.dashboardTileLabel}>{label}</Text>
        <Text style={ts.dashboardTileValue}>{value}</Text>
      </View>
    </View>
  );
}

/** @deprecated Kept for Metro fast-refresh; use DashboardStatTile / TimesheetDashboardHero. */
function StatCard({ label, value, icon, tint, iconColor }) {
  return (
    <DashboardStatTile
      label={label}
      value={String(value ?? '')}
      icon={icon}
      tint={tint}
      iconColor={iconColor}
    />
  );
}

function TimesheetDashboardHero({ stats, timesheetWindow }) {
  return (
    <View style={ts.dashboardHero}>
      <View style={ts.dashboardHeroTop}>
        <View style={{ flex: 1 }}>
          <Text style={ts.dashboardDate}>{formatDashboardDate(timesheetWindow)}</Text>
        </View>
        <View style={ts.dashboardCalBtn}>
          <MaterialCommunityIcons name="calendar-month-outline" size={20} color={TsColors.white} />
        </View>
      </View>
      <View style={ts.dashboardGrid}>
        <DashboardStatTile label="Present" value={String(stats.present)} icon="account-check-outline" tint="#DCFCE7" iconColor={TsColors.green} />
        <DashboardStatTile label="Absent" value={String(stats.absent)} icon="account-remove-outline" tint="#FEE2E2" iconColor={TsColors.red} />
        <DashboardStatTile label="Leave" value={String(stats.leave)} icon="airplane" tint="#FFEDD5" iconColor={TsColors.orange} />
        <DashboardStatTile label="Late" value={String(stats.late)} icon="clock-alert-outline" tint="#EDE9FE" iconColor={TsColors.purple} />
      </View>
    </View>
  );
}

function StatusDot({ code }) {
  const s = statusDotStyle(code);
  return (
    <View style={[ts.statusDot, { backgroundColor: s.bg }]}>
      <Text style={ts.statusDotText}>{s.label}</Text>
    </View>
  );
}

function Legend() {
  const items = [
    { code: 'P', label: 'Present', color: TsColors.green },
    { code: 'A', label: 'Absent', color: TsColors.red },
    { code: 'LV', label: 'Leave', color: TsColors.orange },
    { code: 'LT', label: 'Late', color: TsColors.purple },
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

function EmployeeCard({ entry, timesheetDays, timesheetWindow, expanded, onToggle }) {
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
                    <StatusDot code={entry.cells[idx] || 'A'} />
                  </View>
                ))}
              </View>
              <Legend />
            </>
          ) : timesheetWindow === 'today' ? (
            <View style={ts.summaryCountsRow}>
              <View style={ts.summaryCountItem}>
                <StatusDot code={entry.cells?.[0] || 'A'} />
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

/** @deprecated Removed — use TimesheetRecordsView. Kept for Metro fast-refresh. */
function RecordList() {
  return null;
}

/**
 * Reference-style attendance / timesheet overview (Admin, HR, records tabs).
 */
export function TimesheetOverviewScreen({
  slug,
  user,
  router,
  timesheetWindow,
  setTimesheetWindow,
  timesheetRoleFilter,
  setTimesheetRoleFilter,
  timesheetSearch,
  setTimesheetSearch,
  attendanceRows,
  timesheetDays,
  recordRouteTab,
  providerFilterOptions,
  recordProviderFilter,
  setRecordProviderFilter,
  recordSearch,
  setRecordSearch,
  recordFromDate,
  setRecordFromDate,
  recordToDate,
  setRecordToDate,
  filteredRecords,
  attendanceLoading,
  attendanceError,
  onRetryAttendance,
  showRoleFilter,
  recordDepartmentFilter,
  setRecordDepartmentFilter,
  recordDepartmentOptions,
  recordStatusFilter,
  setRecordStatusFilter,
  token,
  recordExportQuery,
}) {
  const [expandedId, setExpandedId] = useState(null);
  const [dateMenuOpen, setDateMenuOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  const isOverview = slug === 'timesheet';
  const isRecords = slug === 'clock-records' || slug === 'manual-records';

  useEffect(() => {
    if (!isOverview || attendanceRows.length === 0) return;
    setExpandedId(attendanceRows[0].gdcId);
  }, [isOverview, attendanceRows, timesheetWindow]);

  const stats = useMemo(() => computeOverviewStats(attendanceRows, timesheetWindow), [attendanceRows, timesheetWindow]);

  const dateLabel = DATE_OPTIONS.find((o) => o.key === timesheetWindow)?.label || '7 Days';
  const roleLabel = ROLE_OPTIONS.find((o) => o.key === timesheetRoleFilter)?.label || 'All Roles';

  return (
    <>
      <TimesheetPageHeader slug={slug} router={router} />

      {attendanceError ? (
        <View style={ts.banner}>
          <Text style={ts.bannerText}>{attendanceError}</Text>
          {onRetryAttendance ? (
            <Pressable style={ts.bannerBtn} onPress={onRetryAttendance}>
              <Text style={ts.bannerBtnText}>Retry</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {isOverview ? (
        <>
          <TimesheetDashboardHero stats={stats} timesheetWindow={timesheetWindow} />

          <View style={ts.filtersRow}>
            <View style={{ position: 'relative', zIndex: dateMenuOpen ? 30 : 1 }}>
              <Pressable
                style={ts.filterPill}
                onPress={() => {
                  setRoleMenuOpen(false);
                  setDateMenuOpen((v) => !v);
                }}
              >
                <MaterialCommunityIcons name="calendar-month-outline" size={16} color={TsColors.textMuted} />
                <Text style={ts.filterPillText}>{dateLabel}</Text>
                <MaterialCommunityIcons name="chevron-down" size={16} color={TsColors.textMuted} />
              </Pressable>
              {dateMenuOpen ? (
                <View style={ts.dateMenu}>
                  {DATE_OPTIONS.map((opt) => (
                    <Pressable
                      key={opt.key}
                      style={ts.roleMenuItem}
                      onPress={() => {
                        setTimesheetWindow(opt.key);
                        setDateMenuOpen(false);
                      }}
                    >
                      <Text style={ts.roleMenuItemText}>{opt.label}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>

            {showRoleFilter ? (
              <View style={{ position: 'relative', zIndex: roleMenuOpen ? 30 : 1 }}>
                <Pressable
                  style={ts.filterPill}
                  onPress={() => {
                    setDateMenuOpen(false);
                    setRoleMenuOpen((v) => !v);
                  }}
                >
                  <MaterialCommunityIcons name="account-group-outline" size={16} color={TsColors.textMuted} />
                  <Text style={ts.filterPillText}>{roleLabel}</Text>
                  <MaterialCommunityIcons name="chevron-down" size={16} color={TsColors.textMuted} />
                </Pressable>
                {roleMenuOpen ? (
                  <View style={ts.roleMenu}>
                    {ROLE_OPTIONS.map((opt) => (
                      <Pressable
                        key={opt.key}
                        style={ts.roleMenuItem}
                        onPress={() => {
                          setTimesheetRoleFilter(opt.key);
                          setRoleMenuOpen(false);
                        }}
                      >
                        <Text style={ts.roleMenuItemText}>{opt.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}

            <View style={ts.searchWrap}>
              <MaterialCommunityIcons name="magnify" size={18} color={TsColors.textMuted} />
              <TextInput
                value={timesheetSearch}
                onChangeText={setTimesheetSearch}
                placeholder="Search by name, GDC ID or team"
                placeholderTextColor="#9CA3AF"
                style={ts.searchInput}
              />
            </View>
          </View>

          {attendanceLoading ? (
            <View style={[ts.emptyBox, { marginBottom: 12 }]}>
              <ActivityIndicator color={TsColors.blue} />
              <Text style={[ts.emptyText, { marginTop: 10 }]}>Loading attendance…</Text>
            </View>
          ) : null}

          {!attendanceLoading && attendanceRows.length === 0 ? (
            <View style={ts.emptyBox}>
              <Text style={ts.emptyText}>No attendance records in selected window.</Text>
            </View>
          ) : (
            attendanceRows.map((entry) => (
              <EmployeeCard
                key={entry.gdcId}
                entry={entry}
                timesheetDays={timesheetDays}
                timesheetWindow={timesheetWindow}
                expanded={expandedId === entry.gdcId}
                onToggle={() => setExpandedId((prev) => (prev === entry.gdcId ? null : entry.gdcId))}
              />
            ))
          )}
        </>
      ) : null}

      {isRecords ? (
        <TimesheetRecordsView
          variant={recordRouteTab}
          records={filteredRecords}
          loading={attendanceLoading}
          departmentFilter={recordDepartmentFilter}
          setDepartmentFilter={setRecordDepartmentFilter}
          departmentOptions={recordDepartmentOptions}
          roleFilter={recordProviderFilter}
          setRoleFilter={setRecordProviderFilter}
          roleOptions={providerFilterOptions}
          recordSearch={recordSearch}
          setRecordSearch={setRecordSearch}
          recordFromDate={recordFromDate}
          setRecordFromDate={setRecordFromDate}
          recordToDate={recordToDate}
          setRecordToDate={setRecordToDate}
          statusFilter={recordStatusFilter}
          setStatusFilter={setRecordStatusFilter}
          token={token}
          exportQuery={recordExportQuery}
        />
      ) : null}
    </>
  );
}

export function useShowTimesheetOverviewUi(user, slug) {
  const isRecords = slug === 'clock-records' || slug === 'manual-records';
  const isAdminHrOverview =
    (isAdminRole(user?.role) || user?.role === 'HR') && (slug === 'timesheet' || isRecords);
  return isAdminHrOverview;
}
