import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { KeyboardAwareScrollView } from '@/components/ui/keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';

import { initialsFromName } from '@/components/dashboard/route-modules/timesheet-user-avatar';
import { DashboardTopbar } from '@/components/dashboard/topbar';
import { AnimatedBlock } from '@/components/ui/animated-block';
import { useTheme } from '@/context/theme-context';
import {
  buildWeekAvailabilityStrip,
  formatShiftWindow,
} from '@/utils/availability-helpers';
import { isAdminRole, isHrRole, isTeamLeaderRole } from '@/utils/roles';

const ADMIN_ROLE_OPTIONS = [
  { key: 'all', label: 'All Roles' },
  { key: 'Employee', label: 'Employee' },
  { key: 'HR', label: 'HR' },
  { key: 'Team Leader', label: 'Team Leader' },
];

const HR_ROLE_OPTIONS = [
  { key: 'all', label: 'All Roles' },
  { key: 'Employee', label: 'Employee' },
  { key: 'Team Leader', label: 'Team Leader' },
];

const STATUS_OPTIONS = [
  { key: 'all', label: 'All Status' },
  { key: 'present', label: 'Present' },
  { key: 'away', label: 'Away' },
  { key: 'leave', label: 'On Leave' },
  { key: 'offline', label: 'Offline' },
];

const LOG_TABS = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: 'month', label: 'This month' },
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

function statusBadgeStyle(av, label) {
  if (label === 'Present') return { box: av.statusBadgePresent, text: av.statusBadgeTextPresent };
  if (label === 'Away') return { box: av.statusBadgeAway, text: av.statusBadgeTextAway };
  if (label === 'On Leave' || label === 'Leave') return { box: av.statusBadgeLeave, text: av.statusBadgeTextLeave };
  return { box: av.statusBadgeOffline, text: av.statusBadgeTextOffline };
}

