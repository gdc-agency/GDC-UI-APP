import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { KeyboardAwareScrollView } from '@/components/ui/keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedBlock } from '@/components/ui/animated-block';
import { DashboardTopbar } from '@/components/dashboard/topbar';
import { useTheme } from '@/context/theme-context';
import { isAdminOrHrRole, isAdminRole, isHrRole } from '@/utils/roles';
import { defaultTimesheetSubTab } from '@/utils/timesheet-tabs-config';

import {
  TimesheetOverviewScreen,
  timesheetRoleFilterOptionsForViewer,
} from './timesheet-overview-screen';
import { TimesheetRoleNav } from './timesheet-role-nav';
import { TimesheetTlPanel } from './timesheet-tl-panel';

export function TimesheetSection({ styles, ctx }) {
  const { moduleStyles } = useTheme();
  const ts = moduleStyles.timesheet.styles;

  const {
    slug,
    user,
    router,
    setTlTimesheetTab,
    tlTimesheetTab,
    timesheetWindow,
    setTimesheetWindow,
    tlMyAttendanceSummary,
    tlMyAttendanceLogs,
    tlMyAttendanceEntry,
    timesheetDays,
    tlProfile,
    tlTeamSearch,
    setTlTeamSearch,
    tlTeamOverviewRows,
    tlFilteredTeamRecords,
    tlRecordExportQuery,
    tlTeamRecordDepartmentOptions,
    tlProviderFilterOptions,
    employeeAttendanceSummary,
    employeeProfile,
    employeeAttendanceLogs,
    setTimesheetRoleFilter,
    timesheetRoleFilter,
    timesheetSearch,
    setTimesheetSearch,
    attendanceRows,
    recordRouteTab,
    providerFilterOptions,
    setRecordProviderFilter,
    recordProviderFilter,
    recordSearch,
    setRecordSearch,
    recordFromDate,
    setRecordFromDate,
    recordToDate,
    setRecordToDate,
    recordDepartmentFilter,
    setRecordDepartmentFilter,
    recordDepartmentOptions,
    recordStatusFilter,
    setRecordStatusFilter,
    token,
    recordExportQuery,
    filteredRecords,
    attendanceLoading,
    attendanceError,
    onRetryAttendance,
  } = ctx;

  const isHr = isHrRole(user?.role);
  const isAdmin = isAdminRole(user?.role);
  const subTab = tlTimesheetTab || defaultTimesheetSubTab(user?.role);
  const isRecordsOnlyRoute = slug === 'clock-records' || slug === 'manual-records';
  const roleFilterOptions = timesheetRoleFilterOptionsForViewer(user?.role);

  const overviewBlock = (
    <TimesheetOverviewScreen
      slug={slug}
      user={user}
      router={router}
      timesheetWindow={timesheetWindow}
      setTimesheetWindow={setTimesheetWindow}
      timesheetRoleFilter={timesheetRoleFilter}
      setTimesheetRoleFilter={setTimesheetRoleFilter}
      timesheetSearch={timesheetSearch}
      setTimesheetSearch={setTimesheetSearch}
      attendanceRows={attendanceRows}
      timesheetDays={timesheetDays}
      recordRouteTab={recordRouteTab}
      providerFilterOptions={providerFilterOptions}
      recordProviderFilter={recordProviderFilter}
      setRecordProviderFilter={setRecordProviderFilter}
      recordSearch={recordSearch}
      setRecordSearch={setRecordSearch}
      recordFromDate={recordFromDate}
      setRecordFromDate={setRecordFromDate}
      recordToDate={recordToDate}
      setRecordToDate={setRecordToDate}
      recordDepartmentFilter={recordDepartmentFilter}
      setRecordDepartmentFilter={setRecordDepartmentFilter}
      recordDepartmentOptions={recordDepartmentOptions}
      recordStatusFilter={recordStatusFilter}
      setRecordStatusFilter={setRecordStatusFilter}
      token={token}
      recordExportQuery={recordExportQuery}
      filteredRecords={filteredRecords}
      attendanceLoading={attendanceLoading}
      attendanceError={attendanceError}
      onRetryAttendance={onRetryAttendance}
      showRoleFilter={isAdminOrHrRole(user?.role)}
      roleFilterOptions={roleFilterOptions}
      showAdminSegments={isAdmin}
      headerTitle={user?.role === 'Team Leader' ? 'Team attendance' : 'Attendance Overview'}
    />
  );

  // Admin: CRM Overview / Logs / Manual via segmented header
  if (isAdmin) {
    return (
      <SafeAreaView style={ts.safe} edges={['top']}>
        <DashboardTopbar />
        <KeyboardAwareScrollView contentContainerStyle={ts.scroll}>
          <AnimatedBlock delay={0}>{overviewBlock}</AnimatedBlock>
        </KeyboardAwareScrollView>
      </SafeAreaView>
    );
  }

  // HR: CRM tabs — My attendance | Overview | Attendance Logs | Manual TimeSheet
  if (isHr) {
    const showMy = slug === 'timesheet' && subTab === 'my-attendance';
    return (
      <SafeAreaView style={ts.safe} edges={['top']}>
        <DashboardTopbar />
        <KeyboardAwareScrollView contentContainerStyle={ts.scroll}>
          <AnimatedBlock delay={0}>
            <Text style={ts.screenTitle}>Timesheet</Text>
            <TimesheetRoleNav
              user={user}
              slug={slug}
              router={router}
              styles={styles}
              tlTimesheetTab={subTab}
              setTlTimesheetTab={setTlTimesheetTab}
            />
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
            {showMy ? (
              <TimesheetTlPanel
                ctx={{
                  ...ctx,
                  tlTimesheetTab: 'my-attendance',
                  tlMyAttendanceSummary: employeeAttendanceSummary,
                  tlMyAttendanceLogs: employeeAttendanceLogs,
                  tlProfile: employeeProfile,
                }}
                router={router}
              />
            ) : (
              overviewBlock
            )}
          </AnimatedBlock>
        </KeyboardAwareScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={ts.safe} edges={['top']}>
      <DashboardTopbar />
      <KeyboardAwareScrollView contentContainerStyle={ts.scroll}>
        <AnimatedBlock delay={0}>
          {user?.role === 'Team Leader' ? (
            <TimesheetRoleNav
              user={user}
              slug={slug}
              router={router}
              styles={styles}
              tlTimesheetTab={tlTimesheetTab}
              setTlTimesheetTab={setTlTimesheetTab}
            />
          ) : (
            <Text style={ts.screenTitle}>Timesheet</Text>
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

          {!isRecordsOnlyRoute ? (
            <>
              {user?.role === 'Team Leader' ? <TimesheetTlPanel ctx={ctx} router={router} /> : null}

              {user?.role === 'Employee' ? (
                <TimesheetTlPanel
                  ctx={{
                    ...ctx,
                    tlTimesheetTab: 'my-attendance',
                    tlMyAttendanceSummary: employeeAttendanceSummary,
                    tlMyAttendanceLogs: employeeAttendanceLogs,
                    tlProfile: employeeProfile,
                  }}
                  router={router}
                />
              ) : null}
            </>
          ) : null}
        </AnimatedBlock>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
