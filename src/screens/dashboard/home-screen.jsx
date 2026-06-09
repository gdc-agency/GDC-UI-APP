import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedBlock } from '@/components/ui/animated-block';
import { DashboardHeroCard } from '@/components/dashboard/dashboard-hero-card';
import { DashboardMetricCard } from '@/components/dashboard/dashboard-metric-card';
import { DashboardTopbar } from '@/components/dashboard/topbar';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/context/theme-context';
import {
  getAllUsers,
  getAttendanceSummary,
  getMyTeamRoster,
  getPendingUsersCount,
  getWorkforceCount,
  listLeaveRequests,
  listTasks,
} from '@/data/api';
import { buildDashboardTaskSnapshot, buildHrDashboardSnapshot, countTeamEmployeesInRoster } from '@/utils/dashboard-task-stats';
import { mapTaskRowToProjectTask } from '@/utils/task-ui-map';
import {
  extractPendingUsersCount,
  extractWorkforceCount,
  normalizeApprovedUsersList,
} from '@/utils/admin-api-response';
import { isExcludedAttendanceOverviewRole } from '@/utils/attendance-ui-map';
import { isAdminRole, isHrRole } from '@/utils/roles';
import { mapApprovedUserRow } from '@/utils/admin-directory';

const GRID_GAP = 10;
const SCREEN_H_PAD = 18;
const TITLE_TOP_GAP = 22;
const METRIC_CARD_HEIGHT = 128;

/** Two cards per row on every screen width — px width avoids broken % layout on some Android devices. */
function metricCardWidth(screenWidth) {
  const inner = Math.max(0, screenWidth - SCREEN_H_PAD * 2);
  return Math.floor((inner - GRID_GAP) / 2);
}

function roleCode(role) {
  if (isAdminRole(role)) return 'AD';
  if (role === 'Team Leader') return 'TL';
  if (role === 'HR') return 'HR';
  if (role === 'Employee') return 'EMP';
  return 'USR';
}

