import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardTopbar } from '@/components/dashboard/topbar';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/context/theme-context';
import { cn } from '@/theme/cn';
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

function StatCard({ label, value, icon, color, onPress }) {
  const { colors } = useTheme();
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper
      className="min-w-[140px] flex-grow rounded-2xl border border-border-strong bg-surface-muted p-3"
      style={{ width: '47%', borderLeftWidth: 4, borderLeftColor: color }}
      onPress={onPress}>
      <View className="h-[30px] w-[30px] items-center justify-center rounded-[10px]" style={{ backgroundColor: `${color}22` }}>
        <MaterialCommunityIcons name={icon} size={18} color={color} />
      </View>
      <Text className="mt-2 text-[11px] font-bold" style={{ color: colors.textMuted }}>{label}</Text>
      <Text className="mt-0.5 text-[22px] font-extrabold" style={{ color: colors.text }}>{value}</Text>
    </Wrapper>
  );
}

function TlDashboardCard({ label, value, icon, tint, iconColor, onPress }) {
  const { colors } = useTheme();
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper
      className="min-h-[132px] rounded-[14px] border border-border-strong bg-surface-muted p-2.5"
      style={{ width: '48%', borderLeftWidth: 4, borderLeftColor: iconColor }}
      onPress={onPress}>
      <View className="mb-2.5 flex-row items-center justify-between">
        <View className="h-[30px] w-[30px] items-center justify-center rounded-[10px]" style={{ backgroundColor: tint }}>
          <MaterialCommunityIcons name={icon} size={16} color={iconColor} />
        </View>
        <View className="h-[9px] w-[9px] rounded-full" style={{ backgroundColor: colors.textSecondary }} />
      </View>
      <Text className="text-[11px] font-extrabold tracking-wider" style={{ color: colors.textSecondary }}>{label}</Text>
      <Text className="mt-1 text-[34px] font-black leading-[38px]" style={{ color: colors.text }}>{value}</Text>
    </Wrapper>
  );
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

