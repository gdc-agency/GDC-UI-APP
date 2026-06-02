import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import { Image } from 'expo-image';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardTopbar } from '@/components/dashboard/topbar';
import { BrandColors } from '@/constants/brand';
import { getApiBaseUrl } from '@/constants/api-config';

/** Resolve relative storage paths (e.g. `/uploads/...`) against the API base URL. */
function resolveAvatarUri(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (/^(https?:|file:)/i.test(s)) return s;
  const base = getApiBaseUrl().replace(/\/$/, '');
  return `${base}${s.startsWith('/') ? s : `/${s}`}`;
}

/** Short labels in team UI (e.g. Team Leader → TL). */
function abbrevRole(role) {
  const r = String(role || '').trim();
  if (r === 'Team Leader') return 'TL';
  return r;
}

function initials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  return (parts[0]?.slice(0, 2) || '?').toUpperCase();
}

function expandedBodyMaxHeight(team) {
  const grid = 96;
  const membersHeader = 44;
  const row = 84;
  const padding = 52;
  return grid + membersHeader + team.members.length * row + padding;
}

function memberRoleTone(role) {
  if (role === 'Team Leader') return 'lead';
  if (role === 'Employee') return 'emp';
  return 'other';
}

/**
 * @param {{
 *   teams: Array<{ id: string; name: string; department: string; leaderName: string; leaderRole: string; leaderAvatarUrl: string | null; accent: string; members: { id: string; name: string; email: string; role: string; avatarUrl: string | null }[] }>;
 *   loading?: boolean;
 *   error?: string | null;
 *   onRetry?: () => void;
 *   canView?: boolean;
 *   searchQuery?: string;
 *   onSearchChange?: (q: string) => void;
 * }} props
 */
