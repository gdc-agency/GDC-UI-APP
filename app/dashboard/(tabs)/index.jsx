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
    <Wrapper style={styles.statCard} onPress={onPress}>
      <View style={[styles.statIcon, { backgroundColor: `${color}22` }]}>
        <MaterialCommunityIcons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
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

function RolePanel({ role, onOpenPendingApprovals, onOpenPendingLeave }) {
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
        <View style={styles.statGrid}>
          <StatCard label="Pending Leaves" value="5" icon="calendar-clock" color="#f59e0b" />
          <StatCard label="Open Requests" value="4" icon="clipboard-list-outline" color="#7c3aed" />
          <StatCard label="Interviews" value="3" icon="account-voice" color="#0ea5e9" />
          <StatCard label="Approvals" value="2" icon="check-decagram-outline" color="#16a34a" />
        </View>
      </View>
    );
  }

  if (role === 'Team Leader') {
    return (
      <View style={styles.rolePanel}>
        <Text style={styles.roleTitle}>Team Leader Dashboard</Text>
        <Text style={styles.roleSub}>Team delivery, assignments, and member progress.</Text>
        <View style={styles.statGrid}>
          <StatCard label="Team Size" value="8" icon="account-multiple-outline" color="#2563eb" />
          <StatCard label="In Progress" value="6" icon="progress-clock" color="#7c3aed" />
          <StatCard label="Completed" value="9" icon="check-circle-outline" color="#16a34a" />
          <StatCard label="Overdue" value="1" icon="calendar-alert" color="#dc2626" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.rolePanel}>
      <Text style={styles.roleTitle}>Employee Dashboard</Text>
      <Text style={styles.roleSub}>Your work summary, activity, and tasks.</Text>
      <View style={styles.statGrid}>
        <StatCard label="My Tasks" value="4" icon="clipboard-check-outline" color="#2563eb" />
        <StatCard label="In Progress" value="2" icon="progress-wrench" color="#7c3aed" />
        <StatCard label="Submitted" value="1" icon="send-check-outline" color="#16a34a" />
        <StatCard label="Leaves" value="0" icon="calendar-remove" color="#dc2626" />
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
        <View style={styles.heroCard}>
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
              <Text style={styles.heroText}>Role: {user?.role ?? 'Member'}</Text>
              <Text style={styles.heroId}>GDC_ID: GDC-{String(user?.id ?? '0001').toUpperCase()}</Text>
              <Text style={styles.heroNow}>Date.Now: {nowText}</Text>
            </View>
          </View>
          {user?.role === 'Admin' ? <Text style={styles.workspaceTag}>Admin Workspace</Text> : null}
        </View>

        <RolePanel
          role={user?.role}
          onOpenPendingApprovals={() => router.push('/dashboard/(tabs)/route/admin?tab=employees&filter=Pending')}
          onOpenPendingLeave={() => router.push('/dashboard/(tabs)/route/request-management?status=Pending')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BrandColors.pageBg },
  scroll: { paddingHorizontal: 18, paddingBottom: 124, paddingTop: 4 },
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
  heroText: { color: '#dbeafe', fontSize: 13, marginTop: 6 },
  heroId: { color: '#bfdbfe', fontSize: 12, marginTop: 3, fontWeight: '600' },
  heroNow: { color: '#bfdbfe', fontSize: 12, marginTop: 3, fontWeight: '500' },
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
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 12,
    backgroundColor: '#f8fbff',
  },
  statIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statLabel: { marginTop: 8, fontSize: 11, color: BrandColors.textMuted, fontWeight: '700' },
  statValue: { marginTop: 2, fontSize: 22, color: BrandColors.text, fontWeight: '800' },
});
