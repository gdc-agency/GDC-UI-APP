import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardTopbar } from '@/components/dashboard/topbar';
import { isAdminRole } from '@/utils/roles';

export function DailyUpdatesSection({
  styles,
  dateMode,
  setDateMode,
  user,
  reportingYmd = '',
  dailyScreenLoading = false,
  dailyScreenError = null,
  dailySaveBusy = false,
  employeeUpdate,
  setEmployeeUpdate,
  leaderSummary,
  setLeaderSummary,
  hrNote,
  setHrNote,
  memberSearch,
  setMemberSearch,
  memberStatusFilter,
  setMemberStatusFilter,
  filteredTlMembers,
  summarySearch,
  setSummarySearch,
  filteredTlRows,
  onSaveEmployeeUpdate,
  onSaveTlTeamSummary,
  onSaveHrNote,
}) {
  const [tlEmpDailyModal, setTlEmpDailyModal] = useState(
    /** @type {{ name: string; body: string; date: string } | null} */ (null),
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <DashboardTopbar />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Daily Updates</Text>
            <Text style={styles.heroSub}>
              {dateMode === 'today' ? 'Today reporting' : 'Yesterday reporting'} — {reportingYmd || new Date().toLocaleDateString()}
            </Text>
          </View>
        </View>

        <View style={styles.dateRow}>
          <Pressable style={[styles.dateChip, dateMode === 'today' && styles.dateChipActive]} onPress={() => setDateMode('today')}>
            <Text style={[styles.dateChipText, dateMode === 'today' && styles.dateChipTextActive]}>Today</Text>
          </Pressable>
          <Pressable style={[styles.dateChip, dateMode === 'yesterday' && styles.dateChipActive]} onPress={() => setDateMode('yesterday')}>
            <Text style={[styles.dateChipText, dateMode === 'yesterday' && styles.dateChipTextActive]}>Yesterday</Text>
          </Pressable>
        </View>

        {dailyScreenLoading ? (
          <View style={{ paddingVertical: 24, alignItems: 'center' }}>
            <ActivityIndicator size="small" color="#2563eb" />
          </View>
        ) : null}
        {dailyScreenError ? (
          <View style={styles.panel}>
            <Text style={[styles.detailText, { color: '#b91c1c' }]}>{dailyScreenError}</Text>
          </View>
        ) : null}

        {user?.role === 'Employee' ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Your daily update</Text>
            <Text style={styles.panelSub}>Tasks completed, blockers, and plan for next cycle.</Text>
            <TextInput
              value={employeeUpdate}
              onChangeText={setEmployeeUpdate}
              placeholder="Write your update..."
              placeholderTextColor="#94a3b8"
              style={[styles.input, styles.textArea]}
              multiline
              textAlignVertical="top"
            />
            <Pressable
              style={[styles.actionBtn, dailySaveBusy && styles.actionBtnDisabled]}
              disabled={dailySaveBusy}
              onPress={() => onSaveEmployeeUpdate?.()}>
              <Text style={styles.actionBtnText}>{dailySaveBusy ? 'Saving…' : 'Save Update'}</Text>
            </Pressable>
          </View>
        ) : null}

        {user?.role === 'Team Leader' ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Employees Data</Text>
            <Text style={styles.panelSub}>Review member submissions and post your team summary.</Text>
            <View style={styles.filterRow}>
              <View style={styles.searchWrap}>
                <MaterialCommunityIcons name="magnify" size={18} color="#94a3b8" />
                <TextInput
                  value={memberSearch}
                  onChangeText={setMemberSearch}
                  placeholder="Search member"
                  placeholderTextColor="#94a3b8"
                  style={styles.searchInput}
                />
              </View>
              <View style={styles.chipRow}>
                {['all', 'submitted', 'missing'].map((f) => (
                  <Pressable
                    key={f}
                    onPress={() => setMemberStatusFilter(f)}
                    style={[styles.filterChip, memberStatusFilter === f && styles.filterChipActive]}>
                    <Text style={[styles.filterChipText, memberStatusFilter === f && styles.filterChipTextActive]}>{f}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            {filteredTlMembers.map((m, idx) => {
              const key = m.memberId ? `tl-m-${m.memberId}` : `tl-n-${m.name}-${idx}`;
              const submitted =
                String(m.status || '').toLowerCase() === 'submitted' && String(m.updateBody || '').trim().length > 0;
              const statusColor = submitted ? '#5b21b6' : '#64748b';
              if (submitted) {
                return (
                  <Pressable
                    key={key}
                    onPress={() => setTlEmpDailyModal({ name: m.name, body: String(m.updateBody || ''), date: reportingYmd })}
                    style={({ pressed }) => [
                      styles.rowItem,
                      {
                        borderColor: '#c7d2fe',
                        backgroundColor: pressed ? '#eef2ff' : '#fafbff',
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`View daily update from ${m.name}`}>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <MaterialCommunityIcons name="account-circle-outline" size={22} color="#6366f1" />
                      <Text style={styles.rowName}>{m.name}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.rowStatus, { color: statusColor }]}>{m.status}</Text>
                      <MaterialCommunityIcons name="chevron-right" size={20} color="#94a3b8" />
                    </View>
                  </Pressable>
                );
              }
              return (
                <View key={key} style={styles.rowItem}>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <MaterialCommunityIcons name="account-outline" size={22} color="#94a3b8" />
                    <Text style={styles.rowName}>{m.name}</Text>
                  </View>
                  <Text style={[styles.rowStatus, { color: statusColor }]}>{m.status}</Text>
                </View>
              );
            })}
            <TextInput
              value={leaderSummary}
              onChangeText={setLeaderSummary}
              placeholder="Team summary for HR..."
              placeholderTextColor="#94a3b8"
              style={[styles.input, styles.textAreaSm]}
              multiline
              textAlignVertical="top"
            />
            <Pressable
              style={[styles.actionBtn, dailySaveBusy && styles.actionBtnDisabled]}
              disabled={dailySaveBusy}
              onPress={() => onSaveTlTeamSummary?.()}>
              <Text style={styles.actionBtnText}>{dailySaveBusy ? 'Saving…' : 'Save Team Summary'}</Text>
            </Pressable>
          </View>
        ) : null}

        {user?.role === 'HR' ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Team lead summaries</Text>
            <Text style={styles.panelSub}>Rollups from TLs for current reporting date.</Text>
            <View style={styles.filterRow}>
              <View style={styles.searchWrap}>
                <MaterialCommunityIcons name="magnify" size={18} color="#94a3b8" />
                <TextInput
                  value={summarySearch}
                  onChangeText={setSummarySearch}
                  placeholder="Search summaries"
                  placeholderTextColor="#94a3b8"
                  style={styles.searchInput}
                />
              </View>
            </View>
            {filteredTlRows.map((r) => (
              <View key={r.team} style={styles.tlCard}>
                <Text style={styles.tlTeam}>{r.team}</Text>
                <Text style={styles.tlLead}>{r.lead}</Text>
                <Text style={styles.tlBody}>{r.summary}</Text>
              </View>
            ))}
            <TextInput
              value={hrNote}
              onChangeText={setHrNote}
              placeholder="HR note for leadership..."
              placeholderTextColor="#94a3b8"
              style={[styles.input, styles.textAreaSm]}
              multiline
              textAlignVertical="top"
            />
            <Pressable
              style={[styles.actionBtn, dailySaveBusy && styles.actionBtnDisabled]}
              disabled={dailySaveBusy}
              onPress={() => onSaveHrNote?.()}>
              <Text style={styles.actionBtnText}>{dailySaveBusy ? 'Saving…' : 'Save HR Note'}</Text>
            </Pressable>
          </View>
        ) : null}

        {isAdminRole(user?.role) ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Admin</Text>
            <Text style={styles.panelSub}>Overview of team lead summaries and HR leadership note.</Text>
            <View style={styles.filterRow}>
              <View style={styles.searchWrap}>
                <MaterialCommunityIcons name="magnify" size={18} color="#94a3b8" />
                <TextInput
                  value={summarySearch}
                  onChangeText={setSummarySearch}
                  placeholder="Search summaries"
                  placeholderTextColor="#94a3b8"
                  style={styles.searchInput}
                />
              </View>
            </View>
            {filteredTlRows.map((r) => (
              <View key={r.team} style={styles.tlCard}>
                <Text style={styles.tlTeam}>{r.team}</Text>
                <Text style={styles.tlLead}>{r.lead}</Text>
                <Text style={styles.tlBody}>{r.summary}</Text>
              </View>
            ))}
            <View style={styles.hrNoteBox}>
              <Text style={styles.hrNoteTitle}>HR note for leadership</Text>
              <Text style={styles.hrNoteText}>{String(hrNote || '').trim() || 'No HR note for this date yet.'}</Text>
            </View>
          </View>
        ) : null}
      </ScrollView>

      <Modal
        visible={tlEmpDailyModal != null}
        transparent
        animationType="fade"
        onRequestClose={() => setTlEmpDailyModal(null)}>
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setTlEmpDailyModal(null)}
            accessibilityLabel="Dismiss dialog"
          />
          <View style={[styles.modalCardShell, { width: '100%', maxWidth: 400, zIndex: 1 }]} pointerEvents="box-none">
            <View style={[styles.modalCard, { padding: 0, overflow: 'hidden' }]}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  paddingHorizontal: 16,
                  paddingTop: 16,
                  paddingBottom: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: '#e2e8f0',
                  backgroundColor: '#f8fafc',
                }}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={[styles.formLabelUpper, { color: '#64748b', marginBottom: 4 }]}>Daily update</Text>
                  <Text style={styles.detailTitle}>{tlEmpDailyModal?.name ?? ''}</Text>
                  <Text style={styles.detailText}>
                    {dateMode === 'today' ? 'Today' : 'Yesterday'} · {tlEmpDailyModal?.date ?? reportingYmd}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setTlEmpDailyModal(null)}
                  hitSlop={12}
                  style={{ padding: 4 }}
                  accessibilityLabel="Close">
                  <MaterialCommunityIcons name="close" size={22} color="#64748b" />
                </Pressable>
              </View>
              <ScrollView
                style={{ maxHeight: 320 }}
                contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 14 }}
                showsVerticalScrollIndicator>
                <Text style={styles.detailBody}>{String(tlEmpDailyModal?.body ?? '').trim() || '—'}</Text>
              </ScrollView>
              <View style={{ paddingHorizontal: 16, paddingBottom: 16, paddingTop: 4 }}>
                <Pressable style={styles.modalPrimaryBtn} onPress={() => setTlEmpDailyModal(null)}>
                  <Text style={styles.actionBtnText}>Close</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
