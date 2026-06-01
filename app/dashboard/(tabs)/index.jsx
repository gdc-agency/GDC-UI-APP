import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardTopbar } from '@/components/dashboard/topbar';
import { FloatingParticles } from '@/components/ui/floating-particles';
import { BrandColors } from '@/constants/brand';
import { useAuth } from '@/context/auth-context';
import { getMyTeamRoster, getPendingUsersCount, getWorkforceCount, listTasks } from '@/services/api';
import { buildDashboardTaskSnapshot, countTeamEmployeesInRoster } from '@/utils/dashboard-task-stats';
import { extractPendingUsersCount, extractWorkforceCount } from '@/utils/admin-api-response';
import { isAdminRole } from '@/utils/roles';

function StatCard({ label, value, icon, color, onPress }) {
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper style={[styles.statCard, { borderLeftColor: color }]} onPress={onPress}>
      <View style={[styles.statIcon, { backgroundColor: `${color}22` }]}>
        <MaterialCommunityIcons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </Wrapper>
  );
}

function HrWideCard({ label, value, icon, tint, iconColor, note, onPress }) {
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper style={[styles.hrStatCard, { borderLeftColor: iconColor }]} onPress={onPress}>
      <View style={styles.hrCardHead}>
        <View style={[styles.hrStatIcon, { backgroundColor: tint }]}>
          <MaterialCommunityIcons name={icon} size={18} color={iconColor} />
        </View>
        <View style={[styles.hrStatusPill, { backgroundColor: tint }]}>
          <Text style={[styles.hrStatusPillText, { color: iconColor }]}>Live</Text>
        </View>
      </View>

      <View style={styles.hrCardBody}>
        <View style={styles.hrCardMeta}>
          <Text style={styles.hrStatLabel} numberOfLines={1}>
            {label}
          </Text>
          <Text style={styles.hrStatNote} numberOfLines={1}>
            {note}
          </Text>
        </View>
        <View style={[styles.hrValueBadge, { borderColor: tint }]}>
          <Text style={styles.hrStatValue}>{value}</Text>
        </View>
      </View>
    </Wrapper>
  );
}

