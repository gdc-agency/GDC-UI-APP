import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardTopbar } from '@/components/dashboard/topbar';
import { isAdminRole } from '@/utils/roles';

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
    filteredRecords,
  } = ctx;

  const isRecordsOnlyRoute = slug === 'clock-records' || slug === 'manual-records';
  const isTlTimesheetHome = user?.role === 'Team Leader' && !isRecordsOnlyRoute;
  const isEmployeeTimesheetHome = user?.role === 'Employee' && !isRecordsOnlyRoute;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <DashboardTopbar />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <MaterialCommunityIcons name="clock-time-four-outline" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>{isRecordsOnlyRoute ? 'Timesheet Records' : user?.role === 'Team Leader' ? 'TL Timesheet' : 'Timesheet'}</Text>
          </View>
        </View>

        {!isTlTimesheetHome && !isEmployeeTimesheetHome ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Timesheet Sections</Text>
            <View style={styles.chipRow}>
              {[
                ['timesheet', 'Attendance Overview'],
                ['clock-records', 'Clock Record'],
                ['manual-records', 'Manual Record'],
              ].map(([tabId, label]) => (
                <Pressable key={tabId} onPress={() => router.push(`/dashboard/(tabs)/route/${tabId}`)} style={[styles.filterChip, slug === tabId && styles.filterChipActive]}>
                  <Text style={[styles.filterChipText, slug === tabId && styles.filterChipTextActive]}>{label}</Text>
                </Pressable>
              ))}
            </View>
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
                    <View style={styles.tlSummaryGrid}>
                      <View style={[styles.tlSummaryCard, styles.tlSummaryCardHours]}>
                        <View style={styles.tlSummaryHead}>
                          <View style={styles.tlSummaryIconWrap}>
                            <MaterialCommunityIcons name="clock-time-four-outline" size={14} color="#2563eb" />
                          </View>
                          <Text style={styles.tlSummaryLabel}>T.HOURS</Text>
                        </View>
                        <Text style={styles.tlSummaryValue}>{tlMyAttendanceSummary.totalHours.toFixed(1)}</Text>
                      </View>
                      <View style={[styles.tlSummaryCard, styles.tlSummaryCardOvertime]}>
                        <View style={styles.tlSummaryHead}>
                          <View style={styles.tlSummaryIconWrap}>
                            <MaterialCommunityIcons name="timer-plus-outline" size={14} color="#7c3aed" />
                          </View>
                          <Text style={styles.tlSummaryLabel}>OVERTIME</Text>
                        </View>
                        <Text style={styles.tlSummaryValue}>{tlMyAttendanceSummary.overtime.toFixed(1)}</Text>
                      </View>
                      <View style={[styles.tlSummaryCard, styles.tlSummaryCardLate]}>
                        <View style={styles.tlSummaryHead}>
                          <View style={styles.tlSummaryIconWrap}>
                            <MaterialCommunityIcons name="alert-circle-outline" size={14} color="#e11d48" />
                          </View>
                          <View>
                            <Text style={styles.tlSummaryLabel}>LATE</Text>
                            <Text style={styles.tlSummaryLabel}>MARKS</Text>
                          </View>
                        </View>
                        <Text style={styles.tlSummaryValue}>{tlMyAttendanceSummary.lateMarks}</Text>
                      </View>
                    </View>
                    <Text style={styles.tlGdcNote}>Employee GDC-ID: GDC-12002124-61</Text>
                    <View style={[styles.panel, styles.tlTimesheetPanel]}>
                      <Text style={styles.panelTitle}>Clock history</Text>
                      <Text style={styles.panelSub}>{tlMyAttendanceLogs.length} record(s)</Text>
                      {timesheetWindow !== 'today' && tlMyAttendanceEntry ? (
                        <View style={styles.timesheetCard}>
                          <View style={styles.timesheetTopRow}>
                            <Text style={styles.timesheetName}>{tlMyAttendanceEntry.name}</Text>
                            <Text style={styles.timesheetDate}>{tlMyAttendanceEntry.gdcId}</Text>
                          </View>
                          <Text style={styles.timesheetTeam}>{tlMyAttendanceEntry.role} - {tlMyAttendanceEntry.team}</Text>
                          {timesheetWindow === '7d' ? (
                            <View style={styles.weekCellRow}>
                              {tlMyAttendanceEntry.cells.map((cell, idx) => (
                                <View key={`${tlMyAttendanceEntry.gdcId}-self-${timesheetDays[idx]}`} style={styles.weekCell}>
                                  <Text style={styles.weekCellDay}>{timesheetDays[idx].slice(8)}</Text>
                                  <View style={styles.statusCodePill}>
                                    <Text style={styles.statusCodeText}>{cell}</Text>
                                  </View>
                                </View>
                              ))}
                            </View>
                          ) : (
                            <View style={styles.timesheetMetaRow}>
                              <Text style={styles.timesheetMeta}>P: {tlMyAttendanceEntry.counts.present}</Text>
                              <Text style={[styles.timesheetMeta, styles.timesheetLate]}>L: {tlMyAttendanceEntry.counts.late}</Text>
                              <Text style={styles.timesheetMeta}>A: {tlMyAttendanceEntry.counts.absent}</Text>
                            </View>
                          )}
                        </View>
                      ) : tlMyAttendanceLogs.length === 0 ? (
                        <View style={styles.emptyBox}>
                          <Text style={styles.emptyText}>No records in selected window.</Text>
                        </View>
                      ) : (
                        tlMyAttendanceLogs.map((entry) => (
                          <View key={entry.id} style={styles.timesheetCard}>
                            <View style={styles.timesheetTopRow}>
                              <Text style={styles.timesheetName}>{tlProfile?.name || 'Team Leader'}</Text>
                              <Text style={styles.timesheetDate}>{tlProfile?.gdcId || 'GDC-12002124-61'}</Text>
                            </View>
                            <Text style={styles.timesheetTeam}>{tlProfile?.role || 'Team Leader'} - {tlProfile?.team || 'Alpha Team'}</Text>
                            <View style={styles.timesheetTopRow}>
                              <Text style={styles.timesheetDate}>{entry.date}</Text>
                              <View style={styles.statusCodePill}>
                                <Text style={styles.statusCodeText}>{entry.status}</Text>
                              </View>
                            </View>
                            <View style={styles.timesheetClockRow}>
                              <View style={styles.timesheetClockPill}>
                                <Text style={styles.timesheetClockLabel}>IN</Text>
                                <Text style={styles.timesheetClockValue}>{entry.checkIn}</Text>
                              </View>
                              <MaterialCommunityIcons name="arrow-right" size={16} color="#94a3b8" />
                              <View style={styles.timesheetClockPill}>
                                <Text style={styles.timesheetClockLabel}>OUT</Text>
                                <Text style={styles.timesheetClockValue}>{entry.checkOut}</Text>
                              </View>
                            </View>
                            <Text style={styles.timesheetMeta}>Hours: {entry.hours.toFixed(2)}</Text>
                          </View>
                        ))
                      )}
                    </View>
                  </>
                ) : null}

                {tlTimesheetTab === 'team-overview' ? (
                  <View style={[styles.panel, styles.tlTimesheetPanel]}>
                    <Text style={styles.panelTitle}>Attendance overview</Text>
                    <View style={[styles.searchWrap, { marginTop: 10 }]}>
                      <MaterialCommunityIcons name="magnify" size={18} color="#94a3b8" />
                      <TextInput value={tlTeamSearch} onChangeText={setTlTeamSearch} placeholder="Team member ID, code, or name" placeholderTextColor="#94a3b8" style={styles.searchInput} />
                    </View>
                    <View style={[styles.chipRow, { marginTop: 10 }]}>
                      <Text style={styles.legendTitle}>Legend:</Text>
                      <View style={[styles.statusCodePill, { backgroundColor: '#dcfce7', borderColor: '#86efac' }]}>
                        <Text style={[styles.statusCodeText, { color: '#166534' }]}>P</Text>
                      </View>
                      <View style={[styles.statusCodePill, { backgroundColor: '#fef9c3', borderColor: '#fde68a' }]}>
                        <Text style={[styles.statusCodeText, { color: '#854d0e' }]}>L</Text>
                      </View>
                      <View style={[styles.statusCodePill, { backgroundColor: '#e2e8f0', borderColor: '#cbd5e1' }]}>
                        <Text style={[styles.statusCodeText, { color: '#334155' }]}>A</Text>
                      </View>
                    </View>
                    {tlTeamOverviewRows.length === 0 ? (
                      <View style={styles.emptyBox}>
                        <Text style={styles.emptyText}>No team members found.</Text>
                      </View>
                    ) : (
                      tlTeamOverviewRows.map((entry) => (
                        <View key={entry.gdcId} style={styles.timesheetCard}>
                          <View style={styles.timesheetTopRow}>
                            <Text style={styles.timesheetName}>{entry.name}</Text>
                            <Text style={styles.timesheetDate}>{entry.gdcId}</Text>
                          </View>
                          <Text style={styles.timesheetTeam}>{entry.role} - {entry.team}</Text>
                          {timesheetWindow === 'today' ? (
                            <View style={styles.timesheetStatusRow}>
                              <Text style={styles.timesheetMeta}>Today:</Text>
                              <View style={styles.statusCodePill}>
                                <Text style={styles.statusCodeText}>{entry.cells[0]}</Text>
                              </View>
                            </View>
                          ) : null}
                          {timesheetWindow === '7d' ? (
                            <View style={styles.weekCellRow}>
                              {entry.cells.map((cell, idx) => (
                                <View key={`${entry.gdcId}-tl-${timesheetDays[idx]}`} style={styles.weekCell}>
                                  <Text style={styles.weekCellDay}>{timesheetDays[idx].slice(8)}</Text>
                                  <View style={styles.statusCodePill}>
                                    <Text style={styles.statusCodeText}>{cell}</Text>
                                  </View>
                                </View>
                              ))}
                            </View>
                          ) : null}
                          {timesheetWindow === '30d' ? (
                            <View style={styles.timesheetMetaRow}>
                              <Text style={styles.timesheetMeta}>P: {entry.counts.present}</Text>
                              <Text style={[styles.timesheetMeta, styles.timesheetLate]}>L: {entry.counts.late}</Text>
                              <Text style={styles.timesheetMeta}>A: {entry.counts.absent}</Text>
                            </View>
                          ) : null}
                        </View>
                      ))
                    )}
                  </View>
                ) : null}

                {tlTimesheetTab === 'team-records' ? (
                  <View style={[styles.panel, styles.tlTimesheetPanel]}>
                    <Text style={styles.panelTitle}>Global attendance log</Text>
                    <View style={[styles.searchWrap, { marginTop: 10 }]}>
                      <MaterialCommunityIcons name="magnify" size={18} color="#94a3b8" />
                      <TextInput value={tlRecordSearch} onChangeText={setTlRecordSearch} placeholder="GDC-ID search" placeholderTextColor="#94a3b8" style={styles.searchInput} />
                    </View>
                    <Text style={styles.panelSub}>{tlTeamRecordRows.length} filtered rows</Text>
                    {timesheetWindow !== 'today' ? (
                      tlTeamOverviewRows.length === 0 ? (
                        <View style={styles.emptyBox}>
                          <Text style={styles.emptyText}>No team records in selected window.</Text>
                        </View>
                      ) : (
                        tlTeamOverviewRows.map((entry) => (
                          <View key={`record-${entry.gdcId}`} style={styles.timesheetCard}>
                            <View style={styles.timesheetTopRow}>
                              <Text style={styles.timesheetName}>{entry.name}</Text>
                              <Text style={styles.timesheetDate}>{entry.gdcId}</Text>
                            </View>
                            <Text style={styles.timesheetTeam}>{entry.role} - {entry.team}</Text>
                            {timesheetWindow === '7d' ? (
                              <View style={styles.weekCellRow}>
                                {entry.cells.map((cell, idx) => (
                                  <View key={`${entry.gdcId}-record-${timesheetDays[idx]}`} style={styles.weekCell}>
                                    <Text style={styles.weekCellDay}>{timesheetDays[idx].slice(8)}</Text>
                                    <View style={styles.statusCodePill}>
                                      <Text style={styles.statusCodeText}>{cell}</Text>
                                    </View>
                                  </View>
                                ))}
                              </View>
                            ) : (
                              <View style={styles.timesheetMetaRow}>
                                <Text style={styles.timesheetMeta}>P: {entry.counts.present}</Text>
                                <Text style={[styles.timesheetMeta, styles.timesheetLate]}>L: {entry.counts.late}</Text>
                                <Text style={styles.timesheetMeta}>A: {entry.counts.absent}</Text>
                              </View>
                            )}
                          </View>
                        ))
                      )
                    ) : tlTeamRecordRows.length === 0 ? (
                      <View style={styles.emptyBox}>
                        <Text style={styles.emptyText}>No team records in selected window.</Text>
                      </View>
                    ) : (
                      tlTeamRecordRows.map((entry) => (
                        <View key={entry.id} style={styles.timesheetCard}>
                          <View style={styles.timesheetTopRow}>
                            <Text style={styles.timesheetName}>{entry.user?.name}</Text>
                            <Text style={styles.timesheetDate}>{entry.date}</Text>
                          </View>
                          <Text style={styles.timesheetId}>{entry.gdcId}</Text>
                          <Text style={styles.timesheetTeam}>{entry.user?.role} - {entry.user?.team}</Text>
                          <View style={styles.timesheetMetaRow}>
                            <Text style={styles.timesheetMeta}>Hours: {entry.hours.toFixed(2)}</Text>
                            <View style={styles.statusCodePill}>
                              <Text style={styles.statusCodeText}>{entry.status}</Text>
                            </View>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                ) : null}
              </>
            ) : user?.role === 'Employee' ? (
              <>
                <View style={[styles.panel, styles.tlTimesheetPanel]}>
                  <View style={styles.tlTimesheetTabs}>
                    <View style={[styles.tlTimesheetTabBtn, styles.tlTimesheetTabBtnActive]}>
                      <Text style={[styles.tlTimesheetTabText, styles.tlTimesheetTabTextActive]}>My attendance</Text>
                    </View>
                  </View>
                  <View style={styles.tlTimesheetWindowRow}>
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

                <View style={styles.tlSummaryGrid}>
                  <View style={[styles.tlSummaryCard, styles.tlSummaryCardHours]}>
                    <View style={styles.tlSummaryHead}>
                      <View style={styles.tlSummaryIconWrap}>
                        <MaterialCommunityIcons name="clock-time-four-outline" size={14} color="#2563eb" />
                      </View>
                      <Text style={styles.tlSummaryLabel}>T.HOURS</Text>
                    </View>
                    <Text style={styles.tlSummaryValue}>{employeeAttendanceSummary.totalHours.toFixed(1)}</Text>
                  </View>
                  <View style={[styles.tlSummaryCard, styles.tlSummaryCardOvertime]}>
                    <View style={styles.tlSummaryHead}>
                      <View style={styles.tlSummaryIconWrap}>
                        <MaterialCommunityIcons name="timer-plus-outline" size={14} color="#7c3aed" />
                      </View>
                      <Text style={styles.tlSummaryLabel}>OVERTIME</Text>
                    </View>
                    <Text style={styles.tlSummaryValue}>{employeeAttendanceSummary.overtime.toFixed(1)}</Text>
                  </View>
                  <View style={[styles.tlSummaryCard, styles.tlSummaryCardLate]}>
                    <View style={styles.tlSummaryHead}>
                      <View style={styles.tlSummaryIconWrap}>
                        <MaterialCommunityIcons name="alert-circle-outline" size={14} color="#e11d48" />
                      </View>
                      <View>
                        <Text style={styles.tlSummaryLabel}>LATE</Text>
                        <Text style={styles.tlSummaryLabel}>MARKS</Text>
                      </View>
                    </View>
                    <Text style={styles.tlSummaryValue}>{employeeAttendanceSummary.lateMarks}</Text>
                  </View>
                </View>

                <Text style={styles.tlGdcNote}>Employee GDC-ID: {employeeProfile?.gdcId || 'GDC-12002124-61'}</Text>

                <View style={[styles.panel, styles.tlTimesheetPanel]}>
                  <Text style={styles.panelTitle}>Clock history</Text>
                  <Text style={styles.panelSub}>{employeeAttendanceLogs.length} record(s)</Text>
                  {timesheetWindow !== 'today' && employeeAttendanceEntry ? (
                    <View style={styles.timesheetCard}>
                      <View style={styles.timesheetTopRow}>
                        <Text style={styles.timesheetName}>{employeeAttendanceEntry.name}</Text>
                        <Text style={styles.timesheetDate}>{employeeAttendanceEntry.gdcId}</Text>
                      </View>
                      <Text style={styles.timesheetTeam}>{employeeAttendanceEntry.role} - {employeeAttendanceEntry.team}</Text>
                      {timesheetWindow === '7d' ? (
                        <View style={styles.weekCellRow}>
                          {employeeAttendanceEntry.cells.map((cell, idx) => (
                            <View key={`${employeeAttendanceEntry.gdcId}-emp-${timesheetDays[idx]}`} style={styles.weekCell}>
                              <Text style={styles.weekCellDay}>{timesheetDays[idx].slice(8)}</Text>
                              <View style={styles.statusCodePill}>
                                <Text style={styles.statusCodeText}>{cell}</Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <View style={styles.timesheetMetaRow}>
                          <Text style={styles.timesheetMeta}>P: {employeeAttendanceEntry.counts.present}</Text>
                          <Text style={[styles.timesheetMeta, styles.timesheetLate]}>L: {employeeAttendanceEntry.counts.late}</Text>
                          <Text style={styles.timesheetMeta}>A: {employeeAttendanceEntry.counts.absent}</Text>
                        </View>
                      )}
                    </View>
                  ) : employeeAttendanceLogs.length === 0 ? (
                    <View style={styles.emptyBox}>
                      <Text style={styles.emptyText}>No records in selected window.</Text>
                    </View>
                  ) : (
                    employeeAttendanceLogs.map((entry) => (
                      <View key={entry.id} style={styles.timesheetCard}>
                        <View style={styles.timesheetTopRow}>
                          <Text style={styles.timesheetName}>{employeeProfile?.name || 'Employee'}</Text>
                          <Text style={styles.timesheetDate}>{employeeProfile?.gdcId || 'GDC-12002124-61'}</Text>
                        </View>
                        <Text style={styles.timesheetTeam}>{employeeProfile?.role || 'Employee'} - {employeeProfile?.team || 'Alpha Team'}</Text>
                        <View style={styles.timesheetTopRow}>
                          <Text style={styles.timesheetDate}>{entry.date}</Text>
                          <View style={styles.statusCodePill}>
                            <Text style={styles.statusCodeText}>{entry.status}</Text>
                          </View>
                        </View>
                        <View style={styles.timesheetClockRow}>
                          <View style={styles.timesheetClockPill}>
                            <Text style={styles.timesheetClockLabel}>IN</Text>
                            <Text style={styles.timesheetClockValue}>{entry.checkIn}</Text>
                          </View>
                          <MaterialCommunityIcons name="arrow-right" size={16} color="#94a3b8" />
                          <View style={styles.timesheetClockPill}>
                            <Text style={styles.timesheetClockLabel}>OUT</Text>
                            <Text style={styles.timesheetClockValue}>{entry.checkOut}</Text>
                          </View>
                        </View>
                        <Text style={styles.timesheetMeta}>Hours: {entry.hours.toFixed(2)}</Text>
                      </View>
                    ))
                  )}
                </View>
              </>
            ) : (
              <>
                <View style={styles.panel}>
                  <Text style={styles.panelTitle}>Attendance Window</Text>
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
                  {isAdminRole(user?.role) ? (
                    <View style={[styles.chipRow, { marginTop: 8 }]}>
                      {['all', 'Team Leader', 'HR', 'Employee'].map((role) => (
                        <Pressable key={role} onPress={() => setTimesheetRoleFilter(role)} style={[styles.filterChip, timesheetRoleFilter === role && styles.filterChipActive]}>
                          <Text style={[styles.filterChipText, timesheetRoleFilter === role && styles.filterChipTextActive]}>{role === 'all' ? 'All Roles' : role}</Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                  <View style={[styles.searchWrap, { marginTop: 10 }]}>
                    <MaterialCommunityIcons name="magnify" size={18} color="#94a3b8" />
                    <TextInput value={timesheetSearch} onChangeText={setTimesheetSearch} placeholder="Search by name, GDC_ID or team" placeholderTextColor="#94a3b8" style={styles.searchInput} />
                  </View>
                </View>

                <View style={styles.panel}>
                  <Text style={styles.panelTitle}>Attendance Matrix</Text>
                  <Text style={styles.panelSub}>{timesheetWindow === 'today' ? 'Today status' : timesheetWindow === '7d' ? 'Last 7 days (P/A/L)' : '30 days summary'}</Text>
                  {attendanceRows.length === 0 ? (
                    <View style={styles.emptyBox}>
                      <Text style={styles.emptyText}>No attendance records in selected window.</Text>
                    </View>
                  ) : timesheetWindow === 'today' ? (
                    attendanceRows.map((entry) => (
                      <View key={entry.gdcId} style={styles.timesheetCard}>
                        <View style={styles.timesheetTopRow}>
                          <Text style={styles.timesheetName}>{entry.name}</Text>
                          <Text style={styles.timesheetDate}>{entry.role}</Text>
                        </View>
                        <Text style={styles.timesheetId}>{entry.gdcId}</Text>
                        <Text style={styles.timesheetTeam}>{entry.team}</Text>
                        <View style={styles.timesheetStatusRow}>
                          <Text style={styles.timesheetMeta}>Today Status:</Text>
                          <View style={styles.statusCodePill}>
                            <Text style={styles.statusCodeText}>{entry.cells[0]}</Text>
                          </View>
                        </View>
                      </View>
                    ))
                  ) : timesheetWindow === '7d' ? (
                    attendanceRows.map((entry) => (
                      <View key={entry.gdcId} style={styles.timesheetCard}>
                        <View style={styles.timesheetTopRow}>
                          <Text style={styles.timesheetName}>{entry.name}</Text>
                          <Text style={styles.timesheetDate}>{entry.gdcId}</Text>
                        </View>
                        <Text style={styles.timesheetTeam}>
                          {entry.role} - {entry.team}
                        </Text>
                        <View style={styles.weekCellRow}>
                          {entry.cells.map((cell, idx) => (
                            <View key={`${entry.gdcId}-${timesheetDays[idx]}`} style={styles.weekCell}>
                              <Text style={styles.weekCellDay}>{timesheetDays[idx].slice(8)}</Text>
                              <View style={styles.statusCodePill}>
                                <Text style={styles.statusCodeText}>{cell}</Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      </View>
                    ))
                  ) : (
                    attendanceRows.map((entry) => (
                      <View key={entry.gdcId} style={styles.timesheetCard}>
                        <View style={styles.timesheetTopRow}>
                          <Text style={styles.timesheetName}>{entry.name}</Text>
                          <Text style={styles.timesheetDate}>{entry.gdcId}</Text>
                        </View>
                        <Text style={styles.timesheetTeam}>
                          {entry.role} - {entry.team}
                        </Text>
                        <View style={styles.timesheetMetaRow}>
                          <Text style={styles.timesheetMeta}>P: {entry.counts.present}</Text>
                          <Text style={[styles.timesheetMeta, styles.timesheetLate]}>L: {entry.counts.late}</Text>
                          <Text style={styles.timesheetMeta}>A: {entry.counts.absent}</Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              </>
            )}
          </>
        ) : null}

        {isRecordsOnlyRoute ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>{recordRouteTab === 'clock' ? 'Clock Record' : 'Manual Record'}</Text>
            <View style={styles.recordFilterGrid}>
              <View style={styles.recordField}>
                <Text style={styles.recordFieldLabel}>Role</Text>
                <View style={styles.recordChipWrap}>
                  {providerFilterOptions.map((role) => (
                    <Pressable key={role} onPress={() => setRecordProviderFilter(role)} style={[styles.filterChip, recordProviderFilter === role && styles.filterChipActive]}>
                      <Text style={[styles.filterChipText, recordProviderFilter === role && styles.filterChipTextActive]}>{role === 'all' ? 'All providers' : role}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.recordField}>
                <Text style={styles.recordFieldLabel}>Unique ID / search</Text>
                <View style={styles.searchWrap}>
                  <MaterialCommunityIcons name="magnify" size={18} color="#94a3b8" />
                  <TextInput value={recordSearch} onChangeText={setRecordSearch} placeholder="GDC-ID search" placeholderTextColor="#94a3b8" style={styles.searchInput} />
                </View>
              </View>

              <View style={styles.dateFilterRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recordFieldLabel}>From</Text>
                  <TextInput value={recordFromDate} onChangeText={setRecordFromDate} placeholder="YYYY-MM-DD" placeholderTextColor="#94a3b8" style={styles.input} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recordFieldLabel}>To</Text>
                  <TextInput value={recordToDate} onChangeText={setRecordToDate} placeholder="YYYY-MM-DD" placeholderTextColor="#94a3b8" style={styles.input} />
                </View>
              </View>
            </View>
            <Text style={styles.panelSub}>{filteredRecords.length} records</Text>
            {filteredRecords.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No records found.</Text>
              </View>
            ) : (
              filteredRecords.map((entry) => (
                <View key={entry.id} style={styles.timesheetCard}>
                  <View style={styles.timesheetTopRow}>
                    <Text style={styles.timesheetName}>{entry.user?.name}</Text>
                    <Text style={styles.timesheetDate}>{entry.date}</Text>
                  </View>
                  <Text style={styles.timesheetId}>{entry.gdcId}</Text>
                  <Text style={styles.timesheetTeam}>{entry.user?.role} - {entry.user?.team}</Text>
                  <View style={styles.timesheetClockRow}>
                    <View style={styles.timesheetClockPill}>
                      <Text style={styles.timesheetClockLabel}>IN</Text>
                      <Text style={styles.timesheetClockValue}>{entry.checkIn}</Text>
                    </View>
                    <MaterialCommunityIcons name="arrow-right" size={16} color="#94a3b8" />
                    <View style={styles.timesheetClockPill}>
                      <Text style={styles.timesheetClockLabel}>OUT</Text>
                      <Text style={styles.timesheetClockValue}>{entry.checkOut}</Text>
                    </View>
                  </View>
                  <View style={styles.timesheetMetaRow}>
                    <Text style={styles.timesheetMeta}>Hours: {entry.hours.toFixed(2)}</Text>
                    <Text style={styles.timesheetMeta}>OT: {Math.max(0, entry.hours - 8).toFixed(1)}h</Text>
                    <View style={styles.statusCodePill}>
                      <Text style={styles.statusCodeText}>{entry.status}</Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
