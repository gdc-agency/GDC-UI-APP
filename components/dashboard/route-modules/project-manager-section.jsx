import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { DashboardTopbar } from '@/components/dashboard/topbar';
import { isAdminRole } from '@/utils/roles';

export function ProjectManagerSection({
  styles,
  user,
  isCompactMobile,
  projectSearch,
  setProjectSearch,
  projectStatusFilter,
  setProjectStatusFilter,
  projectStatusMenuOpen,
  setProjectStatusMenuOpen,
  projectFromDate,
  setProjectFromDate,
  projectToDate,
  setProjectToDate,
  setCreateTaskOpen,
  projectTasksLoading,
  filteredProjectTasks,
  setSelectedProjectTask,
  handleEditProjectTask,
  handleDeleteProjectTask,
  projectStatusTone,
  employeeNameByGdcId,
  formatProjectDueDate,
  createTaskOpen,
  editingTaskId,
  taskTitle,
  setTaskTitle,
  taskAssignee,
  setTaskAssignee,
  taskAssigneeUserId,
  setTaskAssigneeUserId,
  hrAssignableUsers,
  taskDeadline,
  setTaskDeadline,
  taskDescription,
  setTaskDescription,
  handlePickTaskAttachment,
  taskAttachmentName,
  handleCreateProjectTask,
  selectedProjectTask,
  canForwardProjectTask,
  forwardTlName,
  setForwardTlName,
  forwardTlId,
  setForwardTlId,
  forwardTlDropdownOpen,
  setForwardTlDropdownOpen,
  forwardDropdownAnim,
  tlForwardOptions,
  handleForwardProjectToTl,
  canStartProjectTask,
  handleStartProjectTask,
  taskSubmitNote,
  setTaskSubmitNote,
  canSubmitProjectTask,
  handleSubmitProjectTask,
  canSendToReviewProjectTask,
  handleSendToReviewProjectTask,
  canApproveProjectTask,
  handleApproveProjectTask,
  taskWorkflowBusy = false,
  taskAssignableLoading,
  taskAssignableError,
  saveProjectTaskPhase = 'idle',
}) {
  const insets = useSafeAreaInsets();
  const [iosDeadlinePickerOpen, setIosDeadlinePickerOpen] = useState(false);
  const [hrAssignMenuOpen, setHrAssignMenuOpen] = useState(false);
  const hrAssignDropdownAnim = useRef(new Animated.Value(0)).current;
  const [iosDeadlineDraft, setIosDeadlineDraft] = useState(() => new Date());
  const [iosFilterPickerKind, setIosFilterPickerKind] = useState(/** @type {'from' | 'to' | null} */ (null));
  const [iosFilterDraft, setIosFilterDraft] = useState(() => new Date());

  const formatDeadlineIso = useCallback((date) => {
    const y = date.getFullYear();
    const m = `${date.getMonth() + 1}`.padStart(2, '0');
    const d = `${date.getDate()}`.padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const parseDeadlineDate = useCallback(() => {
    const raw = String(taskDeadline || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return new Date();
    const d = new Date(`${raw}T12:00:00`);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  }, [taskDeadline]);

  const openTaskDeadlinePicker = useCallback(() => {
    const current = parseDeadlineDate();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: current,
        onChange: (event, selected) => {
          if (event?.type === 'dismissed') return;
          if (selected) setTaskDeadline(formatDeadlineIso(selected));
        },
        mode: 'date',
      });
    } else {
      setIosDeadlineDraft(current);
      setIosDeadlinePickerOpen(true);
    }
  }, [formatDeadlineIso, parseDeadlineDate, setTaskDeadline]);

  const parseIsoDateField = useCallback((raw) => {
    const s = String(raw || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date();
    const d = new Date(`${s}T12:00:00`);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  }, []);

  const openProjectFilterDate = useCallback(
    (kind) => {
      const raw = kind === 'from' ? projectFromDate : projectToDate;
      const current = parseIsoDateField(raw);
      if (Platform.OS === 'android') {
        DateTimePickerAndroid.open({
          value: current,
          onChange: (event, selected) => {
            if (event?.type === 'dismissed') return;
            if (selected) {
              const iso = formatDeadlineIso(selected);
              if (kind === 'from') setProjectFromDate(iso);
              else setProjectToDate(iso);
            }
          },
          mode: 'date',
        });
      } else {
        setIosFilterDraft(current);
        setIosFilterPickerKind(kind);
      }
    },
    [formatDeadlineIso, parseIsoDateField, projectFromDate, projectToDate, setProjectFromDate, setProjectToDate],
  );

  useEffect(() => {
    if (!createTaskOpen) {
      setIosDeadlinePickerOpen(false);
      setHrAssignMenuOpen(false);
    }
  }, [createTaskOpen]);

  useEffect(() => {
    Animated.timing(hrAssignDropdownAnim, {
      toValue: hrAssignMenuOpen ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [hrAssignMenuOpen, hrAssignDropdownAnim]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <DashboardTopbar />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <MaterialCommunityIcons name="clipboard-list-outline" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Project Manager</Text>
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Filters</Text>
          <Text style={styles.panelSub}>Search by task, filter by status and deadline range.</Text>
          <View style={styles.searchWrap}>
            <MaterialCommunityIcons name="magnify" size={18} color="#94a3b8" />
            <TextInput
              value={projectSearch}
              onChangeText={setProjectSearch}
              placeholder="Search project tasks..."
              placeholderTextColor="#94a3b8"
              style={styles.searchInput}
            />
          </View>
          <View style={styles.pmFilterSelectWrap}>
            <Pressable style={styles.pmFilterSelectBtn} onPress={() => setProjectStatusMenuOpen((prev) => !prev)}>
              <Text style={styles.pmFilterSelectText}>
                {projectStatusFilter === 'all'
                  ? 'All'
                  : projectStatusFilter
                      .split(' ')
                      .map((w) => `${w.charAt(0).toUpperCase()}${w.slice(1)}`)
                      .join(' ')}
              </Text>
              <MaterialCommunityIcons name={projectStatusMenuOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#94a3b8" />
            </Pressable>
            {projectStatusMenuOpen ? (
              <View style={styles.pmFilterSelectMenuInline}>
                {['all', 'pending', 'in progress', 'review', 'submitted', 'overdue', 'approved', 'completed'].map((status) => (
                  <Pressable
                    key={status}
                    onPress={() => {
                      setProjectStatusFilter(status);
                      setProjectStatusMenuOpen(false);
                    }}
                    style={[styles.pmFilterOption, projectStatusFilter === status && styles.pmFilterOptionActive]}>
                    <Text style={[styles.pmFilterOptionText, projectStatusFilter === status && styles.pmFilterOptionTextActive]}>
                      {status === 'all'
                        ? 'All'
                        : status
                            .split(' ')
                            .map((w) => `${w.charAt(0).toUpperCase()}${w.slice(1)}`)
                            .join(' ')}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
          <View style={styles.dateFilterRow}>
            <Pressable
              style={styles.filterDateField}
              onPress={() => openProjectFilterDate('from')}
              accessibilityRole="button"
              accessibilityLabel="Filter tasks from deadline date">
              <MaterialCommunityIcons name="calendar-month-outline" size={20} color="#2563eb" />
              <Text
                style={[
                  styles.filterDateFieldSingle,
                  (!projectFromDate?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(projectFromDate.trim())) && styles.filterDateFieldPlaceholder,
                ]}
                numberOfLines={1}
                ellipsizeMode="tail">
                {projectFromDate?.trim() && /^\d{4}-\d{2}-\d{2}$/.test(projectFromDate.trim()) ? projectFromDate.trim() : 'From'}
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={18} color="#94a3b8" />
            </Pressable>
            <Pressable
              style={styles.filterDateField}
              onPress={() => openProjectFilterDate('to')}
              accessibilityRole="button"
              accessibilityLabel="Filter tasks to deadline date">
              <MaterialCommunityIcons name="calendar-month-outline" size={20} color="#2563eb" />
              <Text
                style={[
                  styles.filterDateFieldSingle,
                  (!projectToDate?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(projectToDate.trim())) && styles.filterDateFieldPlaceholder,
                ]}
                numberOfLines={1}
                ellipsizeMode="tail">
                {projectToDate?.trim() && /^\d{4}-\d{2}-\d{2}$/.test(projectToDate.trim()) ? projectToDate.trim() : 'To'}
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={18} color="#94a3b8" />
            </Pressable>
          </View>
          {projectFromDate?.trim() || projectToDate?.trim() ? (
            <Pressable
              onPress={() => {
                setProjectFromDate('');
                setProjectToDate('');
              }}
              style={styles.filterDateClear}
              accessibilityRole="button"
              accessibilityLabel="Clear deadline date filters">
              <Text style={styles.filterDateClearText}>Clear date range</Text>
            </Pressable>
          ) : null}
          {isAdminRole(user?.role) ? (
            <Pressable style={styles.actionBtn} onPress={() => setCreateTaskOpen(true)}>
              <Text style={styles.actionBtnText}>Create Task</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Task List</Text>
          <Text style={styles.panelSub}>Project tasks matching current filters.</Text>
          {projectTasksLoading ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>Loading tasks…</Text>
            </View>
          ) : filteredProjectTasks.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No tasks match current filters.</Text>
            </View>
          ) : (
            filteredProjectTasks.map((task) => (
              <Pressable key={task.id} style={[styles.projectCard, isCompactMobile && styles.projectCardCompact]} onPress={() => setSelectedProjectTask(task)}>
                <View style={[styles.projectDateStrip, isCompactMobile && styles.projectDateStripCompact]}>
                  <Text style={styles.projectDateDay}>{task.deadline ? task.deadline.slice(-2) : '--'}</Text>
                  <Text style={styles.projectDateMonth}>
                    {task.deadline ? new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date(task.deadline)).toUpperCase() : 'N/A'}
                  </Text>
                </View>
                <View style={styles.projectMainCol}>
                  <View style={styles.projectCardTop}>
                    <Text style={styles.projectTitle} numberOfLines={isCompactMobile ? 2 : 1}>
                      {task.title}
                    </Text>
                    {isAdminRole(user?.role) ? (
                      <View style={styles.taskActionRow}>
                        <Pressable onPress={() => handleEditProjectTask(task)} style={styles.editBtn} onPressIn={(e) => e.stopPropagation()}>
                          <MaterialCommunityIcons name="pencil-outline" size={16} color="#ffffff" />
                        </Pressable>
                        <Pressable onPress={() => handleDeleteProjectTask(task.id)} style={styles.deleteBtn} onPressIn={(e) => e.stopPropagation()}>
                          <MaterialCommunityIcons name="trash-can-outline" size={16} color="#e11d48" />
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                  <View style={[styles.projectStatePill, projectStatusTone(task.status)]}>
                    <Text style={styles.projectStateText}>{String(task.status || 'Pending').toUpperCase()}</Text>
                  </View>
                  <View style={styles.projectIdentityRow}>
                    <View style={styles.projectAssigneeBadge}>
                      <Text style={styles.projectAssigneeBadgeText}>
                        {String(task.assignedToName || employeeNameByGdcId[task.gdcId] || task.assignee || 'Unassigned').toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.projectInfoLine}>
                    <MaterialCommunityIcons name="briefcase-outline" size={17} color="#f97316" />
                    <Text style={styles.projectInfoText} numberOfLines={1}>
                      {task.description || 'Web Development'}
                    </Text>
                  </View>
                  <View style={styles.projectInfoLine}>
                    <MaterialCommunityIcons name="account-outline" size={17} color="#f97316" />
                    <Text style={styles.projectInfoText}>{task.assignedRole || task.assignee || 'Employee'}</Text>
                  </View>
                  <View style={styles.projectDueLine}>
                    <MaterialCommunityIcons name="calendar-month-outline" size={18} color="#94a3b8" />
                    <Text style={styles.projectDueText}>{formatProjectDueDate(task.deadline)}</Text>
                  </View>
                  {task.attachmentName ? <Text style={styles.projectLinkText}>Attachment: {task.attachmentName}</Text> : null}
                </View>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>

      <Modal visible={createTaskOpen} transparent animationType="slide" onRequestClose={() => setCreateTaskOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCardShell}>
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              onScrollBeginDrag={() => setHrAssignMenuOpen(false)}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>{editingTaskId ? 'Update Project Task' : 'Create Project Task'}</Text>
                <View style={[styles.formLabelRow, styles.formLabelRowTight]}>
                  <View style={styles.formIconCol}>
                    <MaterialCommunityIcons name="format-list-checks" size={20} color="#2563eb" />
                  </View>
                  <Text style={styles.formLabelUpper}>TASK TITLE</Text>
                </View>
                <TextInput
                  value={taskTitle}
                  onChangeText={setTaskTitle}
                  placeholder="e.g. Update documentation"
                  placeholderTextColor="#94a3b8"
                  style={styles.input}
                />
                {isAdminRole(user?.role) ? (
                  <View>
                    <View style={styles.formLabelRow}>
                      <View style={styles.formIconCol}>
                        <MaterialCommunityIcons name="account-outline" size={20} color="#2563eb" />
                      </View>
                      <Text style={styles.formLabelUpper}>ASSIGN TO *</Text>
                    </View>
                    {taskAssignableLoading ? (
                      <Text style={[styles.panelSub, { marginTop: 6 }]}>Loading HR users…</Text>
                    ) : null}
                    {!taskAssignableLoading && taskAssignableError ? (
                      <Text style={{ fontSize: 12, color: '#dc2626', fontWeight: '600', marginTop: 6 }}>{taskAssignableError}</Text>
                    ) : null}
                    {!taskAssignableLoading && !taskAssignableError && hrAssignableUsers.length > 0 ? (
                      <View style={[styles.hrAssignSelectWrap, hrAssignMenuOpen && styles.hrAssignSelectWrapRaised]}>
                        <Pressable
                          onPress={() => setHrAssignMenuOpen((o) => !o)}
                          style={[styles.hrAssignSelectBtn, hrAssignMenuOpen && styles.hrAssignSelectBtnOpen]}>
                          <Text
                            style={[
                              styles.hrAssignSelectBtnText,
                              !String(taskAssignee || '').trim() && styles.hrAssignSelectBtnPlaceholder,
                            ]}
                            numberOfLines={1}>
                            {String(taskAssignee || '').trim() || 'Select HR'}
                          </Text>
                          <MaterialCommunityIcons name={hrAssignMenuOpen ? 'chevron-up' : 'chevron-down'} size={20} color="#64748b" />
                        </Pressable>
                        <Animated.View
                          pointerEvents={hrAssignMenuOpen ? 'auto' : 'none'}
                          style={[
                            styles.hrAssignSelectMenu,
                            {
                              opacity: hrAssignDropdownAnim,
                              transform: [
                                {
                                  scale: hrAssignDropdownAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0.96, 1],
                                  }),
                                },
                              ],
                            },
                          ]}>
                          <ScrollView
                            nestedScrollEnabled
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator
                            style={{ maxHeight: 220 }}>
                            {hrAssignableUsers.map((hr, idx) => {
                              const id = typeof hr === 'object' && hr != null ? hr.id : null;
                              const label = typeof hr === 'object' && hr != null ? String(hr.name || '').trim() : String(hr);
                              const idNum = id != null ? Number(id) : NaN;
                              const selected = Number.isFinite(idNum) && taskAssigneeUserId === idNum;
                              const last = idx === hrAssignableUsers.length - 1;
                              return (
                                <Pressable
                                  key={Number.isFinite(idNum) ? String(idNum) : label}
                                  onPress={() => {
                                    setTaskAssignee(label);
                                    if (setTaskAssigneeUserId && Number.isFinite(idNum)) setTaskAssigneeUserId(idNum);
                                    setHrAssignMenuOpen(false);
                                  }}
                                  style={[
                                    styles.hrAssignSelectOption,
                                    last && styles.hrAssignSelectOptionLast,
                                    selected && styles.hrAssignSelectOptionActive,
                                  ]}>
                                  <MaterialCommunityIcons name="account-outline" size={18} color="#2563eb" />
                                  <Text
                                    style={[styles.hrAssignSelectOptionText, selected && styles.hrAssignSelectOptionTextActive]}
                                    numberOfLines={1}>
                                    {label}
                                  </Text>
                                </Pressable>
                              );
                            })}
                          </ScrollView>
                        </Animated.View>
                      </View>
                    ) : !taskAssignableLoading && !taskAssignableError ? (
                      <Text style={[styles.panelSub, { marginTop: 6 }]}>
                        No HR users in the list. Confirm Task Management service and Auth assignable-users API.
                      </Text>
                    ) : null}
                  </View>
                ) : null}
                <View style={styles.formLabelRow}>
                  <View style={styles.formIconCol}>
                    <MaterialCommunityIcons name="calendar-month-outline" size={20} color="#2563eb" />
                  </View>
                  <Text style={styles.formLabelUpper}>DEADLINE *</Text>
                </View>
                <Pressable
                  onPress={openTaskDeadlinePicker}
                  style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 }]}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: taskDeadline?.trim() ? '#334155' : '#94a3b8' }}>
                    {taskDeadline?.trim() && /^\d{4}-\d{2}-\d{2}$/.test(taskDeadline.trim())
                      ? taskDeadline.trim()
                      : 'mm/dd/yyyy'}
                  </Text>
                  <MaterialCommunityIcons name="calendar-month-outline" size={24} color="#64748b" />
                </Pressable>
                <View style={styles.formLabelRow}>
                  <View style={styles.formIconCol}>
                    <MaterialCommunityIcons name="paperclip" size={20} color="#2563eb" />
                  </View>
                  <Text style={styles.formLabelUpper}>ATTACHMENT</Text>
                  <Text style={styles.formLabelMuted}> (optional · max 5 MB)</Text>
                </View>
                <View style={styles.attachmentField}>
                  <View style={styles.attachmentPicker}>
                    <Pressable style={styles.attachmentBtn} onPress={handlePickTaskAttachment}>
                      <Text style={styles.attachmentBtnText}>Choose file</Text>
                    </Pressable>
                    <Text style={styles.attachmentFileText} numberOfLines={1}>
                      {taskAttachmentName || 'No file chosen'}
                    </Text>
                  </View>
                </View>
                <View style={styles.formLabelRow}>
                  <View style={styles.formIconCol}>
                    <MaterialCommunityIcons name="text-long" size={20} color="#2563eb" />
                  </View>
                  <Text style={styles.formLabelUpper}>DESCRIPTION</Text>
                  <Text style={styles.formLabelMuted}> (optional)</Text>
                </View>
                <TextInput
                  value={taskDescription}
                  onChangeText={setTaskDescription}
                  placeholder="Task description"
                  placeholderTextColor="#94a3b8"
                  style={[styles.input, styles.textAreaSm]}
                  multiline
                  textAlignVertical="top"
                />
                <View style={styles.modalActions}>
                  <Pressable
                    style={[
                      styles.cancelBtn,
                      (saveProjectTaskPhase === 'saving' || saveProjectTaskPhase === 'success') && styles.modalPrimaryBtnDisabled,
                    ]}
                    disabled={saveProjectTaskPhase === 'saving' || saveProjectTaskPhase === 'success'}
                    onPress={() => setCreateTaskOpen(false)}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.modalPrimaryBtn,
                      saveProjectTaskPhase === 'saving' && styles.modalPrimaryBtnDisabled,
                      saveProjectTaskPhase === 'success' && styles.modalPrimaryBtnSuccess,
                    ]}
                    disabled={saveProjectTaskPhase === 'saving' || saveProjectTaskPhase === 'success'}
                    onPress={handleCreateProjectTask}>
                    {saveProjectTaskPhase === 'saving' ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <ActivityIndicator color="#ffffff" size="small" />
                        <Text style={styles.actionBtnText}>{editingTaskId ? 'Updating…' : 'Saving…'}</Text>
                      </View>
                    ) : saveProjectTaskPhase === 'success' ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <MaterialCommunityIcons name="check-circle" size={22} color="#ffffff" />
                        <Text style={styles.actionBtnText}>{editingTaskId ? 'Updated!' : 'Saved!'}</Text>
                      </View>
                    ) : (
                      <Text style={styles.actionBtnText}>{editingTaskId ? 'Update Task' : 'Save Task'}</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={iosDeadlinePickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIosDeadlinePickerOpen(false)}>
        <Pressable style={styles.dateOverlay} onPress={() => setIosDeadlinePickerOpen(false)}>
          <Pressable style={styles.dateSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Task deadline</Text>
            <DateTimePicker
              value={iosDeadlineDraft}
              mode="date"
              display="spinner"
              themeVariant="light"
              onChange={(_, selected) => {
                if (selected) setIosDeadlineDraft(selected);
              }}
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <Pressable style={styles.cancelBtn} onPress={() => setIosDeadlinePickerOpen(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.modalPrimaryBtn}
                onPress={() => {
                  setTaskDeadline(formatDeadlineIso(iosDeadlineDraft));
                  setIosDeadlinePickerOpen(false);
                }}>
                <Text style={styles.actionBtnText}>Done</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={iosFilterPickerKind != null}
        transparent
        animationType="fade"
        onRequestClose={() => setIosFilterPickerKind(null)}>
        <Pressable style={styles.dateOverlay} onPress={() => setIosFilterPickerKind(null)}>
          <Pressable style={[styles.dateSheet, { paddingBottom: Math.max(insets.bottom, 28) }]} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{iosFilterPickerKind === 'from' ? 'Deadline from' : 'Deadline to'}</Text>
            <DateTimePicker
              value={iosFilterDraft}
              mode="date"
              display="spinner"
              themeVariant="light"
              onChange={(_, selected) => {
                if (selected) setIosFilterDraft(selected);
              }}
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => {
                  if (iosFilterPickerKind === 'from') setProjectFromDate('');
                  else if (iosFilterPickerKind === 'to') setProjectToDate('');
                  setIosFilterPickerKind(null);
                }}>
                <Text style={styles.cancelBtnText}>Clear</Text>
              </Pressable>
              <Pressable style={styles.cancelBtn} onPress={() => setIosFilterPickerKind(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.modalPrimaryBtn}
                onPress={() => {
                  const iso = formatDeadlineIso(iosFilterDraft);
                  if (iosFilterPickerKind === 'from') setProjectFromDate(iso);
                  else if (iosFilterPickerKind === 'to') setProjectToDate(iso);
                  setIosFilterPickerKind(null);
                }}>
                <Text style={styles.actionBtnText}>Done</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={Boolean(selectedProjectTask)} transparent animationType="slide" onRequestClose={() => setSelectedProjectTask(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCardShell}>
            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator>
              <View style={styles.modalCard}>
                <View style={styles.taskDetailHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.taskDetailTitleRow}>
                      <MaterialCommunityIcons name="clipboard-text-outline" size={20} color="#3b82f6" />
                      <Text style={styles.taskDetailHeaderTitle}>Task Details</Text>
                    </View>
                    <Text style={styles.taskDetailHeaderSub}>
                      Assignee: {selectedProjectTask?.assignedToName || employeeNameByGdcId[selectedProjectTask?.gdcId] || selectedProjectTask?.assignee || 'Unassigned'} (
                      {selectedProjectTask?.assignedRole || 'Employee'})
                    </Text>
                  </View>
                  <View style={styles.taskDetailHeaderActions}>
                    {isAdminRole(user?.role) ? (
                      <>
                        <Pressable
                          style={styles.taskDetailActionBtn}
                          onPress={() => {
                            handleEditProjectTask(selectedProjectTask);
                            setSelectedProjectTask(null);
                          }}>
                          <MaterialCommunityIcons name="pencil-outline" size={16} color="#0369a1" />
                        </Pressable>
                        <Pressable
                          style={[styles.taskDetailActionBtn, styles.taskDetailDeleteBtn]}
                          onPress={() => {
                            handleDeleteProjectTask(selectedProjectTask.id);
                            setSelectedProjectTask(null);
                          }}>
                          <MaterialCommunityIcons name="trash-can-outline" size={16} color="#e11d48" />
                        </Pressable>
                      </>
                    ) : null}
                    <Pressable onPress={() => setSelectedProjectTask(null)} hitSlop={8}>
                      <MaterialCommunityIcons name="close" size={20} color="#94a3b8" />
                    </Pressable>
                  </View>
                </View>

                <View style={[styles.taskDetailBody, isCompactMobile && styles.taskDetailBodyMobile]}>
                  <View style={styles.taskDetailMainCol}>
                    <Text style={styles.detailTitle}>{selectedProjectTask?.title}</Text>
                    <Text style={styles.detailBody}>{selectedProjectTask?.description || 'No description'}</Text>
                    {selectedProjectTask?.attachmentName ? (
                      <View style={styles.taskDetailAttachmentCard}>
                        <Text style={styles.taskDetailAttachmentLabel}>Attachment</Text>
                        <View style={styles.taskDetailAttachmentRow}>
                          <MaterialCommunityIcons name="paperclip" size={18} color="#2563eb" />
                          <Text style={styles.taskDetailAttachmentName}>{selectedProjectTask.attachmentName}</Text>
                        </View>
                      </View>
                    ) : null}
                    <View style={styles.projectIdentityRow}>
                      <View style={styles.forwardTeamPill}>
                        <Text style={styles.forwardTeamPillText}>
                          {String(selectedProjectTask?.assignedToName || employeeNameByGdcId[selectedProjectTask?.gdcId] || selectedProjectTask?.assignee || 'UNASSIGNED').toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={[styles.taskDetailAsideCol, isCompactMobile && styles.taskDetailAsideColMobile]}>
                    <View style={[styles.projectStatePill, projectStatusTone(selectedProjectTask?.status)]}>
                      <Text style={styles.projectStateText}>{String(selectedProjectTask?.status || 'Pending').toUpperCase()}</Text>
                    </View>
                    <View style={styles.taskDetailDueRow}>
                      <MaterialCommunityIcons name="calendar-month-outline" size={18} color="#94a3b8" />
                      <Text style={styles.taskDetailDueText}>{formatProjectDueDate(selectedProjectTask?.deadline).replace('Due ', 'DUE ')}</Text>
                    </View>
                  </View>
                </View>

                {selectedProjectTask?.forwardedBy ? <Text style={styles.detailText}>Forwarded by: {selectedProjectTask.forwardedBy}</Text> : null}
                {canForwardProjectTask ? (
                  <View style={styles.forwardWrap}>
                    <Text style={styles.forwardTitle}>Forward to Team Leader</Text>
                    <View style={styles.forwardSelectWrap}>
                      <Pressable style={styles.forwardSelectBtn} onPress={() => setForwardTlDropdownOpen((prev) => !prev)}>
                        <Text style={styles.forwardSelectText}>{forwardTlName || 'Select Team Leader'}</Text>
                        <MaterialCommunityIcons name={forwardTlDropdownOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#94a3b8" />
                      </Pressable>
                      {forwardTlDropdownOpen ? (
                        <Animated.View
                          style={[
                            styles.forwardSelectMenu,
                            {
                              opacity: forwardDropdownAnim,
                              transform: [
                                {
                                  translateY: forwardDropdownAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [-8, 0],
                                  }),
                                },
                              ],
                            },
                          ]}>
                          {tlForwardOptions.map((lead) => {
                            const lid = lead && typeof lead === 'object' && lead.id != null ? lead.id : lead?.name;
                            const lname = lead && typeof lead === 'object' ? lead.name : String(lead);
                            const lteam = lead && typeof lead === 'object' && lead.team != null ? lead.team : '';
                            return (
                              <Pressable
                                key={String(lid)}
                                onPress={() => {
                                  setForwardTlName(lname);
                                  if (setForwardTlId && lead && typeof lead === 'object' && lead.id != null) {
                                    setForwardTlId(Number(lead.id));
                                  }
                                  setForwardTlDropdownOpen(false);
                                }}
                                style={[styles.forwardSelectOption, forwardTlName === lname && styles.forwardSelectOptionActive]}>
                                <Text
                                  style={[styles.forwardSelectOptionText, forwardTlName === lname && styles.forwardSelectOptionTextActive]}>
                                  {lteam ? `${lname} — ${lteam}` : lname}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </Animated.View>
                      ) : null}
                    </View>
                    <Pressable
                      style={[styles.modalPrimaryBtn, !forwardTlId && styles.actionBtnDisabled]}
                      disabled={!forwardTlId}
                      onPress={handleForwardProjectToTl}>
                      <Text style={styles.actionBtnText}>Forward to TL</Text>
                    </Pressable>
                  </View>
                ) : null}
                {canStartProjectTask ? (
                  <View style={styles.forwardWrap}>
                    <Text style={styles.forwardTitle}>Start work</Text>
                    <Text style={styles.formLabelMuted}>Begin this task to track progress; you can submit when done.</Text>
                    <Pressable
                      style={[styles.startWorkBtn, taskWorkflowBusy && styles.actionBtnDisabled]}
                      disabled={taskWorkflowBusy}
                      onPress={handleStartProjectTask}>
                      <MaterialCommunityIcons name="play-circle-outline" size={16} color="#fff" />
                      <Text style={styles.actionBtnText}>Start Work</Text>
                    </Pressable>
                  </View>
                ) : null}
                {canSubmitProjectTask && !canStartProjectTask ? (
                  <View style={styles.forwardWrap}>
                    <View style={[styles.formLabelRow, styles.formLabelRowTight]}>
                      <View style={styles.formIconCol}>
                        <MaterialCommunityIcons name="note-text-outline" size={18} color="#6366f1" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.formLabelUpper}>Submit note</Text>
                        <Text style={styles.formLabelMuted}>Required — describe what you completed.</Text>
                      </View>
                    </View>
                    <TextInput
                      value={taskSubmitNote}
                      onChangeText={setTaskSubmitNote}
                      placeholder="Enter your submission note…"
                      placeholderTextColor="#94a3b8"
                      style={[styles.input, styles.textAreaSm]}
                      multiline
                      textAlignVertical="top"
                      editable={!taskWorkflowBusy}
                    />
                    <Pressable
                      style={[styles.modalPrimaryBtn, taskWorkflowBusy && styles.actionBtnDisabled]}
                      disabled={taskWorkflowBusy}
                      onPress={handleSubmitProjectTask}>
                      <Text style={styles.actionBtnText}>Submit</Text>
                    </Pressable>
                  </View>
                ) : null}
                {canSendToReviewProjectTask || canApproveProjectTask ? (
                  <View style={styles.forwardWrap}>
                    <View style={[styles.taskActionRow, { alignSelf: 'stretch' }]}>
                      {canSendToReviewProjectTask ? (
                        <Pressable
                          style={[
                            styles.modalPrimaryBtn,
                            { flex: 1, minWidth: 0 },
                            taskWorkflowBusy && styles.actionBtnDisabled,
                          ]}
                          disabled={taskWorkflowBusy}
                          onPress={handleSendToReviewProjectTask}>
                          <Text style={styles.actionBtnText}>Send to review</Text>
                        </Pressable>
                      ) : null}
                      {canApproveProjectTask ? (
                        <Pressable
                          style={[
                            styles.startWorkBtn,
                            { flex: 1, minWidth: 0, marginTop: 0 },
                            taskWorkflowBusy && styles.actionBtnDisabled,
                          ]}
                          disabled={taskWorkflowBusy}
                          onPress={handleApproveProjectTask}>
                          <MaterialCommunityIcons name="check-decagram" size={16} color="#fff" />
                          <Text style={styles.actionBtnText}>Approve</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                ) : null}
                {Array.isArray(selectedProjectTask?.comments) && selectedProjectTask.comments.length > 0 ? (
                  <View style={styles.forwardWrap}>
                    <Text style={styles.forwardTitle}>Comments</Text>
                    {selectedProjectTask.comments.map((c, idx) => {
                      const id = c && typeof c === 'object' && c.id != null ? String(c.id) : `c-${idx}`;
                      const txt = c && typeof c === 'object' && c.text != null ? String(c.text) : '';
                      const at = c && typeof c === 'object' && c.createdAt != null ? String(c.createdAt).slice(0, 16) : '';
                      return (
                        <View key={id} style={{ marginBottom: 8 }}>
                          <Text style={styles.detailBody}>{txt}</Text>
                          {at ? <Text style={styles.detailText}>{at}</Text> : null}
                        </View>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
