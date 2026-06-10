import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { KeyboardAwareScrollView } from '@/components/ui/keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedBlock } from '@/components/ui/animated-block';
import { DashboardTopbar } from '@/components/dashboard/topbar';
import { useTheme } from '@/context/theme-context';
import { isAdminOrHrRole } from '@/utils/roles';

import {
  TimesheetOverviewScreen,
  timesheetRoleFilterOptionsForViewer,
  useShowTimesheetOverviewUi,
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

  const useReferenceUi = useShowTimesheetOverviewUi(user, slug);
  const isRecordsOnlyRoute = slug === 'clock-records' || slug === 'manual-records';
  const roleFilterOptions = timesheetRoleFilterOptionsForViewer(user?.role);

  if (useReferenceUi) {
    return (
      <SafeAreaView style={ts.safe} edges={['top']}>
        <DashboardTopbar />
        <KeyboardAwareScrollView contentContainerStyle={ts.scroll}>
          <AnimatedBlock delay={0}>
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
          />
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

        {user?.role !== 'Team Leader' ? (
          <TimesheetRoleNav
            user={user}
            slug={slug}
            router={router}
            styles={styles}
            tlTimesheetTab={tlTimesheetTab}
            setTlTimesheetTab={setTlTimesheetTab}
          />
        ) : null}

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
              />
            ) : null}
          </>
        ) : null}
        </AnimatedBlock>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