export function TeamsManagementSection({
  teams = [],
  loading = false,
  error = null,
  onRetry,
  canView = true,
  searchQuery = '',
  onSearchChange,
}) {
  const [expandedTeamId, setExpandedTeamId] = useState(/** @type {string | null} */ (null));

  const teamAnimKey = useMemo(() => [...teams.map((t) => t.id)].sort().join('|'), [teams]);

  const expandAnims = useMemo(() => {
    const o = {};
    teams.forEach((t) => {
      o[t.id] = new Animated.Value(0);
    });
    return o;
  }, [teamAnimKey]);

  const maxHeights = useMemo(() => Object.fromEntries(teams.map((t) => [t.id, expandedBodyMaxHeight(t)])), [teams]);

  const rosterSummary = useMemo(() => {
    const nTeams = teams.length;
    const nPeople = teams.reduce((acc, t) => acc + t.members.length, 0);
    return { nTeams, nPeople };
  }, [teams]);

  useEffect(() => {
    setExpandedTeamId((id) => (id && teams.some((t) => t.id === id) ? id : null));
  }, [teamAnimKey, teams]);

  useEffect(() => {
    teams.forEach((team) => {
      const anim = expandAnims[team.id];
      if (!anim) return;
      const to = expandedTeamId === team.id ? 1 : 0;
      Animated.timing(anim, {
        toValue: to,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    });
  }, [expandedTeamId, teams, expandAnims]);

  function toggleTeam(id) {
    setExpandedTeamId((cur) => (cur === id ? null : id));
  }

  if (!canView) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <DashboardTopbar />
        <View style={styles.centerBox}>
          <Text style={styles.emptyTitle}>Teams Management</Text>
          <Text style={styles.emptyText}>This screen is available to Admin and HR.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <DashboardTopbar />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <MaterialCommunityIcons name="account-group-outline" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Teams Management</Text>
            <Text style={styles.heroSub}>
              {loading
                ? 'Loading teams…'
                : error
                  ? 'Could not load roster'
                  : `${rosterSummary.nTeams} team${rosterSummary.nTeams !== 1 ? 's' : ''}`}
            </Text>
          </View>
        </View>

        {typeof onSearchChange === 'function' ? (
          <View style={styles.searchPanel}>
            <View style={styles.searchRow}>
              <MaterialCommunityIcons name="magnify" size={18} color="#94a3b8" />
              <TextInput
                value={searchQuery}
                onChangeText={onSearchChange}
                placeholder="Search team name…"
                placeholderTextColor="#94a3b8"
                style={styles.searchInput}
              />
            </View>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={BrandColors.primaryMid} />
          </View>
        ) : null}

        {!loading && error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            {typeof onRetry === 'function' ? (
              <TouchableOpacity style={styles.retryBtn} onPress={onRetry} activeOpacity={0.85}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {!loading && !error && teams.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No teams yet. Create teams and assign members on the server.</Text>
          </View>
        ) : null}

        {!loading && !error && teams.length > 0 ? (
          <View style={styles.list}>
            {teams.map((team) => {
              const isOpen = expandedTeamId === team.id;
              const anim = expandAnims[team.id];
              if (!anim) return null;
              const maxH = maxHeights[team.id] ?? 320;
              const chevronSpin = anim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '180deg'],
              });
              const bodyOpacity = anim.interpolate({
                inputRange: [0, 0.12, 1],
                outputRange: [0, 1, 1],
              });

              const leaderUri = resolveAvatarUri(team.leaderAvatarUrl);

              return (
                <View key={team.id} style={[styles.card, isOpen && styles.cardExpanded]}>
                  <Pressable
                    onPress={() => toggleTeam(team.id)}
                    style={({ pressed }) => [
                      styles.cardPressable,
                      pressed && styles.cardPressablePressed,
                      Platform.OS === 'web' ? { cursor: 'pointer' } : null,
                    ]}
                    android_ripple={{ color: '#e2e8f0' }}>
                    {isOpen ? (
                      <View style={styles.headerExpanded}>
                        <View style={[styles.teamIconLg, { backgroundColor: team.accent }]}>
                          <MaterialCommunityIcons name="account-group" size={26} color="#fff" />
                        </View>
                        <View style={styles.headerExpandedMain}>
                          <Text style={styles.teamName}>{team.name}</Text>
                          <View style={styles.leaderRow}>
                            <View style={[styles.leaderAvatar, { borderColor: `${team.accent}55` }]}>
                              {leaderUri ? (
                                <Image source={{ uri: leaderUri }} style={styles.leaderAvatarImg} contentFit="cover" cachePolicy="memory-disk" />
                              ) : (
                                <Text style={[styles.leaderAvatarText, { color: team.accent }]}>{initials(team.leaderName)}</Text>
                              )}
                            </View>
                            <Text style={styles.leaderName}>{team.leaderName}</Text>
                            <View style={styles.leaderBadge}>
                              <Text style={styles.leaderBadgeText}>{abbrevRole(team.leaderRole)}</Text>
                            </View>
                          </View>
                        </View>
                        <Animated.View style={[styles.chevronBtn, styles.chevronBtnOnExpanded, { transform: [{ rotate: chevronSpin }] }]}>
                          <MaterialCommunityIcons name="chevron-down" size={22} color="#64748b" />
                        </Animated.View>
                      </View>
                    ) : (
                      <View style={styles.headerCollapsed}>
                        <View style={[styles.teamIconSquircle, { backgroundColor: `${team.accent}26` }]}>
                          <MaterialCommunityIcons name="account-group" size={20} color={team.accent} />
                        </View>
                        <View style={styles.collapsedMain}>
                          <Text style={styles.teamNameSm} numberOfLines={1}>
                            {team.name}
                          </Text>
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            nestedScrollEnabled
                            keyboardShouldPersistTaps="handled"
                            style={styles.collapsedDetailsScroll}
                            contentContainerStyle={styles.collapsedDetailsScrollInner}>
                            <View style={styles.collapsedLeadSeg}>
                              <View style={styles.collapsedLeadAvatar}>
                                {leaderUri ? (
                                  <Image source={{ uri: leaderUri }} style={styles.collapsedLeadAvatarImg} contentFit="cover" cachePolicy="memory-disk" />
                                ) : (
                                  <Text style={styles.collapsedLeadAvatarTxt}>{initials(team.leaderName)}</Text>
                                )}
                              </View>
                              <Text style={styles.collapsedLeadName} numberOfLines={1}>
                                {team.leaderName}
                              </Text>
                              <View style={styles.collapsedTlPill}>
                                <Text style={styles.collapsedTlPillText} numberOfLines={1}>
                                  {abbrevRole(team.leaderRole)}
                                </Text>
                              </View>
                            </View>
                            <View style={styles.collapsedVBar} />
                            <View style={styles.collapsedSeg}>
                              <MaterialCommunityIcons name="office-building-outline" size={15} color="#94a3b8" />
                              <Text style={styles.collapsedSegText} numberOfLines={1}>
                                {team.department}
                              </Text>
                            </View>
                            <View style={styles.collapsedVBar} />
                            <View style={[styles.collapsedSeg, styles.collapsedSegMembers]}>
                              <MaterialCommunityIcons name="account-outline" size={15} color="#94a3b8" />
                              <Text style={styles.collapsedSegText} numberOfLines={1}>
                                {team.members.length} Members
                              </Text>
                            </View>
                          </ScrollView>
                        </View>
                        <Animated.View style={[styles.chevronBtn, { transform: [{ rotate: chevronSpin }] }]}>
                          <MaterialCommunityIcons name="chevron-down" size={22} color="#64748b" />
                        </Animated.View>
                      </View>
                    )}
                  </Pressable>

                  <Animated.View
                    pointerEvents={isOpen ? 'auto' : 'none'}
                    style={[
                      styles.expandClip,
                      {
                        maxHeight: anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, maxH],
                        }),
                        opacity: bodyOpacity,
                      },
                    ]}>
                    <View style={styles.gridRow}>
                      <View style={styles.gridCell}>
                        <Text style={styles.gridLabel}>DEPARTMENT</Text>
                        <View style={styles.gridValueRow}>
                          <MaterialCommunityIcons name="office-building-outline" size={16} color="#0d9488" />
                          <Text style={styles.gridValue}>{team.department}</Text>
                        </View>
                      </View>
                      <View style={styles.gridDivider} />
                      <View style={styles.gridCell}>
                        <Text style={styles.gridLabel}>MEMBERS</Text>
                        <View style={styles.gridValueRow}>
                          <MaterialCommunityIcons name="account-multiple-outline" size={16} color="#2563eb" />
                          <Text style={styles.gridValue}>{team.members.length} Members</Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.membersShell}>
                      <View style={styles.membersTitleRow}>
                        <MaterialCommunityIcons name="account-group-outline" size={18} color={BrandColors.primaryMid} />
                        <Text style={styles.membersTitle}>Team Members</Text>
                      </View>
                      {team.members.map((m, mi) => {
                        const tone = memberRoleTone(m.role);
                        const last = mi === team.members.length - 1;
                        const uri = resolveAvatarUri(m.avatarUrl);
                        const lead = tone === 'lead';
                        const emp = tone === 'emp';
                        return (
                          <View key={m.id} style={[styles.memberCard, last && styles.memberCardLast]}>
                            <View
                              style={[
                                styles.memberAvatar,
                                lead ? styles.memberAvatarLead : emp ? styles.memberAvatarEmp : styles.memberAvatarOther,
                              ]}>
                              {uri ? (
                                <Image source={{ uri }} style={styles.memberAvatarImg} contentFit="cover" cachePolicy="memory-disk" />
                              ) : (
                                <Text
                                  style={[
                                    styles.memberAvatarText,
                                    lead ? styles.memberAvatarTextLead : emp ? styles.memberAvatarTextEmp : styles.memberAvatarTextOther,
                                  ]}>
                                  {initials(m.name)}
                                </Text>
                              )}
                            </View>
                            <View style={styles.memberInfo}>
                              <Text style={styles.memberName}>{m.name}</Text>
                              <Text style={styles.memberEmail} numberOfLines={1}>
                                {m.email || '—'}
                              </Text>
                            </View>
                            <View
                              style={[
                                styles.rolePill,
                                lead ? styles.rolePillLead : emp ? styles.rolePillEmp : styles.rolePillOther,
                              ]}>
                              <Text
                                style={[
                                  styles.rolePillText,
                                  lead ? styles.rolePillTextLead : emp ? styles.rolePillTextEmp : styles.rolePillTextOther,
                                ]}
                                numberOfLines={1}>
                                {abbrevRole(m.role)}
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </Animated.View>
                </View>
              );
            })}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BrandColors.pageBg },
  scroll: { paddingHorizontal: 16, paddingBottom: 120 },
  searchPanel: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#dbe4fb',
    borderRadius: 12,
    paddingHorizontal: 10,
    backgroundColor: '#f8fafc',
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: BrandColors.text },
  centerBox: { flex: 1, padding: 24, justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: BrandColors.text, marginBottom: 8 },
  hero: {
    backgroundColor: BrandColors.primary,
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    marginTop: 4,
  },
  heroIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { color: '#fff', fontSize: 19, fontWeight: '800' },
  heroSub: { color: '#bfdbfe', fontSize: 12, marginTop: 4, fontWeight: '600' },
  loadingBox: { paddingVertical: 32, alignItems: 'center' },
  errorBox: {
    backgroundColor: '#fff1f2',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fecdd3',
    padding: 14,
    marginBottom: 12,
  },
  errorText: { color: '#9f1239', fontWeight: '600', fontSize: 14 },
  retryBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: BrandColors.primaryMid,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 18,
  },
  emptyText: { fontSize: 14, color: '#64748b', fontWeight: '600', lineHeight: 20 },
  list: { gap: 14 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  cardExpanded: {
    borderColor: '#93c5fd',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6,
  },
  cardPressable: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
  },
  cardPressablePressed: {
    opacity: Platform.OS === 'web' ? 0.92 : 1,
  },
  headerExpanded: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  teamIconLg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerExpandedMain: { flex: 1, minWidth: 0 },
  teamName: { fontSize: 18, fontWeight: '800', color: BrandColors.text },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  leaderAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  leaderAvatarImg: { width: '100%', height: '100%' },
  leaderAvatarText: { fontSize: 10, fontWeight: '800' },
  leaderName: { fontSize: 14, fontWeight: '700', color: '#334155' },
  leaderBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  leaderBadgeText: { fontSize: 11, fontWeight: '800', color: '#1d4ed8' },
  chevronBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  chevronBtnOnExpanded: {
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  headerCollapsed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  teamIconSquircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  collapsedMain: { flex: 1, minWidth: 0 },
  teamNameSm: { fontSize: 16, fontWeight: '800', color: BrandColors.text, letterSpacing: -0.2 },
  collapsedDetailsScroll: {
    marginTop: 8,
    maxHeight: 34,
    flexGrow: 0,
  },
  collapsedDetailsScrollInner: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    paddingRight: 12,
    gap: 0,
  },
  collapsedLeadSeg: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
    paddingRight: 10,
  },
  collapsedLeadAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexShrink: 0,
  },
  collapsedLeadAvatarImg: { width: '100%', height: '100%' },
  collapsedLeadAvatarTxt: { fontSize: 9, fontWeight: '800', color: '#475569' },
  collapsedLeadName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    maxWidth: 120,
    flexShrink: 0,
  },
  collapsedTlPill: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    flexShrink: 0,
    marginLeft: 2,
  },
  collapsedTlPillText: { fontSize: 10, fontWeight: '800', color: '#1d4ed8' },
  collapsedVBar: {
    width: StyleSheet.hairlineWidth,
    height: 14,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 10,
    flexShrink: 0,
    alignSelf: 'center',
  },
  collapsedSeg: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 0,
    paddingRight: 4,
  },
  collapsedSegMembers: {},
  collapsedSegText: { fontSize: 12, fontWeight: '600', color: '#64748b', maxWidth: 140 },
  gridRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 10,
    alignItems: 'stretch',
  },
  gridCell: { flex: 1, paddingHorizontal: 4 },
  gridDivider: { width: StyleSheet.hairlineWidth, backgroundColor: '#e2e8f0', marginVertical: 4 },
  gridLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  gridValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gridValue: { fontSize: 13, fontWeight: '700', color: '#334155', flex: 1 },
  expandClip: { overflow: 'hidden' },
  membersShell: {
    marginHorizontal: 12,
    marginBottom: 14,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  membersTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  membersTitle: { fontSize: 14, fontWeight: '800', color: '#1e3a8a' },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  memberCardLast: { marginBottom: 0 },
  memberAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  memberAvatarImg: { width: '100%', height: '100%' },
  memberAvatarLead: { backgroundColor: '#dbeafe' },
  memberAvatarEmp: { backgroundColor: '#d1fae5' },
  memberAvatarOther: { backgroundColor: '#f1f5f9' },
  memberAvatarText: { fontSize: 14, fontWeight: '800' },
  memberAvatarTextLead: { color: '#1d4ed8' },
  memberAvatarTextEmp: { color: '#047857' },
  memberAvatarTextOther: { color: '#475569' },
  memberInfo: { flex: 1, minWidth: 0 },
  memberName: { fontSize: 14, fontWeight: '800', color: BrandColors.text },
  memberEmail: { fontSize: 12, fontWeight: '600', color: '#64748b', marginTop: 2 },
  rolePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    flexShrink: 0,
    maxWidth: '46%',
  },
  rolePillLead: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  rolePillEmp: { backgroundColor: '#ecfdf5', borderColor: '#bbf7d0' },
  rolePillOther: { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' },
  rolePillText: { fontSize: 10, fontWeight: '800', textAlign: 'center' },
  rolePillTextLead: { color: '#1d4ed8' },
  rolePillTextEmp: { color: '#047857' },
  rolePillTextOther: { color: '#475569' },
});
