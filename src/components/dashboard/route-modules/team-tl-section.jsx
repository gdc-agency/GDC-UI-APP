import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import { ProfileAvatar } from '@/components/ui/profile-avatar';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { KeyboardAwareScrollView } from '@/components/ui/keyboard-aware-scroll-view';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardTopbar } from '@/components/dashboard/topbar';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/context/theme-context';
import { addEmployees, createTeam, detachMember } from '@/data/api/teams-api';
import { PressableScale } from '@/theme/animations/PressableScale';
import { STAGGER_MS, enterDown } from '@/theme/animations/motion';
import {
  buildTeamCards,
  getUnassignedEmployees,
  getUnassignedTeamLeaders,
} from '@/utils/build-team-assignments';

const TEAM_ACCENTS = [
  { solid: '#3b82f6', soft: '#eff6ff', darkSoft: '#172554' },
  { solid: '#f97316', soft: '#fff7ed', darkSoft: '#431407' },
  { solid: '#22c55e', soft: '#f0fdf4', darkSoft: '#052e16' },
  { solid: '#a855f7', soft: '#faf5ff', darkSoft: '#2e1065' },
];

function accentForIndex(index, isDark) {
  const a = TEAM_ACCENTS[index % TEAM_ACCENTS.length];
  return { solid: a.solid, soft: isDark ? a.darkSoft : a.soft };
}

function TeamAccentIcon({ index, isDark, styles, onCard = false }) {
  const { solid, soft } = accentForIndex(index, isDark);
  return (
    <View
      style={[
        styles.teamListIcon,
        {
          backgroundColor: onCard ? solid : soft,
        },
      ]}>
      <MaterialCommunityIcons name="account-group" size={24} color={onCard ? '#fff' : solid} />
    </View>
  );
}

function TeamLeadBadge({ accent, styles }) {
  return (
    <View style={[styles.teamListLeadPill, { backgroundColor: accent.soft, borderColor: `${accent.solid}55` }]}>
      <View style={[styles.teamListLeadDot, { backgroundColor: accent.solid }]} />
      <Text style={[styles.teamListLeadPillText, { color: accent.solid }]}>TEAM LEAD</Text>
    </View>
  );
}

function AnimatedStatValue({ value, style }) {
  const progress = useSharedValue(0);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, { duration: 520 });
    const steps = 18;
    let step = 0;
    const timer = setInterval(() => {
      step += 1;
      const next = Math.round((value * step) / steps);
      setDisplay(next);
      if (step >= steps) clearInterval(timer);
    }, 520 / steps);
    return () => clearInterval(timer);
  }, [value, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + progress.value * 0.65,
    transform: [{ scale: 0.92 + progress.value * 0.08 }],
  }));

  return (
    <Animated.Text style={[style, animatedStyle]}>{display}</Animated.Text>
  );
}

function TeamStatCard({ icon, color, value, label, delay, styles }) {
  return (
    <Animated.View entering={enterDown(delay)} style={styles.teamsStatCard}>
      <View style={styles.teamsStatTopRow}>
        <View style={[styles.teamsStatIconWrap, { backgroundColor: `${color}22` }]}>
          <MaterialCommunityIcons name={icon} size={20} color={color} />
        </View>
        <AnimatedStatValue value={value} style={styles.teamsStatValue} />
      </View>
      <Text style={styles.teamsStatLabel}>{label}</Text>
    </Animated.View>
  );
}

function MemberRolePill({ role, isLeader, styles }) {
  const lead = isLeader || role === 'Team Leader';
  return (
    <View style={[styles.taRolePill, lead ? styles.taRolePillLead : styles.taRolePillEmp]}>
      <Text style={[styles.taRolePillText, lead ? styles.taRolePillTextLead : styles.taRolePillTextEmp]}>
        {lead ? 'Leader' : 'Employee'}
      </Text>
    </View>
  );
}

