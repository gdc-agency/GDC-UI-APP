import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import React from 'react';
import {
  ActivityIndicator,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedBlock } from '@/components/ui/animated-block';
import { KeyboardAwareScrollView } from '@/components/ui/keyboard-aware-scroll-view';
import { DashboardTopbar } from '@/components/dashboard/topbar';
import { useTheme } from '@/context/theme-context';
import { displayRoleOptionsForPromotion } from '@/utils/admin-directory';

import { TimesheetUserAvatar } from './timesheet-user-avatar';
import { TimeControlPanel } from './time-control-panel';

export function AdminSection({ styles, ctx }) {
  const { colors, isDark } = useTheme();
  const {
    isCompactMobile = false,
    adminControlTab,
    setAdminControlTab,
    adminRoleFilter,
    setAdminRoleFilter,
    adminUserSearch,
    setAdminUserSearch,
    filteredAdminUsers,
    openRoleModal,
    adminUsersLoading,
    rejectAdminUser,
    deleteApprovedDirectoryUser,
    handleRemoveDepartment,
    shiftDate,
    setShiftDate,
    shiftStart,
    setShiftStart,
    shiftEnd,
    setShiftEnd,
    openShiftDatePicker,
    openShiftTimePicker,
    handleSaveShiftTiming,
    shiftSaveLoading = false,
    newDepartment,
    setNewDepartment,
    handleAddDepartment,
    deptAddLoading = false,
    departments,
    setDepartments,
    portalClients = [],
    portalStats = {},
    portalSearch = '',
    setPortalSearch,
    portalLoading = false,
    portalAddOpen = false,
    setPortalAddOpen,
    portalCompanyName = '',
    setPortalCompanyName,
    portalContactName = '',
    setPortalContactName,
    portalContactEmail = '',
    setPortalContactEmail,
    portalSaving = false,
    portalActionKey = null,
    portalShareClientId = null,
    setPortalShareClientId,
    portalShareType = 'report',
    setPortalShareType,
    portalShareTitle = '',
    setPortalShareTitle,
    portalShareSummary = '',
    setPortalShareSummary,
    handleCreatePortalClient,
    handleDeletePortalClient,
    handleInvitePortalClient,
    handleCreatePortalShare,
    refreshPortalClients,
    roleModalOpen,
    setRoleModalOpen,
    setSelectedAdminUserId,
    selectedAdminUser,
    applyAdminRole,
    adminRoleSavingTarget,
    adminDirectoryActionKey,
  } = ctx;

  /** Employee → TL → HR allowed; HR or TL cannot be demoted to lower roles. */
  const promoteRoleOptions = React.useMemo(
    () => displayRoleOptionsForPromotion(selectedAdminUser?.role),
    [selectedAdminUser?.role],
  );

  const closeRoleModal = React.useCallback(() => {
    if (adminRoleSavingTarget) return;
    setRoleModalOpen(false);
    setSelectedAdminUserId(null);
  }, [adminRoleSavingTarget, setRoleModalOpen, setSelectedAdminUserId]);

  const roleModalIconFor = React.useCallback((roleLabel) => {
    if (roleLabel === 'Team Leader') return 'account-group-outline';
    if (roleLabel === 'HR') return 'shield-check-outline';
    if (roleLabel === 'Admin') return 'shield-account-outline';
    return 'account-star-outline';
  }, []);

  const adminTabs = [
    {
      id: 'employees',
      label: 'Employee',
      title: 'Employee Management',
      icon: 'account-group-outline',
      color: '#7c3aed',
      tintBg: isDark ? '#1e1b4b' : '#f5f3ff',
      tintBgActive: isDark ? '#312e81' : '#ede9fe',
    },
    {
      id: 'time',
      label: 'Time',
      title: 'Time Control',
      icon: 'timer-outline',
      color: '#f97316',
      tintBg: isDark ? '#431407' : '#fff7ed',
      tintBgActive: isDark ? '#7c2d12' : '#ffedd5',
    },
    {
      id: 'departments',
      label: 'Department',
      title: 'Department',
      icon: 'office-building-outline',
      color: '#0d9488',
      tintBg: isDark ? '#042f2e' : '#f0fdfa',
      tintBgActive: isDark ? '#134e4a' : '#ccfbf1',
    },
    {
      id: 'client-portal',
      label: 'Clients',
      title: 'Client Portal',
      icon: 'briefcase-outline',
      color: '#2563eb',
      tintBg: isDark ? '#1e3a8a' : '#eff6ff',
      tintBgActive: isDark ? '#1e40af' : '#dbeafe',
    },
  ];
  const activeAdminTab = adminTabs.find((tab) => tab.id === adminControlTab) ?? adminTabs[0];

  React.useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  function onSelectAdminTab(tabId) {
    if (isCompactMobile) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setAdminControlTab(tabId);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <DashboardTopbar />
      <KeyboardAwareScrollView contentContainerStyle={styles.scroll}>
        <AnimatedBlock delay={0}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <MaterialCommunityIcons name="shield-check-outline" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Admin Control</Text>
          </View>
        </View>
        </AnimatedBlock>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Admin Panels</Text>
          <View style={styles.adminPanelTabsWrap}>
            <View style={styles.adminPanelTabsRow}>
              {adminTabs.map((tab) => {
                const active = adminControlTab === tab.id;
                return (
                  <Pressable
                    key={tab.id}
                    onPress={() => onSelectAdminTab(tab.id)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={tab.title}
                    style={styles.adminPanelTab}>
                    <View
                      style={[
                        styles.adminPanelTabIconWrap,
                        { backgroundColor: active ? tab.tintBgActive : tab.tintBg },
                      ]}>
                      <MaterialCommunityIcons name={tab.icon} size={22} color={tab.color} />
                    </View>
                    <Text
                      style={[styles.adminPanelTabLabel, active && { color: tab.color, fontWeight: '800' }]}
                      numberOfLines={1}>
                      {tab.label}
                    </Text>
                    {active ? (
                      <View style={[styles.adminPanelTabIndicator, { backgroundColor: tab.color }]} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {activeAdminTab.id === 'employees' ? (
          <View style={[styles.panel, styles.adminTabContentPanel]}>
            <Text style={styles.panelTitle}>Employee Management</Text>
            <View style={styles.adminFilterCard}>
              <View style={styles.adminRoleChipRow}>
                {['All', 'Employee', 'Team Leader', 'HR', 'Pending'].map((filter) => (
                  <Pressable key={filter} onPress={() => setAdminRoleFilter(filter)} style={[styles.filterChip, adminRoleFilter === filter && styles.filterChipActive]}>
                    <Text style={[styles.filterChipText, adminRoleFilter === filter && styles.filterChipTextActive]}>{filter}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={[styles.searchWrap, { marginTop: 10 }]}>
                <TextInput
                  value={adminUserSearch}
                  onChangeText={setAdminUserSearch}
                  placeholder="Search by name or WorkTym ID..."
                  placeholderTextColor={colors.inputPlaceholder}
                  style={styles.searchInput}
                />
              </View>
              <Text style={styles.panelSub}>
                Showing {filteredAdminUsers.length} user{filteredAdminUsers.length !== 1 ? 's' : ''} · {adminRoleFilter} filter
              </Text>
            </View>
            <Text style={styles.adminSectionTitle}>User Directory</Text>
            {adminUsersLoading ? (
              <ActivityIndicator style={{ marginVertical: 20 }} color={colors.primaryMid} />
            ) : null}
            {filteredAdminUsers.map((member) => (
              <View key={member.id != null ? `user-${member.id}` : member.gdcId} style={styles.adminUserCard}>
                <View style={styles.adminUserTop}>
                  <TimesheetUserAvatar name={member.name} avatarUrl={member.avatarUrl} size={44} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.adminMemberName}>{member.name}</Text>
                    <Text style={styles.adminMemberEmail}>{member.email}</Text>
                  </View>
                </View>
                <View style={styles.adminTagRow}>
                  <View style={styles.adminTagPill}>
                    <Text style={styles.adminTagText}>{member.role}</Text>
                  </View>
                  <View style={[styles.adminTagPill, member.accountStatus === 'Pending' ? styles.adminTagPending : styles.adminTagActive]}>
                    <Text style={[styles.adminTagText, member.accountStatus === 'Pending' ? styles.adminTagPendingText : styles.adminTagActiveText]}>
                      {member.accountStatus}
                    </Text>
                  </View>
                  <View style={[styles.adminTagPill, styles.adminTagId]}>
                    <Text style={styles.adminTagIdText}>{member.gdcId}</Text>
                  </View>
                </View>
                <Text style={styles.adminMemberMeta}>{member.team || 'No team assigned'}</Text>
                {member.accountStatus === 'Pending' ? <Text style={styles.adminAwaitingText}>Awaiting approval</Text> : null}
                <View style={styles.adminActionRow}>
                  <Pressable
                    style={styles.adminPromoteBtn}
                    disabled={Boolean(adminDirectoryActionKey)}
                    onPress={() => openRoleModal(member)}>
                    <MaterialCommunityIcons name="account-arrow-up-outline" size={14} color="#fff" />
                    <Text style={styles.adminPromoteText}>Promote / Role</Text>
                  </Pressable>
                  {member.accountStatus === 'Pending' ? (
                    <Pressable
                      style={styles.adminRejectBtn}
                      disabled={Boolean(adminDirectoryActionKey)}
                      onPress={() => rejectAdminUser(member)}>
                      {adminDirectoryActionKey === `reject-${String(member.id)}` ? (
                        <ActivityIndicator size="small" color="#dc2626" />
                      ) : (
                        <>
                          <MaterialCommunityIcons name="close-circle-outline" size={16} color="#dc2626" />
                          <Text style={styles.adminRejectText}>Reject</Text>
                        </>
                      )}
                    </Pressable>
                  ) : (
                    <TouchableOpacity
                      style={[styles.adminDeleteBtn, Platform.OS === 'web' ? { cursor: 'pointer' } : undefined]}
                      activeOpacity={0.75}
                      disabled={Boolean(adminDirectoryActionKey)}
                      hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                      accessibilityRole="button"
                      accessibilityLabel="Delete user"
                      onPress={() => deleteApprovedDirectoryUser(member)}>
                      {adminDirectoryActionKey === `delete-${String(member.id)}` ? (
                        <ActivityIndicator size="small" color="#ef4444" />
                      ) : (
                        <MaterialCommunityIcons name="trash-can-outline" size={15} color="#ef4444" />
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
            {filteredAdminUsers.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No employees found for this filter.</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {activeAdminTab.id === 'time' ? <TimeControlPanel ctx={{ ...ctx, styles }} /> : null}

        {activeAdminTab.id === 'departments' ? (
          <View style={[styles.panel, styles.adminTabContentPanel]}>
            <View style={styles.deptHeaderRow}>
              <View style={styles.deptHeaderTextCol}>
                <Text style={styles.deptHeaderTitle}>Department</Text>
                <Text style={styles.deptHeaderSub}>Manage all company departments.</Text>
              </View>
              <View style={styles.deptTotalBadge}>
                <Text style={styles.deptTotalBadgeText}>{departments.length} Total</Text>
              </View>
            </View>

            <View style={styles.deptNameInputWrap}>
              <TextInput
                value={newDepartment}
                onChangeText={setNewDepartment}
                placeholder="e.g. Graphic Design"
                placeholderTextColor={colors.inputPlaceholder}
                style={styles.deptNameInput}
              />
            </View>

            <Pressable
              style={[styles.deptAddPrimaryBtn, deptAddLoading && styles.adminPrimaryBtnDisabled]}
              onPress={handleAddDepartment}
              disabled={deptAddLoading}>
              {deptAddLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <MaterialCommunityIcons name="plus" size={22} color="#ffffff" />
              )}
              <Text style={styles.deptAddPrimaryText}>{deptAddLoading ? 'Adding…' : 'Add Department'}</Text>
            </Pressable>

            {departments.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No departments yet.</Text>
              </View>
            ) : (
              departments.map((dept) => (
                <View key={dept} style={styles.deptRow}>
                  <Text style={styles.deptName}>{dept}</Text>
                  <Pressable
                    style={styles.deptRemoveBtn}
                    onPress={() => handleRemoveDepartment?.(dept)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${dept}`}
                    hitSlop={8}>
                    <MaterialCommunityIcons name="trash-can-outline" size={18} color="#ef4444" />
                  </Pressable>
                </View>
              ))
            )}
          </View>
        ) : null}

        {activeAdminTab.id === 'client-portal' ? (
          <View style={[styles.panel, styles.adminTabContentPanel]}>
            <View style={styles.deptHeaderRow}>
              <View style={styles.deptHeaderTextCol}>
                <Text style={styles.deptHeaderTitle}>Client Portal</Text>
                <Text style={styles.deptHeaderSub}>Manage clients, invites, and shared content.</Text>
              </View>
              <Pressable
                style={styles.portalRefreshBtn}
                onPress={() => refreshPortalClients?.()}
                hitSlop={8}>
                <MaterialCommunityIcons name="refresh" size={18} color="#2563eb" />
              </Pressable>
            </View>

            <View style={styles.portalStatsGrid}>
              <View style={[styles.portalStatCard, { backgroundColor: isDark ? '#1e3a8a' : '#eff6ff' }]}>
                <Text style={[styles.portalStatLabel, { color: '#2563eb' }]}>Clients</Text>
                <Text style={[styles.portalStatValue, { color: '#1d4ed8' }]}>
                  {portalStats.totalClients ?? portalClients.length ?? 0}
                </Text>
              </View>
              <View style={[styles.portalStatCard, { backgroundColor: isDark ? '#14532d' : '#dcfce7' }]}>
                <Text style={[styles.portalStatLabel, { color: '#16a34a' }]}>Shares</Text>
                <Text style={[styles.portalStatValue, { color: '#15803d' }]}>
                  {portalStats.totalShares ?? 0}
                </Text>
              </View>
              <View style={[styles.portalStatCard, { backgroundColor: isDark ? '#4c1d95' : '#ede9fe' }]}>
                <Text style={[styles.portalStatLabel, { color: '#7c3aed' }]}>Users</Text>
                <Text style={[styles.portalStatValue, { color: '#6d28d9' }]}>
                  {portalStats.portalUsers ?? 0}
                </Text>
              </View>
              <View style={[styles.portalStatCard, { backgroundColor: isDark ? '#7c2d12' : '#ffedd5' }]}>
                <Text style={[styles.portalStatLabel, { color: '#ea580c' }]}>Engage</Text>
                <Text style={[styles.portalStatValue, { color: '#c2410c' }]}>
                  {portalStats.engagementPercent ?? 0}%
                </Text>
              </View>
            </View>

            <View style={[styles.searchWrap, { marginBottom: 10 }]}>
              <TextInput
                value={portalSearch}
                onChangeText={setPortalSearch}
                placeholder="Search company or email..."
                placeholderTextColor={colors.inputPlaceholder}
                style={styles.searchInput}
                onSubmitEditing={() => refreshPortalClients?.(portalSearch)}
                returnKeyType="search"
              />
            </View>
            <Pressable
              style={[styles.adminPromoteBtn, { backgroundColor: '#2563eb', marginBottom: 10, alignSelf: 'flex-start' }]}
              onPress={() => refreshPortalClients?.(portalSearch)}>
              <MaterialCommunityIcons name="magnify" size={14} color="#fff" />
              <Text style={styles.adminPromoteText}>Search</Text>
            </Pressable>

            <Pressable
              style={[styles.deptAddPrimaryBtn, { backgroundColor: '#2563eb' }]}
              onPress={() => setPortalAddOpen?.(true)}>
              <MaterialCommunityIcons name="plus" size={22} color="#ffffff" />
              <Text style={styles.deptAddPrimaryText}>Add Client</Text>
            </Pressable>

            {portalAddOpen ? (
              <View style={styles.portalAddCard}>
                <Text style={styles.adminSectionTitle}>New client</Text>
                <TextInput
                  value={portalCompanyName}
                  onChangeText={setPortalCompanyName}
                  placeholder="Company name *"
                  placeholderTextColor={colors.inputPlaceholder}
                  style={styles.portalInput}
                />
                <TextInput
                  value={portalContactName}
                  onChangeText={setPortalContactName}
                  placeholder="Contact name"
                  placeholderTextColor={colors.inputPlaceholder}
                  style={styles.portalInput}
                />
                <TextInput
                  value={portalContactEmail}
                  onChangeText={setPortalContactEmail}
                  placeholder="Contact email *"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholderTextColor={colors.inputPlaceholder}
                  style={styles.portalInput}
                />
                <View style={styles.adminActionRow}>
                  <Pressable
                    style={[styles.adminPromoteBtn, { backgroundColor: '#2563eb', flex: 1 }]}
                    disabled={portalSaving}
                    onPress={() => handleCreatePortalClient?.()}>
                    {portalSaving ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.adminPromoteText}>Save client</Text>
                    )}
                  </Pressable>
                  <Pressable
                    style={styles.adminRejectBtn}
                    onPress={() => setPortalAddOpen?.(false)}
                    disabled={portalSaving}>
                    <Text style={styles.adminRejectText}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {portalShareClientId ? (
              <View style={styles.portalAddCard}>
                <Text style={styles.adminSectionTitle}>Share with client</Text>
                <View style={styles.adminRoleChipRow}>
                  {[
                    ['report', 'Report'],
                    ['project', 'Project'],
                    ['invoice', 'Invoice'],
                    ['document', 'Document'],
                    ['announcement', 'Announce'],
                  ].map(([id, label]) => (
                    <Pressable
                      key={id}
                      onPress={() => setPortalShareType?.(id)}
                      style={[styles.filterChip, portalShareType === id && styles.filterChipActive]}>
                      <Text style={[styles.filterChipText, portalShareType === id && styles.filterChipTextActive]}>
                        {label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <TextInput
                  value={portalShareTitle}
                  onChangeText={setPortalShareTitle}
                  placeholder="Title *"
                  placeholderTextColor={colors.inputPlaceholder}
                  style={styles.portalInput}
                />
                <TextInput
                  value={portalShareSummary}
                  onChangeText={setPortalShareSummary}
                  placeholder="Summary (optional)"
                  placeholderTextColor={colors.inputPlaceholder}
                  style={[styles.portalInput, { minHeight: 64 }]}
                  multiline
                />
                <View style={styles.adminActionRow}>
                  <Pressable
                    style={[styles.adminPromoteBtn, { backgroundColor: '#2563eb', flex: 1 }]}
                    disabled={portalSaving}
                    onPress={() => handleCreatePortalShare?.()}>
                    {portalSaving ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.adminPromoteText}>Share</Text>
                    )}
                  </Pressable>
                  <Pressable
                    style={styles.adminRejectBtn}
                    onPress={() => setPortalShareClientId?.(null)}
                    disabled={portalSaving}>
                    <Text style={styles.adminRejectText}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            <Text style={[styles.adminSectionTitle, { marginTop: 8 }]}>Clients</Text>
            {portalLoading ? <ActivityIndicator style={{ marginVertical: 16 }} color={colors.primaryMid} /> : null}
            {!portalLoading && portalClients.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No clients yet. Add a client to get started.</Text>
              </View>
            ) : null}
            {portalClients.map((client) => (
              <View key={String(client.id)} style={styles.adminUserCard}>
                <Text style={styles.adminMemberName}>{client.companyName || 'Client'}</Text>
                <Text style={styles.adminMemberEmail}>
                  {client.contactName ? `${client.contactName} · ` : ''}
                  {client.contactEmail || '—'}
                </Text>
                <Text style={styles.adminMemberMeta}>
                  {client.shareCount ?? 0} shares · {client.userCount ?? 0} portal users ·{' '}
                  {String(client.status || 'active')}
                </Text>
                <View style={styles.adminActionRow}>
                  <Pressable
                    style={[styles.adminPromoteBtn, { backgroundColor: '#2563eb' }]}
                    disabled={Boolean(portalActionKey)}
                    onPress={() => handleInvitePortalClient?.(client)}>
                    {portalActionKey === `inv-${client.id}` ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <MaterialCommunityIcons name="email-fast-outline" size={14} color="#fff" />
                        <Text style={styles.adminPromoteText}>Invite</Text>
                      </>
                    )}
                  </Pressable>
                  <Pressable
                    style={[styles.adminPromoteBtn, { backgroundColor: '#0d9488' }]}
                    disabled={Boolean(portalActionKey)}
                    onPress={() => setPortalShareClientId?.(client.id)}>
                    <MaterialCommunityIcons name="share-variant-outline" size={14} color="#fff" />
                    <Text style={styles.adminPromoteText}>Share</Text>
                  </Pressable>
                  <TouchableOpacity
                    style={styles.adminDeleteBtn}
                    disabled={Boolean(portalActionKey)}
                    onPress={() => handleDeletePortalClient?.(client)}>
                    {portalActionKey === `del-${client.id}` ? (
                      <ActivityIndicator size="small" color="#ef4444" />
                    ) : (
                      <MaterialCommunityIcons name="trash-can-outline" size={15} color="#ef4444" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </KeyboardAwareScrollView>
      <Modal visible={roleModalOpen} transparent animationType="fade" onRequestClose={closeRoleModal}>
        <Pressable style={styles.modalOverlay} onPress={closeRoleModal}>
          <Pressable style={styles.adminRoleModal} onPress={(e) => e.stopPropagation()}>
            <View style={styles.adminRoleModalHead}>
              <View style={styles.adminRoleModalIcon}>
                <MaterialCommunityIcons name="account-star-outline" size={24} color={colors.primaryMid} />
              </View>
              <Pressable
                style={styles.adminRoleModalClose}
                onPress={closeRoleModal}
                disabled={Boolean(adminRoleSavingTarget)}
                hitSlop={8}>
                <MaterialCommunityIcons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            <Text style={styles.adminRoleTitle}>Promote or change role</Text>
            <Text style={styles.adminRoleUserName}>{selectedAdminUser?.name ?? 'Employee'}</Text>
            <Text style={styles.adminRoleUserId}>
              {selectedAdminUser?.gdcId ? `ID: ${selectedAdminUser.gdcId}` : ''}
            </Text>

            <View style={styles.adminRoleOptionsList}>
              {promoteRoleOptions.map((roleOption) => {
                const selected = selectedAdminUser?.role === roleOption;
                const saving = adminRoleSavingTarget === roleOption;
                const iconName = roleModalIconFor(roleOption);
                return (
                  <Pressable
                    key={roleOption}
                    style={[
                      styles.adminRoleOption,
                      selected && styles.adminRoleOptionSelected,
                      adminRoleSavingTarget && adminRoleSavingTarget !== roleOption && { opacity: 0.45 },
                    ]}
                    disabled={Boolean(adminRoleSavingTarget)}
                    onPress={() => applyAdminRole(roleOption)}>
                    <View
                      style={[
                        styles.adminRoleOptionIconWrap,
                        selected && styles.adminRoleOptionIconWrapSelected,
                      ]}>
                      {saving ? (
                        <ActivityIndicator size="small" color={colors.primaryMid} />
                      ) : (
                        <MaterialCommunityIcons
                          name={iconName}
                          size={20}
                          color={selected ? colors.primaryMid : colors.textSecondary}
                        />
                      )}
                    </View>
                    <Text
                      style={[styles.adminRoleOptionText, selected && styles.adminRoleOptionTextSelected]}
                      numberOfLines={1}>
                      {roleOption}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable style={styles.adminRoleCancelBtn} onPress={closeRoleModal} disabled={Boolean(adminRoleSavingTarget)}>
              <Text style={styles.adminRoleCancelBtnText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