function RolePanel({
  role,
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
}) {
  const { colors } = useTheme();
  const wf = workforceCount != null ? String(workforceCount) : '—';
  const pend = pendingUsersCount != null ? String(pendingUsersCount) : '—';
  const b = taskBoard || {};
  const p = fmtCount(b.pending);
  const ip = fmtCount(b.inProgress);
  const rv = fmtCount(b.review);
  const sb = fmtCount(b.submitted);
  const ap = fmtCount(b.approved);
  const od = fmtCount(b.overdue);
  const tlEmp = fmtCount(b.tlTeamMemberCount);

  if (isAdminRole(role)) {
    return (
      <View className="rounded-[20px] border border-border-light bg-card p-4 elevation-[3]">
        <Text className="text-base font-extrabold" style={{ color: colors.text }}>Admin Workspace</Text>
        <Text className="mt-1 text-xs leading-[18px]" style={{ color: colors.textMuted }}>System overview, approvals, and policy control.</Text>
        <View className="mt-3 flex-row flex-wrap gap-2.5">
          <StatCard label="Workforce" value={wf} icon="account-group-outline" color="#2563eb" />
          <StatCard
            label="Active Now"
            value={fmtCount(activeNowCount)}
            icon="pulse"
            color="#16a34a"
            onPress={onOpenActiveNow}
          />
          <StatCard label="Pending Leave" value={fmtCount(pendingLeaveCount)} icon="calendar-clock-outline" color="#f59e0b" onPress={onOpenPendingLeave} />
          <StatCard label="Pending Tasks" value={p} icon="bullseye-arrow" color="#6366f1" onPress={() => onOpenProjectStatus?.('pending')} />
          <StatCard label="Overdue" value={od} icon="alert-circle-outline" color="#dc2626" onPress={() => onOpenProjectStatus?.('overdue')} />
          <StatCard label="Pending Approval" value={pend} icon="shield-check-outline" color="#9333ea" onPress={onOpenPendingApprovals} />
        </View>
      </View>
    );
  }

  if (isHrRole(role)) {
    const hm = fmtCount(hrStats?.teamMembers);
    const tt = fmtCount(hrStats?.teamTasks);
    const done = fmtCount(hrStats?.completed);
    const pl = fmtCount(hrStats?.pendingLeave);
    return (
      <View className="rounded-[20px] border border-border-light bg-card p-4 elevation-[3]">
        <Text className="text-base font-extrabold" style={{ color: colors.text }}>HR Dashboard</Text>
        <Text className="mt-1 text-xs leading-[18px]" style={{ color: colors.textMuted }}>Track requests, leaves, and people operations.</Text>
        <View className="mt-3 flex-row flex-wrap gap-2.5">
          <TlDashboardCard label="TEAM MEMBERS" value={hm} icon="account-group-outline" tint="#eff6ff" iconColor="#2563eb" />
          <TlDashboardCard label="TEAM TASKS" value={tt} icon="bullseye-arrow" tint="#eef2ff" iconColor="#6366f1" onPress={() => onOpenProjectStatus?.('pending')} />
          <TlDashboardCard label="COMPLETED" value={done} icon="check-circle-outline" tint="#ecfdf5" iconColor="#10b981" onPress={() => onOpenProjectStatus?.('completed')} />
          <TlDashboardCard label="PENDING LEAVE" value={pl} icon="calendar-month-outline" tint="#fff8e8" iconColor="#d4a017" onPress={onOpenPendingLeave} />
        </View>
      </View>
    );
  }

  if (role === 'Team Leader') {
    return (
      <View className="rounded-[20px] border border-border-light bg-card p-4 elevation-[3]">
        <Text className="text-base font-extrabold" style={{ color: colors.text }}>Team Leader Dashboard</Text>
        <Text className="mt-1 text-xs leading-[18px]" style={{ color: colors.textMuted }}>Team delivery, assignments, and member progress.</Text>
        <View className="mt-3 flex-row flex-wrap gap-2.5">
          <TlDashboardCard label="TEAM MEMBERS" value={tlEmp} icon="account-group-outline" tint="#eff6ff" iconColor="#2563eb" onPress={() => onOpenProjectStatus?.('all')} />
          <TlDashboardCard label="PENDING" value={p} icon="clock-outline" tint="#fff7e6" iconColor="#d97706" onPress={() => onOpenProjectStatus?.('pending')} />
          <TlDashboardCard label="IN PROGRESS" value={ip} icon="chart-box-outline" tint="#eef2ff" iconColor="#4f46e5" onPress={() => onOpenProjectStatus?.('in progress')} />
          <TlDashboardCard label="REVIEW" value={rv} icon="timer-outline" tint="#f5f3ff" iconColor="#7c3aed" onPress={() => onOpenProjectStatus?.('review')} />
          <TlDashboardCard label="SUBMITTED" value={sb} icon="arrow-top-right" tint="#ecfeff" iconColor="#0f766e" onPress={() => onOpenProjectStatus?.('submitted')} />
          <TlDashboardCard label="OVERDUE" value={od} icon="alert-circle-outline" tint="#fff1f2" iconColor="#e11d48" onPress={() => onOpenProjectStatus?.('overdue')} />
        </View>
      </View>
    );
  }

  return (
    <View className="rounded-[20px] border border-border-light bg-card p-4 elevation-[3]">
      <Text className="text-base font-extrabold" style={{ color: colors.text }}>Employee Dashboard</Text>
      <Text className="mt-1 text-xs leading-[18px]" style={{ color: colors.textMuted }}>Your work summary, activity, and tasks.</Text>
      <View className="mt-3 flex-row flex-wrap gap-2.5">
        <TlDashboardCard label="PENDING" value={p} icon="clock-outline" tint="#fff7e6" iconColor="#d97706" onPress={() => onOpenProjectStatus?.('pending')} />
        <TlDashboardCard label="IN PROGRESS" value={ip} icon="chart-box-outline" tint="#eef2ff" iconColor="#4f46e5" onPress={() => onOpenProjectStatus?.('in progress')} />
        <TlDashboardCard label="REVIEW" value={rv} icon="timer-outline" tint="#f5f3ff" iconColor="#7c3aed" onPress={() => onOpenProjectStatus?.('review')} />
        <TlDashboardCard label="SUBMITTED" value={sb} icon="arrow-top-right" tint="#ecfeff" iconColor="#0f766e" onPress={() => onOpenProjectStatus?.('submitted')} />
        <TlDashboardCard label="COMPLETED" value={ap} icon="check-circle-outline" tint="#ecfdf5" iconColor="#10b981" onPress={() => onOpenProjectStatus?.('completed')} />
        <TlDashboardCard label="OVERDUE" value={od} icon="alert-circle-outline" tint="#fff1f2" iconColor="#e11d48" onPress={() => onOpenProjectStatus?.('overdue')} />
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
};

export default function DashboardHomeScreen() {
  const { user, token } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
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
  const isEmployee = user?.role === 'Employee';

  return (
    <SafeAreaView className="flex-1 bg-page" edges={['top']}>
      <DashboardTopbar />

      <ScrollView contentContainerClassName="flex-grow px-[18px] pb-24 pt-1" showsVerticalScrollIndicator={false}>
        <View
          className={cn('mb-4 rounded-[24px] p-5 elevation-[8]', isEmployee && 'border border-white/25')}
          style={{
            backgroundColor: colors.heroBg,
            shadowColor: colors.heroBg,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: isEmployee ? 0.28 : 0.24,
            shadowRadius: isEmployee ? 20 : 18,
          }}>
          <View className="flex-row items-center gap-3.5">
            <View
              className="h-[68px] w-[68px] overflow-hidden rounded-[34px] border-[3px] border-white/90 elevation-[4]"
              style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
              accessibilityRole="image"
              accessibilityLabel="Profile photo">
              {user?.avatar ? (
                <Image
                  key={user.avatar}
                  source={{ uri: user.avatar }}
                  className="h-full w-full"
                  contentFit="cover"
                  contentPosition="center"
                  transition={180}
                  cachePolicy="none"
                />
              ) : (
                <View className="flex-1 items-center justify-center bg-slate-900/25">
                  <Text className="text-[17px] font-extrabold tracking-wide text-white">{roleCode(user?.role)}</Text>
                </View>
              )}
            </View>
            <View className="flex-1">
              <Text className="text-[22px] font-extrabold" style={{ color: colors.heroText }}>
                {user?.name ?? 'User'}
              </Text>
              <View className="mt-1.5 flex-row items-center gap-1.5 self-start rounded-pill bg-white/10 px-[9px] py-1">
                <MaterialCommunityIcons name="shield-account-outline" size={13} color="#dbeafe" />
                <Text className="text-xs font-bold" style={{ color: colors.heroSubtext }}>
                  Role: {user?.role ?? 'Member'}
                </Text>
              </View>
              <View className="mt-1.5 flex-row items-center gap-1.5 self-start rounded-pill bg-white/10 px-[9px] py-1">
                <MaterialCommunityIcons name="card-account-details-outline" size={13} color="#bfdbfe" />
                <Text className="text-[11px] font-bold" style={{ color: colors.heroSubtext }}>
                  GDC_ID: {gdcLabel}
                </Text>
              </View>
              <View className="mt-1.5 flex-row items-center gap-1.5 self-start rounded-pill bg-white/10 px-[9px] py-1">
                <MaterialCommunityIcons name="clock-outline" size={13} color="#bfdbfe" />
                <Text className="text-[11px] font-semibold" style={{ color: colors.heroSubtext }}>
                  As of {nowText}
                </Text>
              </View>
            </View>
          </View>
          {isAdminRole(user?.role) ? (
            <Text className="mt-3 self-start rounded-pill bg-white/15 px-2.5 py-[5px] text-[11px] font-extrabold tracking-wide text-slate-200">
              Admin Workspace
            </Text>
          ) : null}
        </View>

        <RolePanel
          role={user?.role}
          workforceCount={adminStats.workforce}
          pendingUsersCount={adminStats.pendingUsers}
          activeNowCount={adminStats.activeNow}
          pendingLeaveCount={adminStats.pendingLeave}
          taskBoard={taskBoard}
          hrStats={hrStats}
          onOpenPendingApprovals={() => router.push('/dashboard/(tabs)/route/admin?tab=employees&filter=Pending')}
          onOpenPendingLeave={() => router.push('/dashboard/(tabs)/route/request-management?status=Pending')}
          onOpenActiveNow={() => router.push('/dashboard/(tabs)/route/availability?filter=present')}
          onOpenProjectStatus={(status) => router.push(`/dashboard/(tabs)/route/project-manager?status=${encodeURIComponent(status)}`)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
