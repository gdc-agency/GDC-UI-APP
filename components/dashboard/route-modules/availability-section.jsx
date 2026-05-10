import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardTopbar } from '@/components/dashboard/topbar';
import { isAdminRole } from '@/utils/roles';

export function AvailabilitySection({ styles, ctx }) {
  const {
    user,
    setAvailabilityRoleFilter,
    availabilityRoleFilter,
    setAvailabilityStatusFilter,
    availabilityStatusFilter,
    availabilitySearch,
    setAvailabilitySearch,
    filteredAvailabilityUsers,
    updateMyAvailabilityStatus,
    setHoveredAvailabilityStatus,
    hoveredAvailabilityStatus,
    currentAvailabilityStatus,
    myAvailabilitySummary,
    openAvailabilityDatePicker,
    availabilityFromDate,
    availabilityToDate,
    filteredMyAvailabilityLog,
  } = ctx;

  const isAdminBoard = isAdminRole(user?.role);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <DashboardTopbar />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <MaterialCommunityIcons name="calendar-clock-outline" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>{isAdminBoard ? 'Team Status Board' : 'My Availability'}</Text>
            {isAdminBoard ? <Text style={styles.heroSub}>Website-style live roster with quick status filters.</Text> : null}
          </View>
        </View>

        {isAdminBoard ? (
          <>
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Filters</Text>
              <Text style={styles.panelSub}>Filter by role, status, or search member.</Text>
              <View style={styles.chipRow}>
                {['all', 'Employee', 'HR', 'Team Leader'].map((role) => (
                  <Pressable
                    key={role}
                    onPress={() => setAvailabilityRoleFilter(role)}
                    style={[styles.filterChip, availabilityRoleFilter === role && styles.filterChipActive]}>
                    <Text style={[styles.filterChipText, availabilityRoleFilter === role && styles.filterChipTextActive]}>
                      {role === 'all' ? 'All roles' : role}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={[styles.chipRow, { marginTop: 8 }]}>
                {['all', 'Available', 'Unavailable', 'Leave'].map((st) => (
                  <Pressable
                    key={st}
                    onPress={() => setAvailabilityStatusFilter(st)}
                    style={[styles.filterChip, availabilityStatusFilter === st && styles.filterChipActive]}>
                    <Text style={[styles.filterChipText, availabilityStatusFilter === st && styles.filterChipTextActive]}>
                      {st === 'Available' ? 'Present' : st === 'Unavailable' ? 'Absent' : st}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={[styles.searchWrap, { marginTop: 10 }]}>
                <MaterialCommunityIcons name="magnify" size={18} color="#94a3b8" />
                <TextInput
                  value={availabilitySearch}
                  onChangeText={setAvailabilitySearch}
                  placeholder="Search name, GDC ID, team..."
                  placeholderTextColor="#94a3b8"
                  style={styles.searchInput}
                />
              </View>
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelTitle}>People</Text>
              {filteredAvailabilityUsers.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>No people match filters.</Text>
                </View>
              ) : (
                filteredAvailabilityUsers.map((member) => (
                  <View key={member.gdcId} style={styles.availabilityCard}>
                    <View style={styles.availabilityTop}>
                      <View style={styles.availabilityAvatar}>
                        <Text style={styles.availabilityAvatarText}>{member.name.slice(0, 1)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.availabilityName}>{member.name}</Text>
                        <Text style={styles.availabilityMeta}>{member.team} - {member.role}</Text>
                      </View>
                      <View
                        style={[
                          styles.availabilityStatusPill,
                          member.status === 'Available'
                            ? styles.availabilityPresent
                            : member.status === 'Unavailable'
                              ? styles.availabilityAbsent
                              : styles.availabilityLeave,
                        ]}>
                        <Text style={styles.availabilityStatusText}>
                          {member.status === 'Available' ? 'Present' : member.status === 'Unavailable' ? 'Absent' : 'Leave'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.availabilityBottom}>
                      <Text style={styles.availabilityId}>{member.gdcId}</Text>
                      <Text style={[styles.availabilityActivity, member.active ? styles.timesheetOnTime : styles.timesheetLate]}>
                        {member.active ? 'Working' : 'Away'}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        ) : (
          <>
            <View style={styles.panel}>
              <View style={styles.currentStatusTitleRow}>
                <MaterialCommunityIcons name="pulse" size={24} color="#10b981" />
                <Text style={styles.currentStatusTitleText}>Current status</Text>
              </View>
              <View style={styles.currentStatusChipRow}>
                {[
                  ['Present', 'Available'],
                  ['Absent', 'Unavailable'],
                  ['Leave', 'Leave'],
                ].map(([label, value]) => (
                  <Pressable
                    key={label}
                    onPress={() => updateMyAvailabilityStatus(value)}
                    onHoverIn={() => setHoveredAvailabilityStatus(value)}
                    onHoverOut={() => setHoveredAvailabilityStatus(null)}
                    style={[
                      styles.currentStatusChip,
                      hoveredAvailabilityStatus === value && styles.currentStatusChipHover,
                      currentAvailabilityStatus === value &&
                        (value === 'Available'
                          ? styles.currentStatusChipPresent
                          : value === 'Unavailable'
                            ? styles.currentStatusChipAbsent
                            : styles.currentStatusChipLeave),
                    ]}>
                    <Text
                      numberOfLines={1}
                      style={[styles.currentStatusChipText, currentAvailabilityStatus === value && styles.currentStatusChipTextActive]}>
                      {label.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Attendance Log</Text>
              <View style={styles.availabilitySummaryGrid}>
                <View style={[styles.availabilitySummaryCard, styles.availabilitySummaryPresent]}>
                  <Text style={styles.availabilitySummaryLabel}>Present</Text>
                  <Text style={styles.availabilitySummaryValue}>{myAvailabilitySummary.present}</Text>
                </View>
                <View style={[styles.availabilitySummaryCard, styles.availabilitySummaryAbsent]}>
                  <Text style={styles.availabilitySummaryLabel}>Absent</Text>
                  <Text style={styles.availabilitySummaryValue}>{myAvailabilitySummary.absent}</Text>
                </View>
                <View style={[styles.availabilitySummaryCard, styles.availabilitySummaryLeave]}>
                  <Text style={styles.availabilitySummaryLabel}>Leave</Text>
                  <Text style={styles.availabilitySummaryValue}>{myAvailabilitySummary.leave}</Text>
                </View>
                <View style={[styles.availabilitySummaryCard, styles.availabilitySummaryHours]}>
                  <Text style={styles.availabilitySummaryLabel}>T.HOURS</Text>
                  <Text style={styles.availabilitySummaryValue}>{myAvailabilitySummary.totalHours.toFixed(2)}</Text>
                </View>
              </View>
              <View style={styles.dateFilterRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recordFieldLabel}>From</Text>
                  <Pressable style={styles.dateSelectField} onPress={() => openAvailabilityDatePicker('from')}>
                    <Text style={styles.dateSelectText}>{availabilityFromDate || 'Select date'}</Text>
                    <View style={styles.dateSelectIconWrap}>
                      <MaterialCommunityIcons name="calendar-month-outline" size={16} color="#4f46e5" />
                    </View>
                  </Pressable>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recordFieldLabel}>To</Text>
                  <Pressable style={styles.dateSelectField} onPress={() => openAvailabilityDatePicker('to')}>
                    <Text style={styles.dateSelectText}>{availabilityToDate || 'Select date'}</Text>
                    <View style={styles.dateSelectIconWrap}>
                      <MaterialCommunityIcons name="calendar-month-outline" size={16} color="#4f46e5" />
                    </View>
                  </Pressable>
                </View>
              </View>
              <View style={{ marginTop: 8 }}>
                {filteredMyAvailabilityLog.map((row) => (
                  <View
                    key={row.date}
                    style={[
                      styles.availabilityLogRow,
                      row.status === 'Present'
                        ? styles.availabilityLogPresent
                        : row.status === 'Leave'
                          ? styles.availabilityLogLeave
                          : styles.availabilityLogAbsent,
                    ]}>
                    <View style={styles.availabilityLogHeader}>
                      <View style={styles.availabilityDateBadge}>
                        <Text style={styles.availabilityDateDay}>{new Date(`${row.date}T00:00:00`).toLocaleDateString([], { weekday: 'short' })}</Text>
                        <Text style={styles.availabilityDateNumber}>{new Date(`${row.date}T00:00:00`).getDate()}</Text>
                        <Text style={styles.availabilityDateMonth}>{new Date(`${row.date}T00:00:00`).toLocaleDateString([], { month: 'short' })}</Text>
                      </View>
                      <View style={styles.availabilityStatusBlock}>
                        <View
                          style={[
                            styles.availabilityStatusPill,
                            row.status === 'Present' ? styles.availabilityPresent : row.status === 'Leave' ? styles.availabilityLeave : styles.availabilityAbsent,
                          ]}>
                          <Text style={styles.availabilityStatusText}>{row.status === 'Present' ? 'ACTIVE' : row.status.toUpperCase()}</Text>
                        </View>
                        <Text style={styles.availabilityTodayText}>TODAY</Text>
                      </View>
                    </View>
                    <View style={styles.availabilityMetricsGrid}>
                      <View style={styles.availabilityMetricPill}>
                        <Text style={styles.availabilityMetricLabel}>IN</Text>
                        <Text style={styles.availabilityMetricValue}>{row.in}</Text>
                      </View>
                      <View style={styles.availabilityMetricPill}>
                        <Text style={styles.availabilityMetricLabel}>OUT</Text>
                        <Text style={styles.availabilityMetricValue}>{row.out}</Text>
                      </View>
                      <View style={styles.availabilityMetricPill}>
                        <Text style={styles.availabilityMetricLabel}>BREAKS</Text>
                        <Text style={styles.availabilityMetricValue}>{row.breaks}</Text>
                      </View>
                      <View style={[styles.availabilityMetricPill, styles.availabilityHoursPill]}>
                        <Text style={styles.availabilityMetricLabel}>HOURS</Text>
                        <Text style={[styles.availabilityMetricValue, styles.availabilityLogHours]}>{row.hours.toFixed(2)}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
