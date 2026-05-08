import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardTopbar } from '@/components/dashboard/topbar';
import { BrandColors } from '@/constants/brand';
import { useAuth } from '@/context/auth-context';

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
  if (role === 'Admin') return 'AD';
  if (role === 'Team Leader') return 'TL';
  if (role === 'HR') return 'HR';
  if (role === 'Employee') return 'EMP';
  return 'USR';
}

function RolePanel({ role, onOpenPendingApprovals, onOpenPendingLeave, onOpenProjectStatus }) {
  if (role === 'Admin') {
    return (
      <View style={styles.rolePanel}>
        <Text style={styles.roleTitle}>Admin Workspace</Text>
        <Text style={styles.roleSub}>System overview, approvals, and policy control.</Text>
        <View style={styles.statGrid}>
          <StatCard label="Workforce" value="16" icon="account-group-outline" color="#2563eb" />
          <StatCard label="Active Now" value="3" icon="pulse" color="#16a34a" />
          <StatCard label="Pending Leave" value="0" icon="calendar-clock-outline" color="#f59e0b" onPress={onOpenPendingLeave} />
          <StatCard label="Pending Tasks" value="2" icon="bullseye-arrow" color="#6366f1" />
          <StatCard label="Overdue" value="0" icon="alert-circle-outline" color="#dc2626" />
          <StatCard label="Pending Approval" value="0" icon="shield-check-outline" color="#9333ea" onPress={onOpenPendingApprovals} />
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
          <HrWideCard label="TEAM TASKS" value="0" icon="bullseye-arrow" tint="#efefff" iconColor="#6366f1" note="Open assignments today" />
          <HrWideCard label="COMPLETED" value="0" icon="check-circle-outline" tint="#ebfaf5" iconColor="#10b981" note="Tasks closed this week" />
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
          <TlDashboardCard label="EMPLOYEES" value="5" icon="account-group-outline" tint="#eff6ff" iconColor="#2563eb" onPress={() => onOpenProjectStatus?.('all')} />
          <TlDashboardCard label="PENDING" value="1" icon="clock-outline" tint="#fff7e6" iconColor="#d97706" onPress={() => onOpenProjectStatus?.('pending')} />
          <TlDashboardCard label="IN PROGRESS" value="0" icon="chart-box-outline" tint="#eef2ff" iconColor="#4f46e5" onPress={() => onOpenProjectStatus?.('in progress')} />
          <TlDashboardCard label="REVIEW" value="0" icon="timer-outline" tint="#f5f3ff" iconColor="#7c3aed" onPress={() => onOpenProjectStatus?.('review')} />
          <TlDashboardCard label="SUBMITTED" value="0" icon="arrow-top-right" tint="#ecfeff" iconColor="#0f766e" onPress={() => onOpenProjectStatus?.('submitted')} />
          <TlDashboardCard label="OVERDUE" value="1" icon="alert-circle-outline" tint="#fff1f2" iconColor="#e11d48" onPress={() => onOpenProjectStatus?.('overdue')} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.rolePanel}>
      <Text style={styles.roleTitle}>Employee Dashboard</Text>
      <Text style={styles.roleSub}>Your work summary, activity, and tasks.</Text>
      <View style={styles.tlDashGrid}>
        <TlDashboardCard label="PENDING" value="0" icon="clock-outline" tint="#fff7e6" iconColor="#d97706" onPress={() => onOpenProjectStatus?.('pending')} />
        <TlDashboardCard label="IN PROGRESS" value="0" icon="chart-box-outline" tint="#eef2ff" iconColor="#4f46e5" onPress={() => onOpenProjectStatus?.('in progress')} />
        <TlDashboardCard label="REVIEW" value="0" icon="timer-outline" tint="#f5f3ff" iconColor="#7c3aed" onPress={() => onOpenProjectStatus?.('review')} />
        <TlDashboardCard label="SUBMITTED" value="0" icon="arrow-top-right" tint="#ecfeff" iconColor="#0f766e" onPress={() => onOpenProjectStatus?.('submitted')} />
        <TlDashboardCard label="COMPLETED" value="0" icon="check-circle-outline" tint="#ecfdf5" iconColor="#10b981" onPress={() => onOpenProjectStatus?.('completed')} />
        <TlDashboardCard label="OVERDUE" value="0" icon="alert-circle-outline" tint="#fff1f2" iconColor="#e11d48" onPress={() => onOpenProjectStatus?.('overdue')} />
      </View>
    </View>
  );
}

export default function DashboardHomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const nowText = React.useMemo(() => new Date().toLocaleString(), []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <DashboardTopbar />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, user?.role === 'Employee' && styles.heroCardEmployee]}>
          <View style={styles.heroTop}>
            <View style={styles.heroAvatarWrap}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.heroAvatar} contentFit="cover" />
              ) : (
                <Text style={styles.heroAvatarFallback}>{roleCode(user?.role)}</Text>
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
                <Text style={styles.heroId}>GDC_ID: GDC-{String(user?.id ?? '0001').toUpperCase()}</Text>
              </View>
              <View style={styles.heroInfoPill}>
                <MaterialCommunityIcons name="clock-outline" size={13} color="#bfdbfe" />
                <Text style={styles.heroNow}>Date.Now: {nowText}</Text>
              </View>
            </View>
          </View>
          {user?.role === 'Admin' ? <Text style={styles.workspaceTag}>Admin Workspace</Text> : null}
        </View>

        <RolePanel
          role={user?.role}
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
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroAvatarWrap: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  heroAvatar: { width: 46, height: 46 },
  heroAvatarFallback: { color: '#ffffff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
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
