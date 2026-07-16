import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { useTheme } from '@/context/theme-context';
import { isAdminOrHrRole, isAdminRole } from '@/utils/roles';

import { AttendanceMemberCard } from './attendance-member-card';
import { TimesheetPageHeader } from './timesheet-page-header';
import { TimesheetRecordsView } from './timesheet-records-view';

const DATE_OPTIONS = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
];

export const TIMESHEET_ADMIN_ROLE_OPTIONS = [
  { key: 'all', label: 'All Roles' },
  { key: 'Employee', label: 'Employee' },
  { key: 'Team Leader', label: 'Team Leader' },
  { key: 'HR', label: 'HR' },
];

export const TIMESHEET_HR_ROLE_OPTIONS = [
  { key: 'all', label: 'All Roles' },
  { key: 'Employee', label: 'Employee' },
  { key: 'Team Leader', label: 'Team Leader' },
];

export function timesheetRoleFilterOptionsForViewer(role) {
  if (isAdminRole(role)) return TIMESHEET_ADMIN_ROLE_OPTIONS;
  if (String(role || '').trim() === 'HR') return TIMESHEET_HR_ROLE_OPTIONS;
  return TIMESHEET_ADMIN_ROLE_OPTIONS;
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
  const totalEmployees = rows.length;
  return { totalEmployees, present, absent, late, leave };
}

function DashboardStatTile({ label, value, icon, tint, iconColor }) {
  const { moduleStyles } = useTheme();
  const ts = moduleStyles.timesheet.styles;

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
  const { moduleStyles } = useTheme();
  const ts = moduleStyles.timesheet.styles;
  const TsColors = moduleStyles.timesheet.colors;

  return (
    <View style={ts.dashboardHero}>
      <View style={ts.dashboardHeroTop}>
        <View style={{ flex: 1 }}>
          <Text style={ts.dashboardDate}>{formatDashboardDate(timesheetWindow)}</Text>
          <Text style={[ts.dashboardDate, { marginTop: 2, opacity: 0.85, fontSize: 12, fontWeight: '600' }]}>
            Track attendance, lateness and leave records.
          </Text>
        </View>
        <View style={ts.dashboardCalBtn}>
          <MaterialCommunityIcons name="calendar-month-outline" size={20} color={TsColors.white} />
        </View>
      </View>
      <View style={ts.dashboardGrid}>
        <DashboardStatTile
          label="Total Employees"
          value={String(stats.totalEmployees ?? 0)}
          icon="account-group-outline"
          tint="#E0E7FF"
          iconColor={TsColors.blue}
        />
        <DashboardStatTile
          label="Present"
          value={String(stats.present ?? 0)}
          icon="account-check-outline"
          tint="#DCFCE7"
          iconColor={TsColors.green}
        />
        <DashboardStatTile
          label="Late"
          value={String(stats.late ?? 0)}
          icon="clock-alert-outline"
          tint="#EDE9FE"
          iconColor={TsColors.purple}
        />
        <DashboardStatTile
          label="Absent"
          value={String(stats.absent ?? 0)}
          icon="account-remove-outline"
          tint="#FEE2E2"
          iconColor={TsColors.red}
        />
        <DashboardStatTile
          label="On Leave"
          value={String(stats.leave ?? 0)}
          icon="airplane"
          tint="#FFEDD5"
          iconColor={TsColors.orange}
        />
      </View>
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
  roleFilterOptions,
  recordDepartmentFilter,
  setRecordDepartmentFilter,
  recordDepartmentOptions,
  recordStatusFilter,
  setRecordStatusFilter,
  token,
  recordExportQuery,
  showAdminSegments = true,
  headerTitle = 'Attendance Overview',
}) {
  const { moduleStyles } = useTheme();
  const ts = moduleStyles.timesheet.styles;
  const TsColors = moduleStyles.timesheet.colors;

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

  const dateLabel = DATE_OPTIONS.find((o) => o.key === timesheetWindow)?.label || 'Last 7 days';
  const roleOpts = roleFilterOptions?.length ? roleFilterOptions : TIMESHEET_ADMIN_ROLE_OPTIONS;
  const roleLabel = roleOpts.find((o) => o.key === timesheetRoleFilter)?.label || 'All Roles';

  return (
    <>
      {showAdminSegments ? <TimesheetPageHeader slug={slug} router={router} /> : (
        <View style={{ marginBottom: 8 }}>
          <Text style={ts.screenTitle}>{isOverview ? headerTitle : slug === 'manual-records' ? 'Manual TimeSheet' : 'Attendance Logs'}</Text>
        </View>
      )}

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
                    {roleOpts.map((opt) => (
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
              <AttendanceMemberCard
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

/** Admin always overview. HR Overview / Logs / Manual use overview UI; HR My attendance uses personal panel. */
export function useShowTimesheetOverviewUi(user, slug, timesheetSubTab = 'overview') {
  const isRecords = slug === 'clock-records' || slug === 'manual-records';
  if (isAdminRole(user?.role)) {
    return slug === 'timesheet' || isRecords;
  }
  if (String(user?.role || '').trim() === 'HR') {
    if (isRecords) return true;
    if (slug === 'timesheet') return String(timesheetSubTab || '') === 'overview';
    return false;
  }
  return false;
}
