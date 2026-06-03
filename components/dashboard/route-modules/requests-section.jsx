import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import React from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardTopbar } from '@/components/dashboard/topbar';
import { isAdminOrHrRole, isHrRole } from '@/utils/roles';

import { AdminRequestsBoard } from './admin-requests-board';
import { RqColors, requestStyles as rq } from './request-styles';
import { PrettyRequestCard } from './pretty-request-card';

export function RequestsSection({ styles, ctx }) {
  const { width } = useWindowDimensions();
  const isSmallMobile = width < 360;
  const isTinyMobile = width < 320;
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
    filteredAdminManualRequests,
    filteredMyLeaveRequestsBoard,
    filteredMyManualRequestsBoard,
    requestAdminSearch,
    setRequestAdminSearch,
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
  const isOwnMyRequestsBoard =
    isMyRequestsRoute &&
    (isHrRole(user?.role) || user?.role === 'Employee' || user?.role === 'Team Leader');
  const canCreateOwnRequest =
    isOwnMyRequestsBoard && (user?.role === 'Employee' || user?.role === 'Team Leader');
  const isAdminReviewer = !isMyRequestsRoute && isAdminOrHrRole(user?.role);
  const useMgmtRequestUi = isAdminReviewer || isOwnMyRequestsBoard;
  const isManualTab =
    slug === 'manual-time-requests' || (isOwnMyRequestsBoard && myRequestsTab === 'manual');

  if (useMgmtRequestUi) {
    const leaveLabel = width > 400 ? 'Leave Requests' : isTinyMobile ? '' : 'Leave';
    const manualLabel = width > 400 ? 'Manual Time Requests' : isTinyMobile ? '' : 'Manual Time';
    const boardLeave = isOwnMyRequestsBoard ? filteredMyLeaveRequestsBoard : filteredAdminLeaveRequests;
    const boardManual = isOwnMyRequestsBoard ? filteredMyManualRequestsBoard : filteredAdminManualRequests;

    return (
      <SafeAreaView style={rq.safe} edges={['top']}>
        <DashboardTopbar />
        <ScrollView contentContainerStyle={rq.scroll} showsVerticalScrollIndicator={false}>
          <View style={rq.hero}>
            <View style={rq.heroIconWrap}>
              <MaterialCommunityIcons name="clipboard-check-outline" size={24} color={RqColors.blue} />
            </View>
            <View style={rq.heroTextWrap}>
              <Text style={rq.heroTitle}>{isOwnMyRequestsBoard ? 'My Requests' : 'Request Management'}</Text>
            </View>
          </View>

          <View style={rq.tabsCard}>
            <View style={rq.tabsRow}>
              <Pressable
                onPress={() => {
                  if (isOwnMyRequestsBoard) setMyRequestsTab('leave');
                  else router.push('/dashboard/(tabs)/route/request-management');
                }}
                style={[rq.tabBtn, isSmallMobile && { paddingVertical: 10 }, !isManualTab && rq.tabBtnActive]}
              >
                <MaterialCommunityIcons
                  name="account-outline"
                  size={isTinyMobile ? 18 : 20}
                  color={!isManualTab ? RqColors.blue : RqColors.textMuted}
                />
                {leaveLabel ? (
                  <Text style={[rq.tabText, isSmallMobile && { fontSize: 12 }, !isManualTab && rq.tabTextActive]} numberOfLines={1}>
                    {leaveLabel}
                  </Text>
                ) : null}
              </Pressable>
              <Pressable
                onPress={() => {
                  if (isOwnMyRequestsBoard) setMyRequestsTab('manual');
                  else router.push('/dashboard/(tabs)/route/manual-time-requests');
                }}
                style={[rq.tabBtn, isSmallMobile && { paddingVertical: 10 }, isManualTab && rq.tabBtnActive]}
              >
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={isTinyMobile ? 18 : 20}
                  color={isManualTab ? RqColors.blue : RqColors.textMuted}
                />
                {manualLabel ? (
                  <Text style={[rq.tabText, isSmallMobile && { fontSize: 12 }, isManualTab && rq.tabTextActive]} numberOfLines={1}>
                    {manualLabel}
                  </Text>
                ) : null}
              </Pressable>
            </View>
          </View>

          <AdminRequestsBoard
            isManualTab={isManualTab}
            leaveStatusFilter={leaveStatusFilter}
            setLeaveStatusFilter={setLeaveStatusFilter}
            manualStatusFilter={manualStatusFilter}
            setManualStatusFilter={setManualStatusFilter}
            requestAdminSearch={requestAdminSearch}
            setRequestAdminSearch={setRequestAdminSearch}
            filteredAdminLeaveRequests={boardLeave}
            filteredAdminManualRequests={boardManual}
            updateLeaveStatus={updateLeaveStatus}
            updateManualStatus={updateManualStatus}
            openRejectModal={openRejectModal}
            showActions={!isOwnMyRequestsBoard}
            searchPlaceholder={
              isOwnMyRequestsBoard ? 'Search your requests...' : 'Search by name, role or type...'
            }
            onCreatePress={
              canCreateOwnRequest
                ? () => (isManualTab ? setManualModalOpen(true) : setLeaveModalOpen(true))
                : undefined
            }
          />
        </ScrollView>

        {!isOwnMyRequestsBoard ? (
          <RejectModal
            rejectModalOpen={rejectModalOpen}
            setRejectModalOpen={setRejectModalOpen}
            rejectTargetType={rejectTargetType}
            rejectReason={rejectReason}
            setRejectReason={setRejectReason}
            submitRejectRequest={submitRejectRequest}
            styles={styles}
          />
        ) : null}

        {canCreateOwnRequest ? (
          <MyRequestCreateModals
            styles={styles}
            isManualTab={isManualTab}
            leaveModalOpen={leaveModalOpen}
            setLeaveModalOpen={setLeaveModalOpen}
            leaveType={leaveType}
            setLeaveType={setLeaveType}
            leaveTypeDropdownOpen={leaveTypeDropdownOpen}
            setLeaveTypeDropdownOpen={setLeaveTypeDropdownOpen}
            openLeaveDatePicker={openLeaveDatePicker}
            leaveFromDate={leaveFromDate}
            leaveToDate={leaveToDate}
            leaveReason={leaveReason}
            setLeaveReason={setLeaveReason}
            submitLeaveRequest={submitLeaveRequest}
            manualModalOpen={manualModalOpen}
            setManualModalOpen={setManualModalOpen}
            openManualDatePicker={openManualDatePicker}
            manualDate={manualDate}
            openManualTimePicker={openManualTimePicker}
            manualClockIn={manualClockIn}
            manualClockOut={manualClockOut}
            manualBreakOut={manualBreakOut}
            manualReason={manualReason}
            setManualReason={setManualReason}
            submitManualRequest={submitManualRequest}
          />
        ) : null}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <DashboardTopbar />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <MaterialCommunityIcons name="clipboard-check-outline" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>My Requests</Text>
          </View>
        </View>

        <View style={styles.requestTabsPanel}>
          <View style={styles.requestTabsBar}>
            <Pressable
              onPress={() => setMyRequestsTab('leave')}
              style={[styles.requestTabBtn, !isManualTab && styles.requestTabBtnActive]}
            >
              <Text style={[styles.requestTabText, !isManualTab && styles.requestTabTextActive]}>Leave requests</Text>
            </Pressable>
            <Pressable
              onPress={() => setMyRequestsTab('manual')}
              style={[styles.requestTabBtn, isManualTab && styles.requestTabBtnActive]}
            >
              <Text style={[styles.requestTabText, isManualTab && styles.requestTabTextActive]}>Manual time requests</Text>
            </Pressable>
          </View>
        </View>

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
                  <View key={req.id}>
                    <PrettyRequestCard req={req} isManual={isManualTab} showActions={false} />
                    {req.status === 'Rejected' && req.adminReason ? (
                      <View style={styles.myRejectReasonBox}>
                        <Text style={styles.rejectReasonTitle}>Admin feedback</Text>
                        <Text style={styles.rejectReasonText}>{req.adminReason}</Text>
                      </View>
                    ) : null}
                  </View>
                ))
              )}
            </View>
          </>
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

      <RejectModal
        rejectModalOpen={rejectModalOpen}
        setRejectModalOpen={setRejectModalOpen}
        rejectTargetType={rejectTargetType}
        rejectReason={rejectReason}
        setRejectReason={setRejectReason}
        submitRejectRequest={submitRejectRequest}
        styles={styles}
      />
    </SafeAreaView>
  );
}

function MyRequestCreateModals({
  styles,
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
  setManualModalOpen,
  openManualDatePicker,
  manualDate,
  openManualTimePicker,
  manualClockIn,
  manualClockOut,
  manualBreakOut,
  manualReason,
  setManualReason,
  submitManualRequest,
}) {
  return (
    <>
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
                          style={[styles.leaveTypeOption, leaveType === type && styles.leaveTypeOptionActive]}
                        >
                          <Text style={[styles.leaveTypeOptionText, leaveType === type && styles.leaveTypeOptionTextActive]}>
                            {type}
                          </Text>
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
    </>
  );
}

function RejectModal({
  rejectModalOpen,
  setRejectModalOpen,
  rejectTargetType,
  rejectReason,
  setRejectReason,
  submitRejectRequest,
  styles,
}) {
  return (
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
                <Pressable
                  style={[styles.modalPrimaryBtn, !rejectReason.trim() && styles.modalPrimaryBtnDisabled]}
                  onPress={submitRejectRequest}
                  disabled={!rejectReason.trim()}
                >
                  <Text style={styles.actionBtnText}>Confirm Reject</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
