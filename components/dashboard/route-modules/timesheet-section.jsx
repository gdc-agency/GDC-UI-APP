import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import React from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardTopbar } from '@/components/dashboard/topbar';
import { isAdminRole } from '@/utils/roles';

import { TimesheetOverviewScreen, useShowTimesheetOverviewUi } from './timesheet-overview-screen';
import { TimesheetPageHeader } from './timesheet-page-header';
import { TimesheetUserAvatar } from './timesheet-user-avatar';
import { TsColors, statusDotStyle, timesheetStyles as ts } from './timesheet-styles';

function StatusPill({ code }) {
  const s = statusDotStyle(code);
  return (
    <View style={[ts.statusDot, { backgroundColor: s.bg }]}>
      <Text style={ts.statusDotText}>{s.label}</Text>
    </View>
  );
}

export function TimesheetSection({ styles, ctx }) {
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
    tlRecordSearch,
    setTlRecordSearch,
    tlTeamRecordRows,
    employeeAttendanceSummary,
    employeeProfile,
    employeeAttendanceLogs,
    employeeAttendanceEntry,
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
  const isTlTimesheetHome = user?.role === 'Team Leader' && !isRecordsOnlyRoute;
  const isEmployeeTimesheetHome = user?.role === 'Employee' && !isRecordsOnlyRoute;

  if (useReferenceUi) {
    return (
      <SafeAreaView style={ts.safe} edges={['top']}>
        <DashboardTopbar />
        <ScrollView contentContainerStyle={ts.scroll} showsVerticalScrollIndicator={false}>
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
            showRoleFilter={isAdminRole(user?.role)}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={ts.safe} edges={['top']}>
      <DashboardTopbar />
      <ScrollView contentContainerStyle={ts.scroll} showsVerticalScrollIndicator={false}>
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

        {!isRecordsOnlyRoute ? (
          <>
            {user?.role === 'Team Leader' ? (
              <>
                <View style={[styles.panel, styles.tlTimesheetPanel]}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tlTimesheetTabs} style={styles.tlTimesheetTabsScroll}>
                    {[
                      ['my-attendance', 'My attendance'],
                      ['team-overview', 'Team overview'],
                      ['team-records', 'Team records'],
                    ].map(([tabId, label]) => (
                      <Pressable key={tabId} onPress={() => setTlTimesheetTab(tabId)} style={[styles.tlTimesheetTabBtn, tlTimesheetTab === tabId && styles.tlTimesheetTabBtnActive]}>
                        <Text numberOfLines={1} style={[styles.tlTimesheetTabText, tlTimesheetTab === tabId && styles.tlTimesheetTabTextActive]}>
                          {label}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                  <View style={[styles.tlTimesheetWindowRow, { marginTop: 10 }]}>
                    <View style={styles.chipRow}>
                      {[
                        ['today', 'Today'],
                        ['7d', '7 days'],
                        ['30d', '30 days'],
                      ].map(([key, label]) => (
                        <Pressable key={key} onPress={() => setTimesheetWindow(key)} style={[styles.filterChip, timesheetWindow === key && styles.filterChipActive]}>
                          <Text style={[styles.filterChipText, timesheetWindow === key && styles.filterChipTextActive]}>{label}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                </View>

                {tlTimesheetTab === 'my-attendance' ? (
                  <>
                    <View style={ts.statsRow}>
                      <View style={ts.statCard}>
                        <Text style={ts.statLabel}>Total hours</Text>
                        <Text style={ts.statValue}>{tlMyAttendanceSummary.totalHours.toFixed(1)}</Text>
                      </View>
                      <View style={ts.statCard}>
                        <Text style={ts.statLabel}>Overtime</Text>
                        <Text style={ts.statValue}>{tlMyAttendanceSummary.overtime.toFixed(1)}</Text>
                      </View>
                      <View style={ts.statCard}>
                        <Text style={ts.statLabel}>Late marks</Text>
                        <Text style={ts.statValue}>{tlMyAttendanceSummary.lateMarks}</Text>
                      </View>
                    </View>
                    <View style={[styles.panel, styles.tlTimesheetPanel]}>
                      <Text style={styles.panelTitle}>Clock history</Text>
                      {timesheetWindow !== 'today' && tlMyAttendanceEntry ? (
                        <View style={ts.employeeCard}>
                          <View style={ts.employeeHead}>
                            <View style={ts.avatar}>
                              <Text style={ts.avatarText}>{tlMyAttendanceEntry.name?.slice(0, 2)?.toUpperCase()}</Text>
                            </View>
                            <View style={ts.employeeMeta}>
                              <Text style={ts.employeeName}>{tlMyAttendanceEntry.name}</Text>
                              <Text style={ts.employeeRole}>{tlMyAttendanceEntry.role}</Text>
                            </View>
                          </View>
                          {timesheetWindow === '7d' ? (
                            <View style={[ts.expandedBody, { borderTopWidth: 0 }]}>
                              <View style={ts.timelineRow}>
                                {tlMyAttendanceEntry.cells.map((cell, idx) => (
                                  <View key={`tl-self-${timesheetDays[idx]}`} style={ts.timelineCol}>
                                    <Text style={ts.timelineDate}>{timesheetDays[idx]?.slice(8)}</Text>
                                    <StatusPill code={cell} />
                                  </View>
                                ))}
                              </View>
                            </View>
                          ) : null}
                        </View>
                      ) : (
                        tlMyAttendanceLogs.map((entry) => (
                          <View key={entry.id} style={ts.recordCard}>
                            <Text style={ts.employeeName}>{tlProfile?.name}</Text>
                            <Text style={ts.employeeGdc}>{entry.date}</Text>
                            <View style={ts.clockRow}>
                              <Text style={ts.clockLbl}>IN {entry.checkIn}</Text>
                              <Text style={ts.clockLbl}>OUT {entry.checkOut}</Text>
                            </View>
                          </View>
                        ))
                      )}
                    </View>
                  </>
                ) : null}

                {tlTimesheetTab === 'team-overview' ? (
                  <View style={[styles.panel, styles.tlTimesheetPanel]}>
                    <View style={ts.searchWrap}>
                      <MaterialCommunityIcons name="magnify" size={18} color={TsColors.textMuted} />
                      <TextInput value={tlTeamSearch} onChangeText={setTlTeamSearch} placeholder="Search team" placeholderTextColor="#9CA3AF" style={ts.searchInput} />
                    </View>
                    {tlTeamOverviewRows.map((entry) => (
                      <View key={entry.gdcId} style={ts.employeeCard}>
                        <View style={ts.employeeHead}>
                          <TimesheetUserAvatar name={entry.name} avatarUrl={entry.avatarUrl} />
                          <View style={ts.employeeMeta}>
                            <Text style={ts.employeeName}>{entry.name}</Text>
                            <Text style={ts.employeeRole}>{entry.role}</Text>
                          </View>
                          <Text style={ts.employeeGdc}>{entry.gdcId}</Text>
                        </View>
                        {timesheetWindow === '7d' ? (
                          <View style={ts.expandedBody}>
                            <View style={ts.timelineRow}>
                              {entry.cells.map((cell, idx) => (
                                <View key={`${entry.gdcId}-tl-${timesheetDays[idx]}`} style={ts.timelineCol}>
                                  <StatusPill code={cell} />
                                </View>
                              ))}
                            </View>
                          </View>
                        ) : null}
                      </View>
                    ))}
                  </View>
                ) : null}

                {tlTimesheetTab === 'team-records' ? (
                  <View style={[styles.panel, styles.tlTimesheetPanel]}>
                    <View style={ts.searchWrap}>
                      <MaterialCommunityIcons name="magnify" size={18} color={TsColors.textMuted} />
                      <TextInput value={tlRecordSearch} onChangeText={setTlRecordSearch} placeholder="GDC-ID search" placeholderTextColor="#9CA3AF" style={ts.searchInput} />
                    </View>
                    {tlTeamRecordRows.map((entry) => (
                      <View key={entry.id} style={ts.recordCard}>
                        <Text style={ts.employeeName}>{entry.user?.name}</Text>
                        <Text style={ts.employeeGdc}>{entry.date}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </>
            ) : user?.role === 'Employee' ? (
              <>
                <View style={styles.chipRow}>
                  {[
                    ['today', 'Today'],
                    ['7d', '7 days'],
                    ['30d', '30 days'],
                  ].map(([key, label]) => (
                    <Pressable key={key} onPress={() => setTimesheetWindow(key)} style={[styles.filterChip, timesheetWindow === key && styles.filterChipActive]}>
                      <Text style={[styles.filterChipText, timesheetWindow === key && styles.filterChipTextActive]}>{label}</Text>
                    </Pressable>
                  ))}
                </View>
                <View style={ts.statsRow}>
                  <View style={ts.statCard}>
                    <Text style={ts.statLabel}>Total hours</Text>
                    <Text style={ts.statValue}>{employeeAttendanceSummary.totalHours.toFixed(1)}</Text>
                  </View>
                  <View style={ts.statCard}>
                    <Text style={ts.statLabel}>Late</Text>
                    <Text style={ts.statValue}>{employeeAttendanceSummary.lateMarks}</Text>
                  </View>
                </View>
                <View style={[styles.panel, styles.tlTimesheetPanel]}>
                  <Text style={styles.panelTitle}>My attendance</Text>
                  {employeeAttendanceLogs.map((entry) => (
                    <View key={entry.id} style={ts.recordCard}>
                      <Text style={ts.employeeName}>{employeeProfile?.name}</Text>
                      <Text style={ts.employeeGdc}>{entry.date}</Text>
                      <View style={ts.clockRow}>
                        <Text style={ts.clockVal}>IN {entry.checkIn}</Text>
                        <Text style={ts.clockVal}>OUT {entry.checkOut}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