export function TeamTlSection({
  styles,
  teamRosterTeams = [],
  teamRosterUsers = [],
  canViewTeamRoster = false,
  rosterLoading = false,
  rosterError = null,
  onRetryRoster,
}) {
  const { token } = useAuth();
  const { colors, isDark } = useTheme();
  const tabBarHeight = useBottomTabBarHeight();
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [listSearch, setListSearch] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [addSelected, setAddSelected] = useState(() => new Set());
  const [createSelected, setCreateSelected] = useState(() => new Set());
  const [createLeaderId, setCreateLeaderId] = useState(null);
  const [createTeamName, setCreateTeamName] = useState('');
  const [createDepartment, setCreateDepartment] = useState('');
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState(null);

  const teamCards = useMemo(
    () => buildTeamCards(teamRosterTeams, teamRosterUsers),
    [teamRosterTeams, teamRosterUsers],
  );
  const unassignedEmployees = useMemo(() => getUnassignedEmployees(teamRosterUsers), [teamRosterUsers]);
  const unassignedLeaders = useMemo(() => getUnassignedTeamLeaders(teamRosterUsers), [teamRosterUsers]);

  const totalMembers = useMemo(
    () => teamCards.reduce((sum, t) => sum + t.memberCount, 0),
    [teamCards],
  );

  const filteredTeams = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    if (!q) return teamCards;
    return teamCards.filter(
      (t) =>
        `${t.name} ${t.leaderName} ${t.department ?? ''} ${t.members.map((m) => m.name).join(' ')}`
          .toLowerCase()
          .includes(q),
    );
  }, [teamCards, listSearch]);

  const selectedTeam = useMemo(
    () => teamCards.find((t) => t.id === selectedTeamId) ?? null,
    [teamCards, selectedTeamId],
  );

  const selectedAccent = useMemo(() => {
    const idx = teamCards.findIndex((t) => t.id === selectedTeamId);
    return accentForIndex(idx >= 0 ? idx : 0, isDark);
  }, [teamCards, selectedTeamId, isDark]);

  const refreshAfterMutation = useCallback(async () => {
    if (typeof onRetryRoster === 'function') await onRetryRoster();
  }, [onRetryRoster]);

  const toggleAddId = useCallback((id) => {
    setAddSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleCreateId = useCallback((id) => {
    setCreateSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleRemoveMember = useCallback(
    (member) => {
      if (!selectedTeam || !token || member.isLeader) return;
      Alert.alert('Remove member', `Remove ${member.name} from ${selectedTeam.name}?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setRemovingId(member.id);
            try {
              await detachMember(token, { team_id: selectedTeam.id, user_id: member.id });
              await refreshAfterMutation();
            } catch (e) {
              Alert.alert('Remove failed', e?.message ?? 'Could not remove member');
            } finally {
              setRemovingId(null);
            }
          },
        },
      ]);
    },
    [selectedTeam, token, refreshAfterMutation],
  );

  const handleSaveAdds = useCallback(async () => {
    if (!selectedTeam || !token || addSelected.size === 0) return;
    setSaving(true);
    try {
      await addEmployees(token, {
        team_id: selectedTeam.id,
        employee_ids: [...addSelected],
      });
      setAddSelected(new Set());
      setEditOpen(false);
      await refreshAfterMutation();
    } catch (e) {
      Alert.alert('Add members failed', e?.message ?? 'Could not add members');
    } finally {
      setSaving(false);
    }
  }, [selectedTeam, token, addSelected, refreshAfterMutation]);

  const handleCreateTeam = useCallback(async () => {
    if (!token) return;
    const name = createTeamName.trim();
    const leaderId = createLeaderId;
    const employeeIds = [...createSelected];
    if (!name) {
      Alert.alert('Team name required', 'Enter a team name.');
      return;
    }
    if (!leaderId) {
      Alert.alert('Team lead required', 'Select a team leader.');
      return;
    }
    if (employeeIds.length < 1) {
      Alert.alert('Members required', 'Select at least one unassigned employee.');
      return;
    }
    setSaving(true);
    try {
      await createTeam(token, {
        name,
        department: createDepartment.trim() || undefined,
        leader_id: leaderId,
        employee_ids: employeeIds,
      });
      setCreateOpen(false);
      setCreateTeamName('');
      setCreateDepartment('');
      setCreateLeaderId(null);
      setCreateSelected(new Set());
      await refreshAfterMutation();
    } catch (e) {
      Alert.alert('Create team failed', e?.message ?? 'Could not create team');
    } finally {
      setSaving(false);
    }
  }, [token, createTeamName, createLeaderId, createSelected, createDepartment, refreshAfterMutation]);

  const openEdit = useCallback(() => {
    setAddSelected(new Set());
    setEditOpen(true);
  }, []);

  const openCreate = useCallback(() => {
    setCreateTeamName('');
    setCreateDepartment('');
    setCreateLeaderId(null);
    setCreateSelected(new Set());
    setCreateOpen(true);
  }, []);

  const rosterBody = () => {
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
    if (teamCards.length === 0) {
      return (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No teams yet. Tap + to create your first team.</Text>
        </View>
      );
    }
    if (filteredTeams.length === 0) {
      return (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No teams match your search.</Text>
        </View>
      );
    }
    return filteredTeams.map((team, index) => {
      const accent = accentForIndex(index, isDark);
      return (
        <Animated.View key={team.id} entering={enterDown(120 + index * STAGGER_MS)}>
          <PressableScale
            style={[styles.teamListCard, { borderColor: `${accent.solid}33` }]}
            onPress={() => setSelectedTeamId(team.id)}>
            <TeamAccentIcon index={index} isDark={isDark} styles={styles} onCard />
            <View style={styles.teamListBody}>
              <Text style={styles.teamListName}>{team.name}</Text>
              <Text style={styles.teamListMeta}>
                {team.memberCount} Member{team.memberCount !== 1 ? 's' : ''}
              </Text>
              <View style={styles.teamListLeadRow}>
                <TeamLeadBadge accent={accent} styles={styles} />
                <Text style={styles.teamListLead} numberOfLines={1}>
                  {team.leaderName}
                </Text>
              </View>
            </View>
            <View style={styles.teamListChevron}>
              <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
            </View>
          </PressableScale>
        </Animated.View>
      );
    });
  };

  const listView = (
    <>
      <View style={styles.teamsStatsRow}>
        <TeamStatCard
          icon="account-group-outline"
          color={colors.primaryMid}
          value={teamCards.length}
          label="Total Teams"
          delay={0}
          styles={styles}
        />
        <TeamStatCard
          icon="account-multiple-outline"
          color="#22c55e"
          value={totalMembers}
          label="Total Members"
          delay={70}
          styles={styles}
        />
      </View>

      <Animated.View entering={enterDown(90)} style={[styles.panel, { marginBottom: 14 }]}>
        <View style={styles.searchWrap}>
          <MaterialCommunityIcons name="magnify" size={18} color={colors.textSecondary} />
          <TextInput
            value={listSearch}
            onChangeText={setListSearch}
            placeholder="Search teams, leads, members…"
            placeholderTextColor={colors.inputPlaceholder}
            style={styles.searchInput}
          />
        </View>
      </Animated.View>

      <Animated.Text entering={enterDown(110)} style={styles.teamsSectionTitle}>
        All Teams
      </Animated.Text>
      {rosterBody()}
    </>
  );

  const detailView = selectedTeam ? (
    <>
      <Animated.View
        entering={enterDown(0)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <Pressable style={styles.teamBackBtn} onPress={() => setSelectedTeamId(null)}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <Text style={[styles.teamsSectionTitle, { marginBottom: 0, flex: 1 }]}>{selectedTeam.name}</Text>
      </Animated.View>

      <Animated.View entering={enterDown(60)} style={styles.teamDetailHeaderWrap}>
        <View style={[styles.teamDetailHero, { backgroundColor: selectedAccent.solid }]}>
          <MaterialCommunityIcons name="account-group" size={28} color="#fff" />
          <Text style={styles.teamDetailHeroTitle}>{selectedTeam.name}</Text>
          <Text style={styles.teamDetailHeroMeta}>
            {selectedTeam.memberCount} Member{selectedTeam.memberCount !== 1 ? 's' : ''}
            {selectedTeam.department ? ` · ${selectedTeam.department}` : ''}
          </Text>
        </View>

        <View style={styles.teamLeadCard}>
          <ProfileAvatar uri={selectedTeam.leaderAvatarUrl} name={selectedTeam.leaderName} size={52} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.teamLeadBadge}>Team Lead</Text>
            <Text style={styles.teamLeadName}>{selectedTeam.leaderName}</Text>
            {selectedTeam.leaderEmail ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                <MaterialCommunityIcons name="email-outline" size={14} color={colors.textMuted} />
                <Text style={styles.teamLeadEmail} numberOfLines={1}>
                  {selectedTeam.leaderEmail}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </Animated.View>

      <Animated.Text entering={enterDown(120)} style={styles.teamMembersTitle}>
        Team Members ({selectedTeam.memberCount})
      </Animated.Text>
      {selectedTeam.members.map((member, index) => (
        <Animated.View key={member.id} entering={enterDown(150 + index * STAGGER_MS)} style={styles.teamMemberRow}>
          <ProfileAvatar uri={member.avatarUrl} name={member.name} size={44} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.teamMemberName}>{member.name}</Text>
            <Text style={styles.teamMemberRole}>{member.department || '—'}</Text>
          </View>
          <MemberRolePill role={member.role} isLeader={member.isLeader} styles={styles} />
          {!member.isLeader ? (
            <Pressable
              style={styles.teamRemoveBtn}
              disabled={removingId === member.id}
              onPress={() => handleRemoveMember(member)}>
              {removingId === member.id ? (
                <ActivityIndicator size="small" color="#dc2626" />
              ) : (
                <MaterialCommunityIcons name="account-minus-outline" size={18} color="#dc2626" />
              )}
            </Pressable>
          ) : null}
        </Animated.View>
      ))}

      <Animated.View entering={enterDown(180 + selectedTeam.members.length * STAGGER_MS)}>
        <PressableScale style={styles.teamEditBtn} onPress={openEdit}>
          <MaterialCommunityIcons name="account-plus-outline" size={20} color="#fff" />
          <Text style={styles.teamEditBtnText}>Add / Edit Members</Text>
        </PressableScale>
      </Animated.View>
    </>
  ) : null;

  const editModal = (
    <Modal visible={editOpen} transparent animationType="slide" onRequestClose={() => !saving && setEditOpen(false)}>
      <Pressable style={styles.teamModalOverlay} onPress={() => !saving && setEditOpen(false)}>
        <Pressable style={styles.teamModalSheet} onPress={(e) => e.stopPropagation()}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={styles.teamModalTitle}>Add members</Text>
            <Pressable onPress={() => !saving && setEditOpen(false)} hitSlop={8}>
              <MaterialCommunityIcons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>
          <Text style={styles.teamModalSub}>
            Unassigned employees for {selectedTeam?.name ?? 'this team'}
          </Text>

          <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
            {unassignedEmployees.length === 0 ? (
              <Text style={styles.emptyText}>No unassigned employees available.</Text>
            ) : (
              unassignedEmployees.map((emp) => {
                const active = addSelected.has(emp.id);
                return (
                  <Pressable
                    key={emp.id}
                    style={[styles.teamCheckRow, active && styles.teamCheckRowActive]}
                    onPress={() => toggleAddId(emp.id)}>
                    <ProfileAvatar uri={emp.avatarUrl} name={emp.name} size={40} />
                    <View style={styles.teamCheckLabel}>
                      <Text style={styles.teamCheckName}>{emp.name}</Text>
                      <Text style={styles.teamCheckMeta}>{emp.email || emp.department || emp.gdcId}</Text>
                    </View>
                    <MaterialCommunityIcons
                      name={active ? 'checkbox-marked' : 'checkbox-blank-outline'}
                      size={22}
                      color={active ? colors.primaryMid : colors.textMuted}
                    />
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          <View style={styles.teamModalActions}>
            <Pressable style={styles.teamModalGhost} disabled={saving} onPress={() => setEditOpen(false)}>
              <Text style={styles.teamModalGhostText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.teamModalPrimary, (saving || addSelected.size === 0) && { opacity: 0.5 }]}
              disabled={saving || addSelected.size === 0}
              onPress={handleSaveAdds}>
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.teamModalPrimaryText}>Add {addSelected.size || ''} member{addSelected.size !== 1 ? 's' : ''}</Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );

  const createModal = (
    <Modal visible={createOpen} transparent animationType="slide" onRequestClose={() => !saving && setCreateOpen(false)}>
      <Pressable style={styles.teamModalOverlay} onPress={() => !saving && setCreateOpen(false)}>
        <Pressable style={styles.teamModalSheet} onPress={(e) => e.stopPropagation()}>
          <KeyboardAwareScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={styles.teamModalTitle}>Create team</Text>
            <Pressable onPress={() => !saving && setCreateOpen(false)} hitSlop={8}>
              <MaterialCommunityIcons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>
          <Text style={styles.teamModalSub}>Assign a team lead and unassigned employees.</Text>

          <Text style={styles.teamModalSection}>Team name</Text>
          <TextInput
            value={createTeamName}
            onChangeText={setCreateTeamName}
            placeholder="e.g. Alpha Team"
            placeholderTextColor={colors.inputPlaceholder}
            style={styles.teamFormInput}
          />
          <Text style={styles.teamModalSection}>Department (optional)</Text>
          <TextInput
            value={createDepartment}
            onChangeText={setCreateDepartment}
            placeholder="e.g. MERN Stack"
            placeholderTextColor={colors.inputPlaceholder}
            style={styles.teamFormInput}
          />

          <Text style={styles.teamModalSection}>Team lead</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {unassignedLeaders.length === 0 ? (
                <Text style={styles.emptyText}>No unassigned team leaders.</Text>
              ) : (
                unassignedLeaders.map((lead) => {
                  const active = createLeaderId === lead.id;
                  return (
                    <Pressable
                      key={lead.id}
                      style={[
                        styles.teamCheckRow,
                        { minWidth: 160, marginBottom: 0 },
                        active && styles.teamCheckRowActive,
                      ]}
                      onPress={() => setCreateLeaderId(lead.id)}>
                      <ProfileAvatar uri={lead.avatarUrl} name={lead.name} size={36} />
                      <Text style={[styles.teamCheckName, { flex: 1 }]} numberOfLines={1}>
                        {lead.name}
                      </Text>
                    </Pressable>
                  );
                })
              )}
            </View>
          </ScrollView>

          <Text style={styles.teamModalSection}>Members (unassigned)</Text>
          <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
            {unassignedEmployees.length === 0 ? (
              <Text style={styles.emptyText}>No unassigned employees.</Text>
            ) : (
              unassignedEmployees.map((emp) => {
                const active = createSelected.has(emp.id);
                return (
                  <Pressable
                    key={emp.id}
                    style={[styles.teamCheckRow, active && styles.teamCheckRowActive]}
                    onPress={() => toggleCreateId(emp.id)}>
                    <ProfileAvatar uri={emp.avatarUrl} name={emp.name} size={40} />
                    <View style={styles.teamCheckLabel}>
                      <Text style={styles.teamCheckName}>{emp.name}</Text>
                      <Text style={styles.teamCheckMeta}>{emp.email || emp.gdcId}</Text>
                    </View>
                    <MaterialCommunityIcons
                      name={active ? 'checkbox-marked' : 'checkbox-blank-outline'}
                      size={22}
                      color={active ? colors.primaryMid : colors.textMuted}
                    />
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          <View style={styles.teamModalActions}>
            <Pressable style={styles.teamModalGhost} disabled={saving} onPress={() => setCreateOpen(false)}>
              <Text style={styles.teamModalGhostText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.teamModalPrimary} disabled={saving} onPress={handleCreateTeam}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.teamModalPrimaryText}>Create team</Text>}
            </Pressable>
          </View>
          </KeyboardAwareScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );

  const showCreateFab = canViewTeamRoster && !rosterLoading && !selectedTeamId;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <DashboardTopbar />
      <View style={{ flex: 1, position: 'relative' }}>
        <KeyboardAwareScrollView
          contentContainerStyle={[
            styles.scroll,
            showCreateFab ? { paddingBottom: tabBarHeight + 96 } : { paddingBottom: tabBarHeight + 20 },
          ]}>
          {!selectedTeamId ? (
            <>
              <Animated.View entering={enterDown(0)} style={styles.hero}>
                <View style={styles.heroIcon}>
                  <MaterialCommunityIcons name="account-group-outline" size={20} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroTitle}>Team Assign to TL</Text>
                </View>
              </Animated.View>
              {listView}
            </>
          ) : (
            detailView
          )}
        </KeyboardAwareScrollView>

        {showCreateFab ? (
          <Animated.View
            entering={FadeIn.delay(220).duration(300)}
            style={[styles.teamFab, { bottom: tabBarHeight + 18 }]}>
            <PressableScale
              style={{ flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' }}
              onPress={openCreate}
              accessibilityLabel="Create team">
              <MaterialCommunityIcons name="plus" size={26} color="#fff" />
            </PressableScale>
          </Animated.View>
        ) : null}
      </View>
      {editModal}
      {createModal}
    </SafeAreaView>
  );
}