function TlDashboardCard({ label, value, icon, tint, iconColor, onPress }) {
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper style={[styles.tlDashCard, { borderLeftColor: iconColor }]} onPress={onPress}>
      <View style={styles.tlDashCardTop}>
        <View style={[styles.tlDashIconWrap, { backgroundColor: tint }]}>
          <MaterialCommunityIcons name={icon} size={16} color={iconColor} />
        </View>
        <View style={styles.tlDashDot} />
      </View>
      <Text style={styles.tlDashLabel}>{label}</Text>
      <Text style={styles.tlDashValue}>{value}</Text>
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

/** Backend / drivers may return counts as number or numeric string. */
function parseStatCount(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function fmtCount(n) {
  return n != null && Number.isFinite(Number(n)) ? String(n) : '—';
}

function RolePanel({
  role,
  onOpenPendingApprovals,
  onOpenPendingLeave,
  onOpenProjectStatus,
  workforceCount,
  pendingUsersCount,
  taskBoard,
}) {
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
      <View style={styles.rolePanel}>
        <Text style={styles.roleTitle}>Admin Workspace</Text>
        <Text style={styles.roleSub}>System overview, approvals, and policy control.</Text>
        <View style={styles.statGrid}>
          <StatCard label="Workforce" value={wf} icon="account-group-outline" color="#2563eb" />
          <StatCard label="Active Now" value="—" icon="pulse" color="#16a34a" />
          <StatCard label="Pending Leave" value="0" icon="calendar-clock-outline" color="#f59e0b" onPress={onOpenPendingLeave} />
          <StatCard label="Pending Tasks" value={p} icon="bullseye-arrow" color="#6366f1" onPress={() => onOpenProjectStatus?.('pending')} />
          <StatCard label="Overdue" value={od} icon="alert-circle-outline" color="#dc2626" onPress={() => onOpenProjectStatus?.('overdue')} />
          <StatCard label="Pending Approval" value={pend} icon="shield-check-outline" color="#9333ea" onPress={onOpenPendingApprovals} />
        </View>
      </View>
    );
  }

  if (role === 'HR') {
    return (
      <View style={styles.rolePanel}>
        <Text style={styles.roleTitle}>HR Dashboard</Text>
        <Text style={styles.roleSub}>Track requests, leaves, and people operations.</Text>
        <View style={styles.hrStatGrid}>
          <HrWideCard label="TEAM MEMBERS" value="2" icon="account-group-outline" tint="#ecf3ff" iconColor="#2563eb" note="Active people in roster" />
          <HrWideCard
            label="PENDING TASKS"
            value={p}
            icon="bullseye-arrow"
            tint="#efefff"
            iconColor="#6366f1"
            note="Your visible tasks"
            onPress={() => onOpenProjectStatus?.('pending')}
          />
          <HrWideCard
            label="IN PROGRESS"
            value={ip}
            icon="chart-box-outline"
            tint="#eef2ff"
            iconColor="#4f46e5"
            note="Your visible tasks"
            onPress={() => onOpenProjectStatus?.('in progress')}
          />
          <HrWideCard
            label="REVIEW"
            value={rv}
            icon="timer-outline"
            tint="#f5f3ff"
            iconColor="#7c3aed"
            note="Your visible tasks"
            onPress={() => onOpenProjectStatus?.('review')}
          />
          <HrWideCard
            label="SUBMITTED"
            value={sb}
            icon="arrow-top-right"
            tint="#ecfeff"
            iconColor="#0f766e"
            note="Your visible tasks"
            onPress={() => onOpenProjectStatus?.('submitted')}
          />
          <HrWideCard
            label="OVERDUE TASKS"
            value={od}
            icon="alert-circle-outline"
            tint="#fff1f2"
            iconColor="#e11d48"
            note="Past deadline (pending / in progress)"
            onPress={() => onOpenProjectStatus?.('overdue')}
          />
          <HrWideCard
            label="PENDING LEAVE"
            value="1"
            icon="calendar-month-outline"
            tint="#fff8e8"
            iconColor="#d4a017"
            note="Awaiting manager decision"
            onPress={onOpenPendingLeave}
          />
        </View>
      </View>
    );
  }

  if (role === 'Team Leader') {
    return (
      <View style={styles.rolePanel}>
        <Text style={styles.roleTitle}>Team Leader Dashboard</Text>
        <Text style={styles.roleSub}>Team delivery, assignments, and member progress.</Text>
        <View style={styles.tlDashGrid}>
          <TlDashboardCard
            label="TEAM MEMBERS"
            value={tlEmp}
            icon="account-group-outline"
            tint="#eff6ff"
            iconColor="#2563eb"
            onPress={() => onOpenProjectStatus?.('all')}
          />
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
    <View style={styles.rolePanel}>
      <Text style={styles.roleTitle}>Employee Dashboard</Text>
      <Text style={styles.roleSub}>Your work summary, activity, and tasks.</Text>
      <View style={styles.tlDashGrid}>
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

export default function DashboardHomeScreen() {
  const { user, token } = useAuth();
  const router = useRouter();
  const nowText = React.useMemo(() => new Date().toLocaleString(), []);
  const [adminStats, setAdminStats] = React.useState({ workforce: null, pendingUsers: null });
  const [taskBoard, setTaskBoard] = React.useState(EMPTY_TASK_BOARD);

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
      setAdminStats({ workforce: null, pendingUsers: null });
      return;
    }
    try {
      const [w, p] = await Promise.all([getWorkforceCount(token), getPendingUsersCount(token)]);
      setAdminStats({
        workforce: parseStatCount(extractWorkforceCount(w)),
        pendingUsers: parseStatCount(extractPendingUsersCount(p)),
      });
    } catch (e) {
      if (__DEV__ && e && typeof e.message === 'string') {
        console.warn('[dashboard] admin stats fetch failed:', e.message);
      }
      setAdminStats({ workforce: null, pendingUsers: null });
    }
  }, [user?.role, token]);

  useFocusEffect(
    React.useCallback(() => {
      void loadAdminStats();
      void loadDashboardTaskBoard();
    }, [loadAdminStats, loadDashboardTaskBoard]),
  );

  React.useEffect(() => {
    if (!token) return undefined;
    const id = setInterval(() => {
      void loadDashboardTaskBoard();
      if (isAdminRole(user?.role)) void loadAdminStats();
    }, 45000);
    return () => clearInterval(id);
  }, [token, user?.role, loadDashboardTaskBoard, loadAdminStats]);

  const gdcLabel = user?.gdc_id ? String(user.gdc_id) : `GDC-${String(user?.id ?? '0001').toUpperCase()}`;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <DashboardTopbar />

      <FloatingParticles density={1.15} style={styles.magicParticles} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, user?.role === 'Employee' && styles.heroCardEmployee]}>
          <View style={styles.heroTop}>
            <View style={styles.heroAvatarRing} accessibilityRole="image" accessibilityLabel="Profile photo">
              {user?.avatar ? (
                <Image
                  key={user.avatar}
                  source={{ uri: user.avatar }}
                  style={styles.heroAvatarImage}
                  contentFit="cover"
                  contentPosition="center"
                  transition={180}
                  cachePolicy="none"
                />
              ) : (
                <View style={styles.heroAvatarPlaceholder}>
                  <Text style={styles.heroAvatarFallback}>{roleCode(user?.role)}</Text>
                </View>
              )}
            </View>
            <View style={styles.heroMeta}>
              <Text style={styles.hello}>{user?.name ?? 'User'}</Text>
              <View style={styles.heroInfoPill}>
                <MaterialCommunityIcons name="shield-account-outline" size={13} color="#dbeafe" />
                <Text style={styles.heroText}>Role: {user?.role ?? 'Member'}</Text>
              </View>
              <View style={styles.heroInfoPill}>
                <MaterialCommunityIcons name="card-account-details-outline" size={13} color="#bfdbfe" />
                <Text style={styles.heroId}>GDC_ID: {gdcLabel}</Text>
              </View>
              <View style={styles.heroInfoPill}>
                <MaterialCommunityIcons name="clock-outline" size={13} color="#bfdbfe" />
                <Text style={styles.heroNow}>As of {nowText}</Text>
              </View>
            </View>
          </View>
          {isAdminRole(user?.role) ? <Text style={styles.workspaceTag}>Admin Workspace</Text> : null}
        </View>

        <RolePanel
          role={user?.role}
          workforceCount={adminStats.workforce}
          pendingUsersCount={adminStats.pendingUsers}
          taskBoard={taskBoard}
          onOpenPendingApprovals={() => router.push('/dashboard/(tabs)/route/admin?tab=employees&filter=Pending')}
          onOpenPendingLeave={() => router.push('/dashboard/(tabs)/route/request-management?status=Pending')}
          onOpenProjectStatus={(status) => router.push(`/dashboard/(tabs)/route/project-manager?status=${encodeURIComponent(status)}`)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BrandColors.pageBg },
  magicParticles: { zIndex: 0 },
  scroll: { flexGrow: 1, paddingHorizontal: 18, paddingBottom: 96, paddingTop: 4 },
  heroCard: {
    backgroundColor: '#0b4da6',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#0b4da6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 8,
  },
  heroCardEmployee: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.26)',
    shadowOpacity: 0.28,
    shadowRadius: 20,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  /** Filled circular avatar — image uses full diameter + overflow clip (no square-in-circle look). */
  heroAvatarRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.92)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
    elevation: 4,
  },
  heroAvatarImage: {
    width: '100%',
    height: '100%',
  },
  heroAvatarPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,23,42,0.25)',
  },
  heroAvatarFallback: { color: '#ffffff', fontSize: 17, fontWeight: '800', letterSpacing: 0.4 },
  heroMeta: { flex: 1 },
  hello: { color: '#fff', fontSize: 22, fontWeight: '800' },
  heroInfoPill: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  heroText: { color: '#dbeafe', fontSize: 12, fontWeight: '700' },
  heroId: { color: '#bfdbfe', fontSize: 11, fontWeight: '700' },
  heroNow: { color: '#bfdbfe', fontSize: 11, fontWeight: '600' },
  workspaceTag: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    color: '#e2e8f0',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  rolePanel: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#dbe4fb',
    padding: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  roleTitle: { fontSize: 16, fontWeight: '800', color: BrandColors.text },
  roleSub: { marginTop: 4, fontSize: 12, lineHeight: 18, color: BrandColors.textMuted },
  statGrid: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    width: '47%',
    minWidth: 140,
    flexGrow: 1,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 12,
    backgroundColor: '#f8fbff',
  },
  statIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statLabel: { marginTop: 8, fontSize: 11, color: BrandColors.textMuted, fontWeight: '700' },
  statValue: { marginTop: 2, fontSize: 22, color: BrandColors.text, fontWeight: '800' },
  hrStatGrid: { marginTop: 14, gap: 10 },
  hrStatCard: {
    width: '100%',
    minHeight: 126,
    borderRadius: 14,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
    borderColor: '#e6eaf4',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  hrCardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hrStatIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hrStatusPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  hrStatusPillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  hrCardBody: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  hrCardMeta: { flex: 1 },
  hrStatLabel: {
    fontSize: 12,
    lineHeight: 14,
    letterSpacing: 1,
    color: '#8a96a8',
    fontWeight: '800',
    textAlign: 'left',
  },
  hrStatNote: {
    marginTop: 6,
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  hrValueBadge: {
    minWidth: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    backgroundColor: '#f8fbff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hrStatValue: {
    fontSize: 34,
    lineHeight: 38,
    color: '#0f172a',
    fontWeight: '800',
  },
  tlDashGrid: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tlDashCard: {
    width: '48%',
    minHeight: 132,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 10,
    backgroundColor: '#fcfdff',
  },
  tlDashCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tlDashIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tlDashDot: {
    width: 9,
    height: 9,
    borderRadius: 99,
    backgroundColor: '#d1d5db',
  },
  tlDashLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  tlDashValue: {
    marginTop: 4,
    fontSize: 34,
    color: '#0f172a',
    fontWeight: '900',
    lineHeight: 38,
  },
});
