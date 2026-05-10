import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardTopbar } from '@/components/dashboard/topbar';
import { isAdminRole } from '@/utils/roles';

export function DailyUpdatesSection({
  styles,
  dateMode,
  setDateMode,
  user,
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
}) {
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
              {dateMode === 'today' ? 'Today reporting' : 'Yesterday reporting'} - {new Date().toLocaleDateString()}
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
            <Pressable style={styles.actionBtn}>
              <Text style={styles.actionBtnText}>Save Update</Text>
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
            {filteredTlMembers.map((m) => (
              <View key={m.name} style={styles.rowItem}>
                <Text style={styles.rowName}>{m.name}</Text>
                <Text style={styles.rowStatus}>{m.status}</Text>
              </View>
            ))}
            <TextInput
              value={leaderSummary}
              onChangeText={setLeaderSummary}
              placeholder="Team summary for HR..."
              placeholderTextColor="#94a3b8"
              style={[styles.input, styles.textAreaSm]}
              multiline
              textAlignVertical="top"
            />
            <Pressable style={styles.actionBtn}>
              <Text style={styles.actionBtnText}>Save Team Summary</Text>
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
            <Pressable style={styles.actionBtn}>
              <Text style={styles.actionBtnText}>Save HR Note</Text>
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
              <Text style={styles.hrNoteText}>Operations are stable. No major escalations reported today.</Text>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
