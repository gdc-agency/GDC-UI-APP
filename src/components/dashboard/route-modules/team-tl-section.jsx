import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import React from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardTopbar } from '@/components/dashboard/topbar';
import { useTheme } from '@/context/theme-context';

import { TimesheetUserAvatar } from './timesheet-user-avatar';

export function TeamTlSection({
  styles,
  teamAssignSearch,
  setTeamAssignSearch,
  groupedTeamAssignments,
  filteredTeamAssignments,
  teamRosterTotal = 0,
  canViewTeamRoster = false,
  rosterLoading = false,
  rosterError = null,
  onRetryRoster,
}) {
  const { colors } = useTheme();
  const showRosterBody = () => {
    if (!canViewTeamRoster) {
      return (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>Team roster is available to Admin and HR.</Text>
        </View>
      );
    }
    if (rosterLoading) {
      return (
        <View style={{ paddingVertical: 20, alignItems: 'center' }}>
          <ActivityIndicator color={colors.primaryMid} />
          <Text style={[styles.panelSub, { marginTop: 10, textAlign: 'center' }]}>Loading teams…</Text>
        </View>
      );
    }
    if (rosterError) {
      return (
        <View>
          <Text style={styles.emptyText}>{rosterError}</Text>
          {typeof onRetryRoster === 'function' ? (
            <TouchableOpacity style={styles.serverTeamsRetry} onPress={onRetryRoster} activeOpacity={0.85}>
              <Text style={styles.serverTeamsRetryText}>Retry</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      );
    }
    if (teamRosterTotal === 0) {
      return (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No team rosters yet. Create and manage teams on the website.</Text>
        </View>
      );
    }
    if (filteredTeamAssignments.length === 0) {
      return (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No people match your search.</Text>
        </View>
      );
    }
    return groupedTeamAssignments.map((group) => (
      <View key={group.tl} style={styles.tlGroupCard}>
        <View style={styles.tlGroupBanner}>
          <TimesheetUserAvatar name={group.tl} avatarUrl={group.leaderAvatarUrl} size={44} />
          <View style={{ flex: 1 }}>
            <Text style={styles.tlGroupLabel}>Team lead</Text>
            <Text style={styles.tlGroupName}>{group.tl}</Text>
            <View style={styles.tlTeamChips}>
              {group.teamNames.map((t) => (
                <View key={t} style={styles.tlTeamChip}>
                  <MaterialCommunityIcons name="account-group-outline" size={14} color={colors.primaryLight} />
                  <Text style={styles.tlTeamChipText}>{t}</Text>
                </View>
              ))}
            </View>
          </View>
          <View style={styles.tlGroupCountPill}>
            <Text style={styles.tlGroupCountNum}>{group.members.length}</Text>
            <Text style={styles.tlGroupCountLbl}>people</Text>
          </View>
        </View>

        <Text style={styles.taRosterTitle}>Roster</Text>
        {group.members.map((row) => (
          <View key={row.id} style={styles.taMemberCard}>
            <View style={styles.taMemberTop}>
              <TimesheetUserAvatar name={row.employee} avatarUrl={row.avatarUrl} size={44} />
              <View style={styles.taMemberInfo}>
                <Text style={styles.taMemberName}>{row.employee}</Text>
              </View>
              <View style={[styles.taRolePill, row.role === 'Team Leader' ? styles.taRolePillLead : styles.taRolePillEmp]}>
                <Text style={[styles.taRolePillText, row.role === 'Team Leader' ? styles.taRolePillTextLead : styles.taRolePillTextEmp]}>
                  {row.role ?? 'Employee'}
                </Text>
              </View>
            </View>
            <View style={styles.taDetailGrid}>
              <View style={styles.taDetailCell}>
                <Text style={styles.taDetailLabel}>Team</Text>
                <Text style={styles.taDetailValue}>{row.team}</Text>
              </View>
              <View style={styles.taDetailCell}>
                <Text style={styles.taDetailLabel}>Department</Text>
                <View style={styles.taDeptRow}>
                  <MaterialCommunityIcons name="office-building-outline" size={16} color={colors.primaryLight} />
                  <Text style={styles.taDetailValue}>{row.department ?? '—'}</Text>
                </View>
              </View>
              <View style={styles.taDetailCellFull}>
                <Text style={styles.taDetailLabel}>GDC ID</Text>
                <Text style={styles.taDetailValueMono}>{row.gdcId}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    ));
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <DashboardTopbar />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <MaterialCommunityIcons name="account-switch-outline" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Team Assign to TL</Text>
          </View>
        </View>

        <View style={[styles.panel, { marginBottom: 14 }]}>
          <Text style={styles.panelTitle}>Search</Text>
          <Text style={styles.panelSub}>Filter teams by member, team, department, role or team lead.</Text>
          <View style={styles.searchWrap}>
            <MaterialCommunityIcons name="magnify" size={18} color={colors.textSecondary} />
            <TextInput
              value={teamAssignSearch}
              onChangeText={setTeamAssignSearch}
              placeholder="Name, email, GDC-ID, team, department, role or TL."
              placeholderTextColor={colors.inputPlaceholder}
              style={styles.searchInput}
            />
          </View>
        </View>

        <View style={[styles.panel, { marginTop: 4 }]}>
          <Text style={styles.panelTitle}>Teams by leader</Text>
          <Text style={styles.panelSub}>
            {canViewTeamRoster && !rosterLoading && !rosterError
              ? `${groupedTeamAssignments.length} team${groupedTeamAssignments.length !== 1 ? 's' : ''} · ${filteredTeamAssignments.length} people`
              : 'Live data from your organization.'}
          </Text>
          {showRosterBody()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
