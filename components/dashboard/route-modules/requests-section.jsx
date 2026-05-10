import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardTopbar } from '@/components/dashboard/topbar';
import { isAdminOrHrRole } from '@/utils/roles';

export function RequestsSection({ styles, ctx }) {
  const {
    slug,
    user,
    myRequestsTab,
    setMyRequestsTab,
    router,
    manualStatusFilter,
    setManualStatusFilter,
    leaveStatusFilter,
    setLeaveStatusFilter,
    manualRequests,
    filteredAdminLeaveRequests,
    updateManualStatus,
    updateLeaveStatus,
    openRejectModal,
    requestStatusMenuOpen,
    setRequestStatusMenuOpen,
    filteredMyManualRequests,
    filteredMyLeaveRequests,
    setManualModalOpen,
    leaveModalOpen,
    setLeaveModalOpen,
    leaveType,
    setLeaveType,
    leaveTypeDropdownOpen,
    setLeaveTypeDropdownOpen,
    openLeaveDatePicker,
    leaveFromDate,
    leaveToDate,
    leaveReason,
    setLeaveReason,
    submitLeaveRequest,
    manualModalOpen,
    openManualDatePicker,
    manualDate,
    openManualTimePicker,
    manualClockIn,
    manualClockOut,
    manualBreakOut,
    manualReason,
    setManualReason,
    submitManualRequest,
    rejectModalOpen,
    setRejectModalOpen,
    rejectTargetType,
    rejectReason,
    setRejectReason,
    submitRejectRequest,
  } = ctx;

  const isMyRequestsRoute = slug === 'my-requests';
  const isAdminReviewer = !isMyRequestsRoute && isAdminOrHrRole(user?.role);
  const isManualTab = slug === 'manual-time-requests' || (isMyRequestsRoute && myRequestsTab === 'manual');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <DashboardTopbar />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <MaterialCommunityIcons name="clipboard-check-outline" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>{isMyRequestsRoute ? 'My Requests' : 'Request Management'}</Text>
          </View>
        </View>

        <View style={styles.requestTabsPanel}>
          <View style={styles.requestTabsBar}>
            <Pressable
              onPress={() => {
                if (isMyRequestsRoute) setMyRequestsTab('leave');
                else router.push('/dashboard/(tabs)/route/request-management');
              }}
              style={[styles.requestTabBtn, !isManualTab && styles.requestTabBtnActive]}>
              <Text style={[styles.requestTabText, !isManualTab && styles.requestTabTextActive]}>Leave requests</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (isMyRequestsRoute) setMyRequestsTab('manual');
                else router.push('/dashboard/(tabs)/route/manual-time-requests');
              }}
              style={[styles.requestTabBtn, isManualTab && styles.requestTabBtnActive]}>
              <Text style={[styles.requestTabText, isManualTab && styles.requestTabTextActive]}>Manual time requests</Text>
            </Pressable>
          </View>
        </View>

        {isAdminReviewer ? (
          <View style={styles.panel}>
            <View style={styles.requestHeaderRow}>
              <Text style={styles.panelTitle}>{isManualTab ? 'Manual Time Requests' : 'Leave Requests'}</Text>
            </View>
            <View style={[styles.chipRow, { marginBottom: 8 }]}>
              {['All', 'Pending', 'Approved', 'Rejected'].map((st) => (
                <Pressable
                  key={st}
                  onPress={() => (isManualTab ? setManualStatusFilter(st) : setLeaveStatusFilter(st))}
                  style={[styles.filterChip, (isManualTab ? manualStatusFilter : leaveStatusFilter) === st && styles.filterChipActive]}>
                  <Text style={[styles.filterChipText, (isManualTab ? manualStatusFilter : leaveStatusFilter) === st && styles.filterChipTextActive]}>{st}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.panelSub}>{isManualTab ? 'View manual time requests by status.' : 'Approve or reject employee/TL/HR leave requests.'}</Text>
            {(isManualTab ? (manualStatusFilter === 'All' ? manualRequests : manualRequests.filter((r) => r.status === manualStatusFilter)) : filteredAdminLeaveRequests).map(
              (req) => (
                <View key={req.id} style={styles.requestCard}>
                  <View style={styles.requestTopRow}>
                    <Text style={styles.requestName}>{req.employee}</Text>
                    <Text style={styles.requestDate}>{isManualTab ? req.date : `${req.from} -> ${req.to}`}</Text>
                  </View>
                  <Text style={styles.requestMeta}>{req.role} - {isManualTab ? 'Manual Time' : req.type}</Text>
                  {isManualTab ? (
                    <>
                      <Text style={styles.requestMeta}>
                        {req.clockIn} {'->'} {req.clockOut}
                      </Text>
                      {req.breakOut ? <Text style={styles.requestMeta}>Break-out: {req.breakOut}</Text> : null}
                    </>
                  ) : null}
                  <Text style={styles.requestReason}>{req.reason}</Text>
                  {req.status === 'Rejected' && req.adminReason ? (
                    <View style={styles.rejectReasonBox}>
                      <Text style={styles.rejectReasonTitle}>Reject reason</Text>
                      <Text style={styles.rejectReasonText}>{req.adminReason}</Text>
                    </View>
                  ) : null}
                  <View style={styles.requestFooter}>
                    <View style={[styles.filterChip, req.status === 'Approved' && styles.approvedChip, req.status === 'Rejected' && styles.rejectedChip]}>
                      <Text style={[styles.filterChipText, req.status === 'Approved' && styles.approvedChipText, req.status === 'Rejected' && styles.rejectedChipText]}>
                        {req.status}
                      </Text>
                    </View>
                    {req.status === 'Pending' ? (
                      <View style={styles.taskActionRow}>
                        <Pressable style={styles.requestApproveBtn} onPress={() => (isManualTab ? updateManualStatus(req.id, 'Approved') : updateLeaveStatus(req.id, 'Approved'))}>
                          <Text style={styles.requestBtnText}>Approve</Text>
                        </Pressable>
                        <Pressable style={styles.requestRejectBtn} onPress={() => openRejectModal(req.id, isManualTab ? 'manual' : 'leave')}>
                          <Text style={styles.requestBtnText}>Reject</Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                </View>
              )
            )}
          </View>
        ) : (
          <>
            <View style={styles.myRequestsHeaderCard}>
              <View style={styles.myRequestsHeaderTop}>
                <Text style={styles.myRequestsHeaderTitle}>
                  {(isManualTab ? manualStatusFilter : leaveStatusFilter) === 'All' ? 'All Requests' : `${isManualTab ? manualStatusFilter : leaveStatusFilter} Requests`}
                </Text>
                <View style={styles.myRequestsTopActions}>
                  <View style={styles.myRequestsSelectWrap}>
                    <Pressable style={styles.requestStatusSelectInput} onPress={() => setRequestStatusMenuOpen((v) => !v)}>
                      <Text style={styles.requestStatusSelectText}>{isManualTab ? manualStatusFilter : leaveStatusFilter}</Text>
                      <MaterialCommunityIcons name="chevron-down" size={16} color="#94a3b8" />
                    </Pressable>
                    {requestStatusMenuOpen ? (
                      <View style={styles.requestStatusMenu}>
                        {['Pending', 'All', 'Approved', 'Rejected'].map((st) => (
                          <Pressable
                            key={st}
                            onPress={() => {
                              if (isManualTab) setManualStatusFilter(st);
                              else setLeaveStatusFilter(st);
                              setRequestStatusMenuOpen(false);
                            }}
                            style={[styles.requestStatusOption, (isManualTab ? manualStatusFilter : leaveStatusFilter) === st && styles.requestStatusOptionActive]}>
                            <Text
                              style={[
                                styles.requestStatusOptionText,
                                (isManualTab ? manualStatusFilter : leaveStatusFilter) === st && styles.requestStatusOptionTextActive,
                              ]}>
                              {st}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    ) : null}
                  </View>
                  <Pressable style={[styles.myRequestsCreateBtn, styles.myRequestsCreateBtnIconOnly]} onPress={() => (isManualTab ? setManualModalOpen(true) : setLeaveModalOpen(true))}>
                    <MaterialCommunityIcons name="plus-circle-outline" size={19} color="#fff" />
                  </Pressable>
                </View>
              </View>
            </View>

            <View style={styles.myRequestsListWrap}>
              {(isManualTab ? filteredMyManualRequests : filteredMyLeaveRequests).length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>{isManualTab ? 'No manual requests yet.' : 'No leave requests yet.'}</Text>
                </View>
              ) : (
                (isManualTab ? filteredMyManualRequests : filteredMyLeaveRequests).map((req) => (
                  <View
                    key={req.id}
                    style={[
                      styles.myRequestCard,
                      req.status === 'Approved' ? styles.myRequestCardApproved : req.status === 'Rejected' ? styles.myRequestCardRejected : styles.myRequestCardPending,
                    ]}>
                    <View style={styles.myRequestTopRow}>
                      <Text style={styles.myRequestName}>{isManualTab ? 'Manual Time' : req.type}</Text>
                      <Text style={styles.myRequestDate}>{isManualTab ? req.date : `${req.from} -> ${req.to}`}</Text>
                    </View>
                    {isManualTab ? (
                      <>
                        <Text style={styles.myRequestMeta}>
                          {req.clockIn} {'->'} {req.clockOut}
                        </Text>
                        {req.breakOut ? <Text style={styles.myRequestMeta}>Break-out: {req.breakOut}</Text> : null}
                      </>
                    ) : null}
                    <Text style={styles.myRequestReason}>{req.reason}</Text>
                    {req.status === 'Rejected' && req.adminReason ? (
                      <View style={styles.myRejectReasonBox}>
                        <Text style={styles.rejectReasonTitle}>Admin feedback</Text>
                        <Text style={styles.rejectReasonText}>{req.adminReason}</Text>
                      </View>
                    ) : null}
                    <View style={styles.myRequestFooter}>
                      <View style={[styles.filterChip, req.status === 'Approved' && styles.approvedChip, req.status === 'Rejected' && styles.rejectedChip]}>
                        <Text style={[styles.filterChipText, req.status === 'Approved' && styles.approvedChipText, req.status === 'Rejected' && styles.rejectedChipText]}>
                          {req.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      <Modal visible={leaveModalOpen} transparent animationType="slide" onRequestClose={() => setLeaveModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCardShell}>
            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Apply for Leave</Text>
                <Text style={styles.recordFieldLabel}>Leave Type</Text>
                <View style={styles.leaveTypeWrap}>
                  <Pressable style={styles.leaveTypeTrigger} onPress={() => setLeaveTypeDropdownOpen((v) => !v)}>
                    <Text style={styles.leaveTypeTriggerText}>{leaveType}</Text>
                    <MaterialCommunityIcons name="chevron-down" size={18} color="#64748b" />
                  </Pressable>
                  {leaveTypeDropdownOpen ? (
                    <View style={styles.leaveTypeMenu}>
                      {['Leave', 'Casual', 'Paid (Annual)'].map((type) => (
                        <Pressable
                          key={type}
                          onPress={() => {
                            setLeaveType(type);
                            setLeaveTypeDropdownOpen(false);
                          }}
                          style={[styles.leaveTypeOption, leaveType === type && styles.leaveTypeOptionActive]}>
                          <Text style={[styles.leaveTypeOptionText, leaveType === type && styles.leaveTypeOptionTextActive]}>{type}</Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </View>
                <View style={styles.dateFilterRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recordFieldLabel}>From</Text>
                    <Pressable style={styles.modalPickerField} onPress={() => openLeaveDatePicker('from')}>
                      <Text style={styles.modalPickerText}>{leaveFromDate || 'YYYY-MM-DD'}</Text>
                      <MaterialCommunityIcons name="calendar-month-outline" size={16} color="#64748b" />
                    </Pressable>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recordFieldLabel}>To</Text>
                    <Pressable style={styles.modalPickerField} onPress={() => openLeaveDatePicker('to')}>
                      <Text style={styles.modalPickerText}>{leaveToDate || 'YYYY-MM-DD'}</Text>
                      <MaterialCommunityIcons name="calendar-month-outline" size={16} color="#64748b" />
                    </Pressable>
                  </View>
                </View>
                <Text style={styles.recordFieldLabel}>Reason</Text>
                <TextInput
                  value={leaveReason}
                  onChangeText={setLeaveReason}
                  placeholder="Reason..."
                  placeholderTextColor="#94a3b8"
                  style={[styles.input, styles.textAreaSm]}
                  multiline
                  textAlignVertical="top"
                />
                <View style={styles.modalActions}>
                  <Pressable style={styles.cancelBtn} onPress={() => setLeaveModalOpen(false)}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </Pressable>
                  <Pressable style={styles.modalPrimaryBtn} onPress={submitLeaveRequest}>
                    <Text style={styles.actionBtnText}>Submit</Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={manualModalOpen} transparent animationType="slide" onRequestClose={() => setManualModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCardShell}>
            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Request Manual Time</Text>
                <View style={styles.dateFilterRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recordFieldLabel}>Date</Text>
                    <Pressable style={styles.modalPickerField} onPress={openManualDatePicker}>
                      <Text style={styles.modalPickerText}>{manualDate || 'YYYY-MM-DD'}</Text>
                      <MaterialCommunityIcons name="calendar-month-outline" size={16} color="#64748b" />
                    </Pressable>
                  </View>
                </View>
                <View style={styles.dateFilterRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recordFieldLabel}>Clock In</Text>
                    <Pressable style={styles.modalPickerField} onPress={() => openManualTimePicker('in')}>
                      <Text style={styles.modalPickerText}>{manualClockIn || '--:-- --'}</Text>
                      <MaterialCommunityIcons name="clock-outline" size={16} color="#64748b" />
                    </Pressable>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recordFieldLabel}>Clock Out</Text>
                    <Pressable style={styles.modalPickerField} onPress={() => openManualTimePicker('out')}>
                      <Text style={styles.modalPickerText}>{manualClockOut || '--:-- --'}</Text>
                      <MaterialCommunityIcons name="clock-outline" size={16} color="#64748b" />
                    </Pressable>
                  </View>
                </View>
                <View style={styles.dateFilterRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recordFieldLabel}>Break-out (optional)</Text>
                    <Pressable style={styles.modalPickerField} onPress={() => openManualTimePicker('breakOut')}>
                      <Text style={styles.modalPickerText}>{manualBreakOut || '--:-- --'}</Text>
                      <MaterialCommunityIcons name="clock-outline" size={16} color="#64748b" />
                    </Pressable>
                  </View>
                </View>
                <Text style={styles.recordFieldLabel}>Reason</Text>
                <TextInput
                  value={manualReason}
                  onChangeText={setManualReason}
                  placeholder="Reason..."
                  placeholderTextColor="#94a3b8"
                  style={[styles.input, styles.textAreaSm]}
                  multiline
                  textAlignVertical="top"
                />
                <View style={styles.modalActions}>
                  <Pressable style={styles.cancelBtn} onPress={() => setManualModalOpen(false)}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </Pressable>
                  <Pressable style={styles.modalPrimaryBtn} onPress={submitManualRequest}>
                    <Text style={styles.actionBtnText}>Submit</Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={rejectModalOpen} transparent animationType="slide" onRequestClose={() => setRejectModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCardShell}>
            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Reject {rejectTargetType === 'manual' ? 'Manual Time Request' : 'Leave Request'}</Text>
                <Text style={styles.panelSub}>Please provide reason for rejection.</Text>
                <TextInput
                  value={rejectReason}
                  onChangeText={setRejectReason}
                  placeholder="Write rejection reason..."
                  placeholderTextColor="#94a3b8"
                  style={[styles.input, styles.textAreaSm]}
                  multiline
                  textAlignVertical="top"
                />
                <View style={styles.modalActions}>
                  <Pressable style={styles.cancelBtn} onPress={() => setRejectModalOpen(false)}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </Pressable>
                  <Pressable style={[styles.modalPrimaryBtn, !rejectReason.trim() && styles.modalPrimaryBtnDisabled]} onPress={submitRejectRequest} disabled={!rejectReason.trim()}>
                    <Text style={styles.actionBtnText}>Confirm Reject</Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