function PersonCard({ member }) {
  const { moduleStyles } = useTheme();
  const av = moduleStyles.availability.styles;
  const AvColors = moduleStyles.availability.colors;

  const attendanceLabel =
    member.attendanceLabel ||
    (member.cardStatus === 'present'
      ? 'Present'
      : member.cardStatus === 'away'
        ? 'Away'
        : member.cardStatus === 'leave'
          ? 'On Leave'
          : 'Offline');
  const badge = statusBadgeStyle(av, attendanceLabel);
  const activityLabel = member.activityLabel || attendanceLabel;
  const activityColor =
    member.cardStatus === 'present'
      ? AvColors.green
      : member.cardStatus === 'away'
        ? '#F59E0B'
        : member.cardStatus === 'leave'
          ? AvColors.orange
          : '#94A3B8';

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
        {member.todayHours && member.todayHours !== '—' ? (
          <Text style={av.personHours} numberOfLines={1}>
            Today: {member.todayHours}
          </Text>
        ) : null}
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

function DualTabNav({ tab, setTab }) {
  const { moduleStyles } = useTheme();
  const av = moduleStyles.availability.styles;

  return (
    <View style={av.dualTabRow}>
      {[
        ['my', 'My availability'],
        ['team', 'Team availability'],
      ].map(([id, label]) => {
        const active = tab === id;
        return (
          <Pressable key={id} style={[av.dualTabBtn, active && av.dualTabBtnActive]} onPress={() => setTab(id)}>
            <Text style={[av.dualTabText, active && av.dualTabTextActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function StatTile({ label, value, tint, textColor, icon, wide }) {
  const { moduleStyles } = useTheme();
  const av = moduleStyles.availability.styles;
  return (
    <View style={[av.statTile, wide && av.statTileWide, { backgroundColor: tint }]}>
      <View style={[av.statTileTop, wide && { marginBottom: 0, flex: 1 }]}>
        <View style={[av.statTileIcon, { backgroundColor: 'rgba(255,255,255,0.7)' }]}>
          <MaterialCommunityIcons name={icon} size={16} color={textColor} />
        </View>
        <Text style={[av.statTileLabel, { color: textColor }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text style={[av.statTileValue, wide && av.statTileValueWide, { color: textColor }]}>{value}</Text>
    </View>
  );
}

function TeamAvailabilityBoard({ ctx }) {
  const { moduleStyles, colors } = useTheme();
  const av = moduleStyles.availability.styles;
  const AvColors = moduleStyles.availability.colors;

  const {
    user,
    availabilityRoleFilter,
    setAvailabilityRoleFilter,
    availabilityStatusFilter,
    setAvailabilityStatusFilter,
    availabilityQuickFilter,
    setAvailabilityQuickFilter,
    availabilitySearch,
    setAvailabilitySearch,
    filteredAvailabilityUsers,
    availabilitySummary,
    attendanceLoading,
    attendanceError,
    onRetryAttendance,
  } = ctx;

  const isTl = isTeamLeaderRole(user?.role);
  const roleOptions = isHrRole(user?.role) ? HR_ROLE_OPTIONS : ADMIN_ROLE_OPTIONS;
  const [openMenu, setOpenMenu] = useState(null);

  const QUICK_PILLS = [
    { key: 'all', label: 'All' },
    { key: 'present', label: 'Present', dot: AvColors.green },
    { key: 'away', label: 'Away', dot: '#F59E0B' },
    { key: 'leave', label: 'On Leave', dot: AvColors.orange },
    { key: 'offline', label: 'Offline', dot: '#94A3B8' },
  ];

  const summary = availabilitySummary || { total: 0, present: 0, away: 0, leave: 0, offline: 0 };
  const memberLabel =
    filteredAvailabilityUsers.length === 1 ? '1 Member' : `${filteredAvailabilityUsers.length} Members`;

  return (
    <>
      <AttendanceStatusBanner message={attendanceError} onRetry={onRetryAttendance} />
      <View style={av.boardHero}>
        <View style={av.boardHeroIconWrap}>
          <MaterialCommunityIcons name="account-group-outline" size={24} color={colors.heroText} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={av.boardHeroTitle}>{isTl ? 'Team availability' : 'Team Status Board'}</Text>
          {isTl ? (
            <Text style={av.boardHeroSub}>Only employees assigned to your team are shown.</Text>
          ) : null}
        </View>
      </View>

      <View style={av.statsGrid}>
        <StatTile
          wide
          label="Total"
          value={String(summary.total ?? 0)}
          tint="#EEF2FF"
          textColor="#4338CA"
          icon="account-group-outline"
        />
        <StatTile
          label="Present"
          value={String(summary.present ?? 0)}
          tint="#DCFCE7"
          textColor="#15803D"
          icon="account-check-outline"
        />
        <StatTile
          label="Away"
          value={String(summary.away ?? 0)}
          tint="#FEF3C7"
          textColor="#B45309"
          icon="clock-alert-outline"
        />
        <StatTile
          label="On Leave"
          value={String(summary.leave ?? 0)}
          tint="#FFE4E6"
          textColor="#BE123C"
          icon="beach"
        />
        <StatTile
          label="Offline"
          value={String(summary.offline ?? 0)}
          tint="#E2E8F0"
          textColor="#334155"
          icon="account-off-outline"
        />
      </View>

      <View style={av.card}>
        <View style={av.filtersHead}>
          <MaterialCommunityIcons name="tune-variant" size={20} color={AvColors.blue} />
          <Text style={av.filtersTitle}>Filters</Text>
        </View>
        <Text style={av.filtersSub}>Filter by role, status, or search member.</Text>

        <View style={av.filterRow}>
          {!isTl ? (
            <FilterDropdown
              value={availabilityRoleFilter}
              options={roleOptions}
              onChange={(key) => {
                setAvailabilityQuickFilter('all');
                setAvailabilityRoleFilter(key);
              }}
              openKey={openMenu}
              setOpenKey={setOpenMenu}
              fieldKey="role"
              icon="account-outline"
            />
          ) : null}
          <FilterDropdown
            value={availabilityStatusFilter}
            options={STATUS_OPTIONS}
            onChange={(key) => {
              setAvailabilityQuickFilter(key === 'all' ? 'all' : key);
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
                  setAvailabilityStatusFilter(pill.key);
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
            placeholder="Search name, WorkTym ID, team..."
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
          filteredAvailabilityUsers.map((member) => (
            <PersonCard key={member.gdcId || member.id || member.name} member={member} />
          ))
        )}
      </View>
    </>
  );
}

function KpiMini({ title, value, subtitle, icon, tint, iconColor }) {
  const { moduleStyles } = useTheme();
  const av = moduleStyles.availability.styles;
  return (
    <View style={av.kpiCard}>
      <View style={[av.kpiIcon, { backgroundColor: tint }]}>
        <MaterialCommunityIcons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={av.kpiTitle}>{title}</Text>
      <Text style={av.kpiValue}>{value}</Text>
      {subtitle ? <Text style={av.kpiSub}>{subtitle}</Text> : null}
    </View>
  );
}

function MyAvailabilityView({ ctx }) {
  const { moduleStyles, colors, isDark } = useTheme();
  const av = moduleStyles.availability.styles;
  const styles = ctx.styles || {};
  const calendarIconColor = isDark ? '#FFFFFF' : colors.primaryMid;

  const {
    currentAvailabilityStatus,
    myAvailabilityToday,
    myAvailabilitySummary,
    myAvailabilityKpis,
    availabilityLogPreset,
    setAvailabilityLogPreset,
    setAvailabilityFromDate,
    setAvailabilityToDate,
    openAvailabilityDatePicker,
    availabilityFromDate,
    availabilityToDate,
    filteredMyAvailabilityLog,
    myAvailabilityLog,
    availabilityShift,
    attendanceLoading,
    attendanceError,
    onRetryAttendance,
  } = ctx;

  const kpis = myAvailabilityKpis || {};
  const summary = myAvailabilitySummary || { present: 0, absent: 0, leave: 0, totalHours: 0 };
  const shift = useMemo(() => formatShiftWindow(availabilityShift), [availabilityShift]);
  const week = useMemo(
    () => buildWeekAvailabilityStrip(myAvailabilityLog?.length ? myAvailabilityLog : filteredMyAvailabilityLog),
    [filteredMyAvailabilityLog, myAvailabilityLog],
  );

  const todayLabel =
    currentAvailabilityStatus === 'Available'
      ? 'Present'
      : currentAvailabilityStatus === 'Leave'
        ? 'On leave'
        : 'Offline';

  const applyPreset = (preset) => {
    setAvailabilityLogPreset(preset);
    setAvailabilityFromDate('');
    setAvailabilityToDate('');
  };

  const kindColor = (kind) => {
    if (kind === 'present') return '#16A34A';
    if (kind === 'leave') return '#EA580C';
    if (kind === 'absent') return '#DC2626';
    if (kind === 'weekend') return '#94A3B8';
    return '#CBD5E1';
  };

  return (
    <>
      <AttendanceStatusBanner message={attendanceError} onRetry={onRetryAttendance} />
      <AnimatedBlock delay={0}>
        <View style={av.myHeader}>
          <View style={{ flex: 1 }}>
            <Text style={av.myTitle}>My availability</Text>
            <Text style={av.mySub}>Track presence, schedule, and attendance history</Text>
          </View>
          <View style={av.todayChip}>
            <MaterialCommunityIcons name="calendar-month-outline" size={16} color="#4F46E5" />
            <Text style={av.todayChipText}>
              {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          </View>
        </View>
      </AnimatedBlock>

      <View style={av.kpiGrid}>
        <KpiMini
          title="Availability rate"
          value={`${kpis.availabilityRate ?? 0}%`}
          subtitle="Selected period"
          icon="percent-outline"
          tint="#EEF2FF"
          iconColor="#4F46E5"
        />
        <KpiMini
          title="Working days"
          value={String(kpis.workingDays ?? 0)}
          subtitle="Selected period"
          icon="calendar-check"
          tint="#DCFCE7"
          iconColor="#15803D"
        />
        <KpiMini
          title="Leave balance"
          value={String(kpis.leaveRemaining ?? 0)}
          subtitle="Days remaining"
          icon="calendar-clock"
          tint="#FEF3C7"
          iconColor="#B45309"
        />
        <KpiMini
          title="Avg. daily hours"
          value={`${(kpis.avgDailyHours ?? 0).toFixed(1)}h`}
          subtitle="Selected period"
          icon="trending-up"
          tint="#EDE9FE"
          iconColor="#6D28D9"
        />
      </View>

      <View style={av.scheduleRow}>
        <View style={[av.scheduleCard, { flex: 1 }]}>
          <Text style={av.scheduleLabel}>Today schedule</Text>
          <Text style={av.scheduleValue}>{shift.rangeLabel}</Text>
          <Text style={av.scheduleMeta}>Status · {todayLabel}</Text>
          <Text style={av.scheduleMeta}>
            Break · {shift.breakStartLabel} – {shift.breakEndLabel}
          </Text>
        </View>
        <View style={[av.scheduleCard, { flex: 1 }]}>
          <Text style={av.scheduleLabel}>Upcoming leave</Text>
          {kpis.upcomingLeave ? (
            <>
              <Text style={av.scheduleValue}>{kpis.upcomingLeave.type || 'Leave'}</Text>
              <Text style={av.scheduleMeta}>
                {kpis.upcomingLeave.from} → {kpis.upcomingLeave.to}
              </Text>
            </>
          ) : (
            <Text style={av.scheduleValue}>None</Text>
          )}
          {myAvailabilityToday?.checkInLabel && myAvailabilityToday.checkInLabel !== '—' ? (
            <Text style={av.scheduleMeta}>In {myAvailabilityToday.checkInLabel}</Text>
          ) : null}
        </View>
      </View>

      <View style={av.card}>
        <Text style={av.sectionTitle}>This week</Text>
        <View style={av.weekRow}>
          {week.map((d) => (
            <View key={d.ymd} style={[av.weekDay, d.isToday && av.weekDayToday]}>
              <Text style={av.weekDow}>{d.label}</Text>
              <View style={[av.weekDot, { backgroundColor: kindColor(d.kind) }]} />
              <Text style={av.weekNum}>{d.dayNum}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={av.card}>
        <Text style={av.sectionTitle}>Attendance log</Text>
        <View style={av.logTabRow}>
          {LOG_TABS.map((t) => {
            const active = availabilityLogPreset === t.id && !availabilityFromDate && !availabilityToDate;
            return (
              <Pressable
                key={t.id}
                style={[av.logTab, active && av.logTabActive]}
                onPress={() => applyPreset(t.id)}
              >
                <Text style={[av.logTabText, active && av.logTabTextActive]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={av.summaryGrid}>
          <View style={[av.summaryCard, av.summaryPresent]}>
            <Text style={av.summaryLabel}>Present</Text>
            <Text style={av.summaryValue}>{summary.present}</Text>
          </View>
          <View style={[av.summaryCard, av.summaryAbsent]}>
            <Text style={av.summaryLabel}>Absent</Text>
            <Text style={av.summaryValue}>{summary.absent}</Text>
          </View>
          <View style={[av.summaryCard, av.summaryLeave]}>
            <Text style={av.summaryLabel}>Leave</Text>
            <Text style={av.summaryValue}>{summary.leave}</Text>
          </View>
          <View style={[av.summaryCard, av.summaryHours]}>
            <Text style={av.summaryLabel}>Hours</Text>
            <Text style={av.summaryValue}>{(summary.totalHours || 0).toFixed(1)}</Text>
          </View>
        </View>

        <View style={av.dateFilterRow}>
          <View style={{ flex: 1 }}>
            <Text style={av.filterLabel}>From</Text>
            <Pressable style={av.dateSelectField} onPress={() => openAvailabilityDatePicker('from')}>
              <Text style={av.dateSelectText}>{availabilityFromDate || 'Select date'}</Text>
              <MaterialCommunityIcons name="calendar-month-outline" size={16} color={calendarIconColor} />
            </Pressable>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={av.filterLabel}>To</Text>
            <Pressable style={av.dateSelectField} onPress={() => openAvailabilityDatePicker('to')}>
              <Text style={av.dateSelectText}>{availabilityToDate || 'Select date'}</Text>
              <MaterialCommunityIcons name="calendar-month-outline" size={16} color={calendarIconColor} />
            </Pressable>
          </View>
        </View>

        <View style={{ marginTop: 8 }}>
          {attendanceLoading ? <Text style={av.emptyText}>Loading attendance log…</Text> : null}
          {!attendanceLoading && filteredMyAvailabilityLog.length === 0 ? (
            <Text style={av.emptyText}>{attendanceError ? 'Could not load log.' : 'No records in this date range.'}</Text>
          ) : null}
          {filteredMyAvailabilityLog.map((row) => {
            const isTodayRow =
              row.date ===
              `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
            return (
              <View
                key={row.date}
                style={[
                  av.logRow,
                  row.status === 'Present'
                    ? av.logPresent
                    : row.status === 'Leave'
                      ? av.logLeave
                      : av.logAbsent,
                ]}
              >
                <View style={av.logHeader}>
                  <View style={av.dateBadge}>
                    <Text style={av.dateDay}>
                      {new Date(`${row.date}T00:00:00`).toLocaleDateString([], { weekday: 'short' })}
                    </Text>
                    <Text style={av.dateNumber}>{new Date(`${row.date}T00:00:00`).getDate()}</Text>
                    <Text style={av.dateMonth}>
                      {new Date(`${row.date}T00:00:00`).toLocaleDateString([], { month: 'short' })}
                    </Text>
                  </View>
                  <View style={av.statusBlock}>
                    <View
                      style={[
                        av.logStatusPill,
                        row.status === 'Present'
                          ? av.logStatusPresent
                          : row.status === 'Leave'
                            ? av.logStatusLeave
                            : av.logStatusAbsent,
                      ]}
                    >
                      <Text style={av.logStatusText}>
                        {row.status === 'Present' ? 'PRESENT' : String(row.status || '').toUpperCase()}
                      </Text>
                    </View>
                    {isTodayRow ? <Text style={av.todayTag}>TODAY</Text> : null}
                  </View>
                </View>
                <View style={av.metricsGrid}>
                  <View style={av.metricPill}>
                    <Text style={av.metricLabel}>IN</Text>
                    <Text style={av.metricValue}>{row.in}</Text>
                  </View>
                  <View style={av.metricPill}>
                    <Text style={av.metricLabel}>OUT</Text>
                    <Text style={av.metricValue}>{row.out}</Text>
                  </View>
                  <View style={av.metricPill}>
                    <Text style={av.metricLabel}>BREAKS</Text>
                    <Text style={av.metricValue}>{row.breaks ?? 0}</Text>
                  </View>
                  <View style={[av.metricPill, av.hoursPill]}>
                    <Text style={av.metricLabel}>HOURS</Text>
                    <Text style={[av.metricValue, av.hoursValue]}>
                      {typeof row.hours === 'number' ? row.hours.toFixed(2) : row.hours}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      <View style={av.bottomKpiRow}>
        <KpiMini
          title="Total hours"
          value={`${(kpis.totalHours ?? 0).toFixed(1)}h`}
          icon="clock-outline"
          tint="#DBEAFE"
          iconColor="#1D4ED8"
        />
        <KpiMini
          title="Overtime"
          value={`${(kpis.overtime ?? 0).toFixed(1)}h`}
          icon="timer-plus-outline"
          tint="#EDE9FE"
          iconColor="#6D28D9"
        />
        <KpiMini
          title="Breaks"
          value={String(kpis.totalBreaks ?? 0)}
          icon="coffee-outline"
          tint="#FFEDD5"
          iconColor="#C2410C"
        />
        <KpiMini
          title="Leaves taken"
          value={String(kpis.leaveDays ?? 0)}
          icon="beach"
          tint="#FEE2E2"
          iconColor="#BE123C"
        />
      </View>
    </>
  );
}

export function AvailabilitySection({ styles, ctx }) {
  const { moduleStyles } = useTheme();
  const av = moduleStyles.availability.styles;
  const {
    user,
    availabilityTab = 'my',
    setAvailabilityTab,
  } = ctx;

  const isAdmin = isAdminRole(user?.role);
  const isHr = isHrRole(user?.role);
  const isTl = isTeamLeaderRole(user?.role);
  const dualTabs = isHr || isTl;
  const showTeam = isAdmin || (dualTabs && availabilityTab === 'team');
  const showMy = !isAdmin && (!dualTabs || availabilityTab === 'my');

  return (
    <SafeAreaView style={av.safe} edges={['top']}>
      <DashboardTopbar />
      <KeyboardAwareScrollView contentContainerStyle={av.scroll}>
        {dualTabs ? <DualTabNav tab={availabilityTab} setTab={setAvailabilityTab} /> : null}
        {isTl && showTeam ? (
          <Text style={av.teamHint}>Only employees assigned to your team are shown.</Text>
        ) : null}
        {showTeam ? <TeamAvailabilityBoard ctx={ctx} /> : null}
        {showMy ? <MyAvailabilityView ctx={{ ...ctx, styles }} /> : null}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