function parseStatCount(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function fmtCount(n) {
  if (n != null && Number.isFinite(Number(n))) return String(n);
  return '0';
}

function countActiveNowFromSummary(summary) {
  const rows = Array.isArray(summary?.users) ? summary.users : [];
  return rows.filter((row) => {
    if (isExcludedAttendanceOverviewRole(row.role)) return false;
    const att = String(row.attendance_status ?? '').toUpperCase();
    const live = String(row.live_status ?? '').toUpperCase();
    return att === 'PRESENT' || live === 'WORKING' || live === 'BREAK';
  }).length;
}

function buildRoleDashboard(role, ctx) {
  const {
    onOpenPendingApprovals,
    onOpenPendingLeave,
    onOpenProjectStatus,
    onOpenActiveNow,
    workforceCount,
    pendingUsersCount,
    activeNowCount,
    pendingLeaveCount,
    taskBoard,
    hrStats,
  } = ctx;

  const wf = workforceCount != null ? String(workforceCount) : '0';
  const pend = pendingUsersCount != null ? String(pendingUsersCount) : '0';
  const b = taskBoard || {};
  const p = fmtCount(b.pending);
  const ip = fmtCount(b.inProgress);
  const rv = fmtCount(b.review);
  const sb = fmtCount(b.submitted);
  const ap = fmtCount(b.approved);
  const od = fmtCount(b.overdue);
  const tlEmp = fmtCount(b.tlTeamMemberCount);

  if (isAdminRole(role)) {
    return {
      title: 'Admin Workspace',
      subtitle: 'System overview, approvals, and policy control.',
      cards: [
        { label: 'Workforce', value: wf, icon: 'account-group-outline', tint: '#eff6ff', iconColor: '#2563eb' },
        { label: 'Active Now', value: fmtCount(activeNowCount), icon: 'pulse', tint: '#ecfdf5', iconColor: '#16a34a', onPress: onOpenActiveNow },
        { label: 'Pending Leave', value: fmtCount(pendingLeaveCount), icon: 'calendar-clock-outline', tint: '#fff8e8', iconColor: '#f59e0b', onPress: onOpenPendingLeave },
        { label: 'Pending Tasks', value: p, icon: 'bullseye-arrow', tint: '#eef2ff', iconColor: '#6366f1', onPress: () => onOpenProjectStatus?.('pending') },
        { label: 'Overdue', value: od, icon: 'alert-circle-outline', tint: '#fff1f2', iconColor: '#dc2626', onPress: () => onOpenProjectStatus?.('overdue') },
        { label: 'Pending Approval', value: pend, icon: 'shield-check-outline', tint: '#f5f3ff', iconColor: '#9333ea', onPress: onOpenPendingApprovals },
      ],
    };
  }

  if (isHrRole(role)) {
    return {
      title: 'HR Dashboard',
      subtitle: 'Track requests, leaves, and people operations.',
      cards: [
        { label: 'Team Members', value: fmtCount(hrStats?.teamMembers), icon: 'account-group-outline', tint: '#eff6ff', iconColor: '#2563eb' },
        { label: 'Team Tasks', value: fmtCount(hrStats?.teamTasks), icon: 'bullseye-arrow', tint: '#eef2ff', iconColor: '#6366f1', onPress: () => onOpenProjectStatus?.('pending') },
        { label: 'Completed', value: fmtCount(hrStats?.completed), icon: 'check-circle-outline', tint: '#ecfdf5', iconColor: '#10b981', onPress: () => onOpenProjectStatus?.('completed') },
        { label: 'Pending Leave', value: fmtCount(hrStats?.pendingLeave), icon: 'calendar-month-outline', tint: '#fff8e8', iconColor: '#d4a017', onPress: onOpenPendingLeave },
        { label: 'Pending Tasks', value: fmtCount(hrStats?.pendingTasks), icon: 'clock-outline', tint: '#fff7e6', iconColor: '#d97706', onPress: () => onOpenProjectStatus?.('pending') },
        { label: 'Submitted', value: fmtCount(hrStats?.submitted), icon: 'send-check-outline', tint: '#ecfeff', iconColor: '#0f766e', onPress: () => onOpenProjectStatus?.('submitted') },
      ],
    };
  }

  if (role === 'Team Leader') {
    return {
      title: 'Team Leader Dashboard',
      subtitle: 'Team delivery, assignments, and member progress.',
      cards: [
        { label: 'Team Members', value: tlEmp, icon: 'account-group-outline', tint: '#eff6ff', iconColor: '#2563eb', onPress: () => onOpenProjectStatus?.('all') },
        { label: 'Pending', value: p, icon: 'clock-outline', tint: '#fff7e6', iconColor: '#d97706', onPress: () => onOpenProjectStatus?.('pending') },
        { label: 'In Progress', value: ip, icon: 'chart-box-outline', tint: '#eef2ff', iconColor: '#4f46e5', onPress: () => onOpenProjectStatus?.('in progress') },
        { label: 'Review', value: rv, icon: 'timer-outline', tint: '#f5f3ff', iconColor: '#7c3aed', onPress: () => onOpenProjectStatus?.('review') },
        { label: 'Submitted', value: sb, icon: 'arrow-top-right', tint: '#ecfeff', iconColor: '#0f766e', onPress: () => onOpenProjectStatus?.('submitted') },
        { label: 'Overdue', value: od, icon: 'alert-circle-outline', tint: '#fff1f2', iconColor: '#e11d48', onPress: () => onOpenProjectStatus?.('overdue') },
      ],
    };
  }

  return {
    title: 'Employee Dashboard',
    subtitle: 'Your work summary, activity, and tasks.',
    cards: [
      { label: 'Pending', value: p, icon: 'clock-outline', tint: '#fff7e6', iconColor: '#d97706', onPress: () => onOpenProjectStatus?.('pending') },
      { label: 'In Progress', value: ip, icon: 'chart-box-outline', tint: '#eef2ff', iconColor: '#4f46e5', onPress: () => onOpenProjectStatus?.('in progress') },
      { label: 'Review', value: rv, icon: 'timer-outline', tint: '#f5f3ff', iconColor: '#7c3aed', onPress: () => onOpenProjectStatus?.('review') },
      { label: 'Submitted', value: sb, icon: 'arrow-top-right', tint: '#ecfeff', iconColor: '#0f766e', onPress: () => onOpenProjectStatus?.('submitted') },
      { label: 'Completed', value: ap, icon: 'check-circle-outline', tint: '#ecfdf5', iconColor: '#10b981', onPress: () => onOpenProjectStatus?.('completed') },
      { label: 'Overdue', value: od, icon: 'alert-circle-outline', tint: '#fff1f2', iconColor: '#e11d48', onPress: () => onOpenProjectStatus?.('overdue') },
    ],
  };
}

function RolePanel({ role, ...ctx }) {
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = metricCardWidth(screenWidth);
  const dashboard = buildRoleDashboard(role, ctx);

  return (
    <View>
      <View style={{ marginTop: TITLE_TOP_GAP }}>
        <Text className="text-[17px] font-extrabold tracking-tight" style={{ color: colors.text }}>
          {dashboard.title}
        </Text>
        <Text className="mt-1 text-xs leading-[18px]" style={{ color: colors.textMuted }}>
          {dashboard.subtitle}
        </Text>
      </View>

      <View className="mt-3 flex-row flex-wrap justify-between" style={{ width: '100%' }}>
        {dashboard.cards.map((card, i) => (
          <AnimatedBlock
            key={card.label}
            index={i}
            baseDelay={120}
            style={{
              width: cardWidth,
              marginBottom: GRID_GAP,
              flexGrow: 0,
              flexShrink: 0,
            }}>
            <DashboardMetricCard {...card} width={cardWidth} height={METRIC_CARD_HEIGHT} animSeed={i + 1} />
          </AnimatedBlock>
        ))}
      </View>
    </View>
  );
}

const EMPTY_TASK_BOARD = {
  pending: null,
  inProgress: null,
  review: null,
  submitted: null,
  approved: null,
  overdue: null,
  tlTeamMemberCount: null,
};

const EMPTY_HR_STATS = {
  teamMembers: 0,
  teamTasks: 0,
  completed: 0,
  pendingLeave: 0,
  pendingTasks: 0,
  submitted: 0,
};

export default function DashboardHomeScreen() {
  const { user, token } = useAuth();
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const nowText = React.useMemo(() => new Date().toLocaleString(), []);

  const [adminStats, setAdminStats] = React.useState({ workforce: null, pendingUsers: null, activeNow: null, pendingLeave: null });
  const [taskBoard, setTaskBoard] = React.useState(EMPTY_TASK_BOARD);
  const [hrStats, setHrStats] = React.useState(EMPTY_HR_STATS);

  const loadHrDashboardStats = React.useCallback(async () => {
    if (!isHrRole(user?.role) || !token) {
      setHrStats(EMPTY_HR_STATS);
      return;
    }
    const [tasksSettled, usersSettled, leavesSettled] = await Promise.allSettled([
      listTasks(token, {}),
      getAllUsers(token, { approvedOnly: true }),
      listLeaveRequests(token),
    ]);

    let tasks = [];
    if (tasksSettled.status === 'fulfilled') {
      const tasksRes = tasksSettled.value;
      tasks = (Array.isArray(tasksRes) ? tasksRes : []).map((row) => mapTaskRowToProjectTask(row));
    } else if (__DEV__) {
      const err = tasksSettled.reason;
      console.warn('[dashboard] HR tasks fetch failed:', err?.message ?? err);
    }

    let users = [];
    if (usersSettled.status === 'fulfilled') {
      users = normalizeApprovedUsersList(usersSettled.value).map(mapApprovedUserRow);
    } else if (__DEV__) {
      const err = usersSettled.reason;
      console.warn('[dashboard] HR users fetch failed:', err?.message ?? err);
    }

    let leaveRows = [];
    if (leavesSettled.status === 'fulfilled') {
      leaveRows = Array.isArray(leavesSettled.value) ? leavesSettled.value : [];
    } else if (__DEV__) {
      const err = leavesSettled.reason;
      console.warn('[dashboard] HR leave fetch failed:', err?.message ?? err);
    }

    setHrStats(
      buildHrDashboardSnapshot({
        user,
        tasks,
        users,
        leaveRequests: leaveRows.map((row) => ({ status: String(row.status ?? '') })),
      }),
    );
  }, [token, user]);

  const loadDashboardTaskBoard = React.useCallback(async () => {
    if (!token) {
      setTaskBoard(EMPTY_TASK_BOARD);
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    try {
      const rows = await listTasks(token, {});
      const snap = buildDashboardTaskSnapshot(rows, user, today);
      let tlTeamMemberCount = null;
      if (user?.role === 'Team Leader') {
        try {
          const roster = await getMyTeamRoster(token);
          tlTeamMemberCount = countTeamEmployeesInRoster(roster);
        } catch (e) {
          if (__DEV__ && e && typeof e.message === 'string') {
            console.warn('[dashboard] TL roster fetch failed:', e.message);
          }
          tlTeamMemberCount = null;
        }
      }
      setTaskBoard({ ...snap, tlTeamMemberCount });
    } catch (e) {
      if (__DEV__ && e && typeof e.message === 'string') {
        console.warn('[dashboard] task board fetch failed:', e.message);
      }
      setTaskBoard(EMPTY_TASK_BOARD);
    }
  }, [token, user]);

  const loadAdminStats = useCallback(async () => {
    if (!isAdminRole(user?.role) || !token) {
      setAdminStats({ workforce: null, pendingUsers: null, activeNow: null, pendingLeave: null });
      return;
    }
    try {
      const [w, p, attendance, leaves] = await Promise.all([
        getWorkforceCount(token),
        getPendingUsersCount(token),
        getAttendanceSummary(token),
        listLeaveRequests(token),
      ]);
      const leaveRows = Array.isArray(leaves) ? leaves : [];
      const pendingLeave = leaveRows.filter(
        (row) => String(row.status ?? '').toLowerCase() === 'pending',
      ).length;
      setAdminStats({
        workforce: parseStatCount(extractWorkforceCount(w)),
        pendingUsers: parseStatCount(extractPendingUsersCount(p)),
        activeNow: countActiveNowFromSummary(attendance),
        pendingLeave,
      });
    } catch (e) {
      if (__DEV__ && e && typeof e.message === 'string') {
        console.warn('[dashboard] admin stats fetch failed:', e.message);
      }
      setAdminStats({ workforce: null, pendingUsers: null, activeNow: null, pendingLeave: null });
    }
  }, [user?.role, token]);

  useFocusEffect(
    React.useCallback(() => {
      void loadAdminStats();
      void loadDashboardTaskBoard();
      void loadHrDashboardStats();
    }, [loadAdminStats, loadDashboardTaskBoard, loadHrDashboardStats]),
  );

  React.useEffect(() => {
    if (!token) return undefined;
    const id = setInterval(() => {
      void loadDashboardTaskBoard();
      if (isAdminRole(user?.role)) void loadAdminStats();
      if (isHrRole(user?.role)) void loadHrDashboardStats();
    }, 45000);
    return () => clearInterval(id);
  }, [token, user?.role, loadDashboardTaskBoard, loadAdminStats, loadHrDashboardStats]);

  const gdcLabel = user?.gdc_id ? String(user.gdc_id) : `GDC-${String(user?.id ?? '0001').toUpperCase()}`;

  const rolePanelProps = {
    role: user?.role,
    workforceCount: adminStats.workforce,
    pendingUsersCount: adminStats.pendingUsers,
    activeNowCount: adminStats.activeNow,
    pendingLeaveCount: adminStats.pendingLeave,
    taskBoard,
    hrStats,
    onOpenPendingApprovals: () => router.push('/dashboard/(tabs)/route/admin?tab=employees&filter=Pending'),
    onOpenPendingLeave: () => router.push('/dashboard/(tabs)/route/request-management?status=Pending'),
    onOpenActiveNow: () => router.push('/dashboard/(tabs)/route/availability?filter=present'),
    onOpenProjectStatus: (status) => router.push(`/dashboard/(tabs)/route/project-manager?status=${encodeURIComponent(status)}`),
  };

  return (
    <SafeAreaView className="flex-1 bg-page" edges={['top']}>
      <DashboardTopbar />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 4, paddingBottom: tabBarHeight + 20 }}
        showsVerticalScrollIndicator={false}>
        <AnimatedBlock delay={0}>
          <DashboardHeroCard user={user} gdcLabel={gdcLabel} nowText={nowText} roleCode={roleCode} />
        </AnimatedBlock>
        <AnimatedBlock delay={80}>
          <RolePanel {...rolePanelProps} />
        </AnimatedBlock>
      </ScrollView>
    </SafeAreaView>
  );
}
