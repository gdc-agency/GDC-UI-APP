import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedBlock } from '@/components/ui/animated-block';
import { DashboardTopbar } from '@/components/dashboard/topbar';
import { initialsFromName } from '@/components/dashboard/route-modules/timesheet-user-avatar';
import { useTheme } from '@/context/theme-context';
import { isAdminRole } from '@/utils/roles';

const ROLE_OPTIONS = [
  { key: 'all', label: 'All Roles' },
  { key: 'Employee', label: 'Employee' },
  { key: 'HR', label: 'HR' },
  { key: 'Team Leader', label: 'Team Leader' },
];

const STATUS_OPTIONS = [
  { key: 'all', label: 'All Status' },
  { key: 'Available', label: 'Present' },
  { key: 'Unavailable', label: 'Absent' },
  { key: 'Leave', label: 'Leave' },
];

function FilterDropdown({ label, value, options, onChange, openKey, setOpenKey, fieldKey, icon }) {
  const { moduleStyles } = useTheme();
  const av = moduleStyles.availability.styles;
  const AvColors = moduleStyles.availability.colors;

  const open = openKey === fieldKey;
  const display = options.find((o) => o.key === value)?.label || value;

  return (
    <View style={[av.filterField, { zIndex: open ? 50 : 1 }]}>
      {label ? <Text style={av.filterLabel}>{label}</Text> : null}
      <Pressable style={av.filterInput} onPress={() => setOpenKey(open ? null : fieldKey)}>
        {icon ? <MaterialCommunityIcons name={icon} size={18} color={AvColors.textMuted} /> : null}
        <Text style={display ? av.filterInputText : av.filterPlaceholder} numberOfLines={1}>
          {display}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={18} color={AvColors.textMuted} />
      </Pressable>
      {open ? (
        <View style={av.dropdownMenu}>
          {options.map((opt) => (
            <Pressable
              key={opt.key}
              style={av.dropdownItem}
              onPress={() => {
                onChange(opt.key);
                setOpenKey(null);
              }}
            >
              <Text style={av.dropdownItemText}>{opt.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function AvSquareAvatar({ name, avatarUrl }) {
  const { moduleStyles } = useTheme();
  const av = moduleStyles.availability.styles;

  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={av.squareAvatarImage}
        contentFit="cover"
        recyclingKey={avatarUrl}
        accessibilityLabel={name ? `${name} profile` : 'Profile photo'}
      />
    );
  }
  return (
    <View style={av.squareAvatar}>
      <Text style={av.squareAvatarText}>{initialsFromName(name).slice(0, 1)}</Text>
    </View>
  );
}

function PersonCard({ member }) {
  const { moduleStyles } = useTheme();
  const av = moduleStyles.availability.styles;
  const AvColors = moduleStyles.availability.colors;

  const statusBadgeStyle = (label) => {
    if (label === 'Present') {
      return { box: av.statusBadgePresent, text: av.statusBadgeTextPresent };
    }
    if (label === 'Leave') {
      return { box: av.statusBadgeLeave, text: av.statusBadgeTextLeave };
    }
    return { box: av.statusBadgeAbsent, text: av.statusBadgeTextAbsent };
  };

  const activityDotColor = (activityLabel) => {
    if (activityLabel === 'Working') return AvColors.green;
    if (activityLabel === 'Leave') return AvColors.orange;
    return '#EF4444';
  };

  const attendanceLabel = member.attendanceLabel || (member.status === 'Available' ? 'Present' : member.status === 'Leave' ? 'Leave' : 'Absent');
  const badge = statusBadgeStyle(attendanceLabel);
  const activityLabel =
    member.activityLabel ||
    (attendanceLabel === 'Present' ? 'Working' : attendanceLabel === 'Leave' ? 'Leave' : 'Away');
  const activityColor = activityDotColor(activityLabel);

  return (
    <View style={av.personCard}>
      <AvSquareAvatar name={member.name} avatarUrl={member.avatarUrl} />
      <View style={av.personMain}>
        <Text style={av.personName} numberOfLines={1}>
          {member.name}
        </Text>
        <View style={av.personRoleRow}>
          <MaterialCommunityIcons name="briefcase-outline" size={14} color={AvColors.textMuted} />
          <Text style={av.personRole} numberOfLines={1}>
            {member.role}
          </Text>
        </View>
        <Text style={av.personGdc} numberOfLines={1}>
          {member.gdcId}
        </Text>
      </View>
      <View style={av.personRight}>
        <View style={[av.statusBadge, badge.box]}>
          <Text style={[av.statusBadgeText, badge.text]}>{attendanceLabel}</Text>
        </View>
        <View style={av.activityRow}>
          <View style={[av.activityDot, { backgroundColor: activityColor }]} />
          <Text style={av.activityText}>{activityLabel}</Text>
        </View>
      </View>
    </View>
  );
}

function AttendanceStatusBanner({ message, onRetry }) {
  const { moduleStyles } = useTheme();
  const av = moduleStyles.availability.styles;

  if (!message) return null;
  return (
    <View style={av.errorBanner}>
      <Text style={av.errorBannerText}>{message}</Text>
      {onRetry ? (
        <Pressable style={av.errorBannerBtn} onPress={onRetry}>
          <Text style={av.errorBannerBtnText}>Retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function AdminAvailabilityBoard({
  availabilityRoleFilter,
  setAvailabilityRoleFilter,
  availabilityStatusFilter,
  setAvailabilityStatusFilter,
  availabilityQuickFilter,
  setAvailabilityQuickFilter,
  availabilitySearch,
  setAvailabilitySearch,
  filteredAvailabilityUsers,
  attendanceLoading,
  attendanceError,
  onRetryAttendance,
}) {
  const { moduleStyles, colors } = useTheme();
  const av = moduleStyles.availability.styles;
  const AvColors = moduleStyles.availability.colors;

  const QUICK_PILLS = [
    { key: 'all', label: 'All' },
    { key: 'present', label: 'Present', dot: AvColors.green },
    { key: 'absent', label: 'Absent', dot: AvColors.red },
    { key: 'leave', label: 'Leave', dot: AvColors.orange },
  ];

  const [openMenu, setOpenMenu] = useState(null);

  const memberLabel =
    filteredAvailabilityUsers.length === 1 ? '1 Member' : `${filteredAvailabilityUsers.length} Members`;

  return (
    <>
      <AttendanceStatusBanner message={attendanceError} onRetry={onRetryAttendance} />
      <View style={av.boardHero}>
        <View style={av.boardHeroIconWrap}>
          <MaterialCommunityIcons name="account-group-outline" size={24} color={colors.heroText} />
        </View>
        <Text style={av.boardHeroTitle}>Team Status Board</Text>
      </View>

      <View style={av.card}>
        <View style={av.filtersHead}>
          <MaterialCommunityIcons name="tune-variant" size={20} color={AvColors.blue} />
          <Text style={av.filtersTitle}>Filters</Text>
        </View>
        <Text style={av.filtersSub}>Filter by role, status, or search member.</Text>

        <View style={av.filterRow}>
          <FilterDropdown
            value={availabilityRoleFilter}
            options={ROLE_OPTIONS}
            onChange={(key) => {
              setAvailabilityQuickFilter('all');
              setAvailabilityRoleFilter(key);
            }}
            openKey={openMenu}
            setOpenKey={setOpenMenu}
            fieldKey="role"
            icon="account-outline"
          />
          <FilterDropdown
            value={availabilityStatusFilter}
            options={STATUS_OPTIONS}
            onChange={(key) => {
              setAvailabilityQuickFilter('all');
              setAvailabilityStatusFilter(key);
            }}
            openKey={openMenu}
            setOpenKey={setOpenMenu}
            fieldKey="status"
            icon="filter-outline"
          />
        </View>

        <View style={av.pillsRow}>
          {QUICK_PILLS.map((pill) => {
            const active = availabilityQuickFilter === pill.key;
            return (
              <Pressable
                key={pill.key}
                style={[av.pill, active && av.pillActive]}
                onPress={() => {
                  setOpenMenu(null);
                  setAvailabilityQuickFilter(pill.key);
                  if (pill.key === 'present') setAvailabilityStatusFilter('Available');
                  else if (pill.key === 'absent') setAvailabilityStatusFilter('Unavailable');
                  else if (pill.key === 'leave') setAvailabilityStatusFilter('Leave');
                  else setAvailabilityStatusFilter('all');
                }}
              >
                {pill.dot ? <View style={[av.pillDot, { backgroundColor: pill.dot }]} /> : null}
                <Text style={[av.pillText, active && av.pillTextActive]}>{pill.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={av.searchWrap}>
          <MaterialCommunityIcons name="magnify" size={20} color={AvColors.inputPlaceholder} />
          <TextInput
            value={availabilitySearch}
            onChangeText={setAvailabilitySearch}
            placeholder="Search name, GDC ID, team..."
            placeholderTextColor={AvColors.inputPlaceholder}
            style={av.searchInput}
          />
        </View>
      </View>

      <View style={av.card}>
        <View style={av.peopleHead}>
          <Text style={av.peopleTitle}>People</Text>
          <Text style={av.peopleCount}>{memberLabel}</Text>
        </View>
        {attendanceLoading ? (
          <View style={av.emptyBox}>
            <Text style={av.emptyText}>Loading team status…</Text>
          </View>
        ) : filteredAvailabilityUsers.length === 0 ? (
          <View style={av.emptyBox}>
            <Text style={av.emptyText}>
              {attendanceError ? 'Could not load availability.' : 'No people match filters.'}
            </Text>
          </View>
        ) : (
          filteredAvailabilityUsers.map((member) => <PersonCard key={member.gdcId} member={member} />)
        )}
      </View>
    </>
  );
}

export function AvailabilitySection({ styles, ctx }) {
  const { moduleStyles, colors, isDark } = useTheme();
  const av = moduleStyles.availability.styles;
  const calendarIconColor = isDark ? '#FFFFFF' : colors.primaryMid;

  const {
    user,
    setAvailabilityRoleFilter,
    availabilityRoleFilter,
    setAvailabilityStatusFilter,
    availabilityStatusFilter,
    availabilityQuickFilter,
    setAvailabilityQuickFilter,
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
    attendanceLoading,
    attendanceError,
    onRetryAttendance,
  } = ctx;

  const isAdminBoard = isAdminRole(user?.role);

  if (isAdminBoard) {
    return (
      <SafeAreaView style={av.safe} edges={['top']}>
        <DashboardTopbar />
        <ScrollView contentContainerStyle={av.scroll} showsVerticalScrollIndicator={false}>
          <AdminAvailabilityBoard
            availabilityRoleFilter={availabilityRoleFilter}
            setAvailabilityRoleFilter={setAvailabilityRoleFilter}
            availabilityStatusFilter={availabilityStatusFilter}
            setAvailabilityStatusFilter={setAvailabilityStatusFilter}
            availabilityQuickFilter={availabilityQuickFilter}
            setAvailabilityQuickFilter={setAvailabilityQuickFilter}
            availabilitySearch={availabilitySearch}
            setAvailabilitySearch={setAvailabilitySearch}
            filteredAvailabilityUsers={filteredAvailabilityUsers}
            attendanceLoading={attendanceLoading}
            attendanceError={attendanceError}
            onRetryAttendance={onRetryAttendance}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <DashboardTopbar />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <AttendanceStatusBanner message={attendanceError} onRetry={onRetryAttendance} />
        <AnimatedBlock delay={0}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <MaterialCommunityIcons name="calendar-clock-outline" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>My Availability</Text>
          </View>
        </View>
        </AnimatedBlock>

        <AnimatedBlock delay={80}>
        <View style={[styles.panel, { marginBottom: 12 }]}>
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
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[styles.currentStatusChipText, currentAvailabilityStatus === value && styles.currentStatusChipTextActive]}
                >
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
                  <MaterialCommunityIcons name="calendar-month-outline" size={16} color={calendarIconColor} />
                </View>
              </Pressable>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.recordFieldLabel}>To</Text>
              <Pressable style={styles.dateSelectField} onPress={() => openAvailabilityDatePicker('to')}>
                <Text style={styles.dateSelectText}>{availabilityToDate || 'Select date'}</Text>
                <View style={styles.dateSelectIconWrap}>
                  <MaterialCommunityIcons name="calendar-month-outline" size={16} color={calendarIconColor} />
                </View>
              </Pressable>
            </View>
          </View>
          <View style={{ marginTop: 8 }}>
            {attendanceLoading ? (
              <Text style={styles.recordFieldLabel}>Loading attendance log…</Text>
            ) : null}
            {!attendanceLoading && filteredMyAvailabilityLog.length === 0 ? (
              <Text style={styles.recordFieldLabel}>
                {attendanceError ? 'Could not load log.' : 'No records in this date range.'}
              </Text>
            ) : null}
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
                ]}
              >
                <View style={styles.availabilityLogHeader}>
                  <View style={styles.availabilityDateBadge}>
                    <Text style={styles.availabilityDateDay}>
                      {new Date(`${row.date}T00:00:00`).toLocaleDateString([], { weekday: 'short' })}
                    </Text>
                    <Text style={styles.availabilityDateNumber}>{new Date(`${row.date}T00:00:00`).getDate()}</Text>
                    <Text style={styles.availabilityDateMonth}>
                      {new Date(`${row.date}T00:00:00`).toLocaleDateString([], { month: 'short' })}
                    </Text>
                  </View>
                  <View style={styles.availabilityStatusBlock}>
                    <View
                      style={[
                        styles.availabilityStatusPill,
                        row.status === 'Present'
                          ? styles.availabilityPresent
                          : row.status === 'Leave'
                            ? styles.availabilityLeave
                            : styles.availabilityAbsent,
                      ]}
                    >
                      <Text style={styles.availabilityStatusText}>
                        {row.status === 'Present' ? 'ACTIVE' : row.status.toUpperCase()}
                      </Text>
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
        </AnimatedBlock>
      </ScrollView>
    </SafeAreaView>
  );
}
