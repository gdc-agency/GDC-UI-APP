import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardTopbar } from '@/components/dashboard/topbar';

export function AdminSection({ styles, ctx }) {
  const {
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
    newDepartment,
    setNewDepartment,
    handleAddDepartment,
    departments,
    setDepartments,
    roleModalOpen,
    setRoleModalOpen,
    setSelectedAdminUserId,
    selectedAdminUser,
    applyAdminRole,
  } = ctx;

  /** Employee → can be set to Employee / TL / HR. TL → cannot be demoted to Employee (matches backend rule). */
  const promoteRoleOptions = React.useMemo(() => {
    const base = ['Employee', 'Team Leader', 'HR'];
    if (selectedAdminUser?.role === 'Team Leader') {
      return base.filter((r) => r !== 'Employee');
    }
    return base;
  }, [selectedAdminUser?.role]);

  const adminTabs = [
    { id: 'employees', title: 'Employees management', icon: 'account-group-outline', color: '#4f46e5', note: 'Create employees, edit profiles, and assign roles.' },
    { id: 'time', title: 'Time control', icon: 'timer-outline', color: '#f97316', note: 'Manage attendance windows, shifts, and overtime rules.' },
    { id: 'departments', title: 'Departments control', icon: 'office-building-outline', color: '#0d9488', note: 'Manage departments, hierarchy, and reporting lines.' },
  ];
  const activeAdminTab = adminTabs.find((tab) => tab.id === adminControlTab) ?? adminTabs[0];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <DashboardTopbar />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <MaterialCommunityIcons name="shield-check-outline" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Admin Control</Text>
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Admin Panels</Text>
          <View style={styles.adminGrid}>
            {adminTabs.map((tab) => (
              <Pressable key={tab.id} onPress={() => setAdminControlTab(tab.id)} style={[styles.adminCard, adminControlTab === tab.id && styles.adminCardActive]}>
                <View style={[styles.adminIconWrap, { backgroundColor: `${tab.color}22` }]}>
                  <MaterialCommunityIcons name={tab.icon} size={20} color={tab.color} />
                </View>
                <Text style={styles.adminCardTitle}>{tab.title}</Text>
                <MaterialCommunityIcons
                  name={adminControlTab === tab.id ? 'check-circle' : 'chevron-right-circle-outline'}
                  size={20}
                  color={adminControlTab === tab.id ? '#2563eb' : '#94a3b8'}
                  style={styles.adminCardStatusIcon}
                />
              </Pressable>
            ))}
          </View>
        </View>

        {activeAdminTab.id === 'employees' ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Employees Management</Text>
            <View style={styles.adminFilterCard}>
              <View style={styles.chipRow}>
                {['All', 'Employee', 'Team Leader', 'HR', 'Pending'].map((filter) => (
                  <Pressable key={filter} onPress={() => setAdminRoleFilter(filter)} style={[styles.filterChip, adminRoleFilter === filter && styles.filterChipActive]}>
                    <Text style={[styles.filterChipText, adminRoleFilter === filter && styles.filterChipTextActive]}>{filter}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={[styles.searchWrap, { marginTop: 10 }]}>
                <MaterialCommunityIcons name="identifier" size={16} color="#94a3b8" />
                <TextInput
                  value={adminUserSearch}
                  onChangeText={setAdminUserSearch}
                  placeholder="Search by name or GDC ID..."
                  placeholderTextColor="#94a3b8"
                  style={styles.searchInput}
                />
              </View>
              <Text style={styles.panelSub}>
                Showing {filteredAdminUsers.length} user{filteredAdminUsers.length !== 1 ? 's' : ''} · {adminRoleFilter} filter
              </Text>
            </View>
            <Text style={styles.adminSectionTitle}>User Directory</Text>
            {adminUsersLoading ? (
              <ActivityIndicator style={{ marginVertical: 20 }} color="#2563eb" />
            ) : null}
            {filteredAdminUsers.map((member) => (
              <View key={member.id != null ? `user-${member.id}` : member.gdcId} style={styles.adminUserCard}>
                <View style={styles.adminUserTop}>
                  <View style={styles.adminMemberAvatar}>
                    <Text style={styles.adminMemberAvatarText}>{member.name.slice(0, 1)}</Text>
                  </View>
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
                  <Pressable style={[styles.adminPromoteBtn, { flex: 1 }]} onPress={() => openRoleModal(member)}>
                    <MaterialCommunityIcons name="account-arrow-up-outline" size={14} color="#fff" />
                    <Text style={styles.adminPromoteText}>Promote / Role</Text>
                  </Pressable>
                  {member.accountStatus === 'Pending' ? (
                    <Pressable style={styles.adminRejectBtn} onPress={() => rejectAdminUser(member)}>
                      <MaterialCommunityIcons name="close-circle-outline" size={16} color="#dc2626" />
                      <Text style={styles.adminRejectText}>Reject</Text>
                    </Pressable>
                  ) : (
                    <TouchableOpacity
                      style={[styles.adminDeleteBtn, Platform.OS === 'web' ? { cursor: 'pointer' } : undefined]}
                      activeOpacity={0.75}
                      hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                      accessibilityRole="button"
                      accessibilityLabel="Delete user"
                      onPress={() => deleteApprovedDirectoryUser(member)}>
                      <MaterialCommunityIcons name="trash-can-outline" size={15} color="#ef4444" />
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

        {activeAdminTab.id === 'time' ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Time Control</Text>
            <View style={styles.timeHeroCard}>
              <View style={styles.timeHeroIconWrap}>
                <MaterialCommunityIcons name="timer-sand" size={20} color="#f97316" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.timeHeroTitle}>Company office shift by date</Text>
              </View>
            </View>
            <View style={styles.timeFormRow}>
              <View style={styles.timeField}>
                <Text style={styles.timeFieldLabel}>Date</Text>
                <View style={styles.timeInputWrap}>
                  <TextInput value={shiftDate} onChangeText={setShiftDate} placeholder="YYYY-MM-DD" placeholderTextColor="#94a3b8" style={styles.timeInput} />
                  <Pressable onPress={openShiftDatePicker}>
                    <MaterialCommunityIcons name="calendar-blank-outline" size={16} color="#94a3b8" />
                  </Pressable>
                </View>
              </View>
            </View>
            <View style={styles.timeFormRow}>
              <View style={styles.timeFieldHalf}>
                <Text style={styles.timeFieldLabel}>Office start</Text>
                <View style={styles.timeInputWrap}>
                  <TextInput value={shiftStart} onChangeText={setShiftStart} placeholder="10:00 AM" placeholderTextColor="#94a3b8" style={styles.timeInput} />
                  <Pressable onPress={() => openShiftTimePicker('start')}>
                    <MaterialCommunityIcons name="clock-outline" size={16} color="#94a3b8" />
                  </Pressable>
                </View>
              </View>
              <View style={styles.timeFieldHalf}>
                <Text style={styles.timeFieldLabel}>Office end</Text>
                <View style={styles.timeInputWrap}>
                  <TextInput value={shiftEnd} onChangeText={setShiftEnd} placeholder="07:00 PM" placeholderTextColor="#94a3b8" style={styles.timeInput} />
                  <Pressable onPress={() => openShiftTimePicker('end')}>
                    <MaterialCommunityIcons name="clock-time-eight-outline" size={16} color="#94a3b8" />
                  </Pressable>
                </View>
              </View>
            </View>
            <View style={styles.timeSaveRow}>
              <Pressable style={styles.timeSaveBtn}>
                <Text style={styles.timeSaveText}>Save shift timing</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {activeAdminTab.id === 'departments' ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Departments control</Text>
            <Text style={styles.panelSub}>Manage the departments shown in forms and filters.</Text>
            <View style={styles.deptAddCard}>
              <Text style={styles.deptSectionLabel}>Add department</Text>
              <View style={styles.deptAddRow}>
                <View style={styles.deptInputWrap}>
                  <TextInput
                    value={newDepartment}
                    onChangeText={setNewDepartment}
                    placeholder="e.g. Graphic Design"
                    placeholderTextColor="#94a3b8"
                    style={styles.deptInput}
                  />
                </View>
                <Pressable style={styles.deptAddBtn} onPress={handleAddDepartment}>
                  <MaterialCommunityIcons name="plus" size={16} color="#fff" />
                  <Text style={styles.deptAddText}>Add</Text>
                </Pressable>
              </View>
            </View>
            <View style={styles.deptListHeader}>
              <Text style={styles.deptSectionLabel}>Current departments</Text>
              <Text style={styles.deptTotalText}>{departments.length} total</Text>
            </View>
            {departments.map((dept) => (
              <View key={dept} style={styles.deptRow}>
                <Text style={styles.deptName}>{dept}</Text>
                <Pressable style={styles.deptRemoveBtn} onPress={() => handleRemoveDepartment?.(dept)}>
                  <MaterialCommunityIcons name="trash-can-outline" size={15} color="#ef4444" />
                  <Text style={styles.deptRemoveText}>Remove</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
      <Modal
        visible={roleModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setRoleModalOpen(false);
          setSelectedAdminUserId(null);
        }}>
        <View style={styles.modalOverlay}>
          <View style={styles.adminRoleModal}>
            <View style={styles.adminRoleModalHead}>
              <View style={styles.adminRoleModalIcon}>
                <MaterialCommunityIcons name="shield-account-outline" size={22} color="#2563eb" />
              </View>
              <Pressable
                onPress={() => {
                  setRoleModalOpen(false);
                  setSelectedAdminUserId(null);
                }}>
                <MaterialCommunityIcons name="close" size={20} color="#94a3b8" />
              </Pressable>
            </View>
            <Text style={styles.adminRoleTitle}>Promote or change role</Text>
            <Text style={styles.adminRoleUserName}>{selectedAdminUser?.name ?? 'Employee'}</Text>
            <Text style={styles.adminRoleUserId}>{selectedAdminUser?.gdcId ?? ''}</Text>
            <View style={{ marginTop: 10, gap: 8 }}>
              {promoteRoleOptions.map((roleOption) => (
                <Pressable key={roleOption} style={styles.adminRoleOption} onPress={() => applyAdminRole(roleOption)}>
                  <Text style={styles.adminRoleOptionText}>{roleOption}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
