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

import { AnimatedBlock } from '@/components/ui/animated-block';
import { KeyboardAwareScrollView } from '@/components/ui/keyboard-aware-scroll-view';
import { DashboardTopbar } from '@/components/dashboard/topbar';
import { useTheme } from '@/context/theme-context';
import { canCreateProjectTask, isAdminOrHrRole } from '@/utils/roles';
import { promptTaskAttachmentActions } from '@/utils/task-document-open';

const PM_STATUS_OPTIONS = ['all', 'pending', 'in progress', 'submitted', 'review', 'approved'];

const PM_STAT_META = [
  { key: 'total', label: 'Total Projects', icon: 'account-group-outline', subKey: 'all', tone: '#4f46e5', bg: '#eef2ff' },
  { key: 'active', label: 'Active Projects', icon: 'play-circle-outline', subKey: 'pct', tone: '#059669', bg: '#ecfdf5' },
  { key: 'completed', label: 'Completed', icon: 'check-circle-outline', subKey: 'pct', tone: '#7c3aed', bg: '#f5f3ff' },
  { key: 'pending', label: 'Pending', icon: 'clock-outline', subKey: 'pct', tone: '#d97706', bg: '#fffbeb' },
  { key: 'overdue', label: 'Overdue', icon: 'alert-circle-outline', subKey: 'pct', tone: '#e11d48', bg: '#fff1f2' },
];

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
  projectTeamFilter = 'All Teams',
  setProjectTeamFilter,
  projectTeamMenuOpen = false,
  setProjectTeamMenuOpen,
  projectTeamOptions = ['All Teams'],
  showTeamInProjects = false,
  projectManagerStats = { total: 0, active: 0, completed: 0, pending: 0, overdue: 0, pct: () => '0%' },
  canCreateProject = false,
  projectFromDate,
  setProjectFromDate,
  projectToDate,
  setProjectToDate,
  openCreateProjectTaskModal,
  closeProjectTaskModal,
  projectTasksLoading,
  filteredProjectTasks,
  setSelectedProjectTask,
  handleEditProjectTask,
  handleDeleteProjectTask,
  canManagePendingProjectTask = () => false,
  getProjectTaskDisplayStatus = (t) => t?.status || 'Pending',
  getProjectCardAssignment = () => ({}),
  formatTaskRef = () => '',
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
  assignableUsersForCreate = [],
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
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const selectedDisplayStatus = selectedProjectTask
    ? getProjectTaskDisplayStatus(selectedProjectTask)
    : null;
  const selectedDetailStatusTone = selectedDisplayStatus ? projectStatusTone(selectedDisplayStatus) : null;
  const assigneePool = assignableUsersForCreate.length
    ? assignableUsersForCreate
    : Array.isArray(hrAssignableUsers)
      ? hrAssignableUsers
      : [];
  const showCreate = canCreateProject || canCreateProjectTask(user?.role);
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
      <KeyboardAwareScrollView contentContainerStyle={styles.scroll}>
        <AnimatedBlock delay={0}>
        <View style={styles.hero}>
          <View style={styles.pmHeroRow}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, flex: 1, minWidth: 0 }}>
              <View style={styles.heroIcon}>
                <MaterialCommunityIcons name="calendar-month-outline" size={20} color="#fff" />
              </View>
              <View style={styles.pmHeroCopy}>
                <Text style={styles.heroTitle}>Projects</Text>
                <Text style={styles.pmHeroSubtitle}>Manage projects, deadlines and team progress.</Text>
              </View>
            </View>
            {showCreate ? (
              <Pressable style={styles.pmNewProjectBtn} onPress={openCreateProjectTaskModal}>
                <MaterialCommunityIcons name="plus" size={18} color="#fff" />
                <Text style={styles.pmNewProjectBtnText}>New Project</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
        </AnimatedBlock>

        <AnimatedBlock delay={40}>
        <View style={styles.pmStatsRow}>
          {PM_STAT_META.map((meta) => {
            const value = Number(projectManagerStats?.[meta.key] ?? 0);
            const sub =
              meta.subKey === 'all'
                ? 'All time'
                : typeof projectManagerStats?.pct === 'function'
                  ? `${projectManagerStats.pct(value)} of total`
                  : '';
            return (
              <View key={meta.key} style={styles.pmStatCard}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.pmStatLabel}>{meta.label}</Text>
                  <Text style={styles.pmStatValue}>{value}</Text>
                  <Text style={[styles.pmStatSub, { color: meta.tone }]}>{sub}</Text>
                </View>
                <View style={[styles.pmStatIconWrap, { backgroundColor: isDark ? colors.surfaceElevated : meta.bg }]}>
                  <MaterialCommunityIcons name={meta.icon} size={20} color={meta.tone} />
                </View>
              </View>
            );
          })}
        </View>
        </AnimatedBlock>

        <AnimatedBlock delay={80}>
        <View style={[styles.panel, { marginTop: 8 }]}>
          <Text style={styles.panelTitle}>Filters</Text>
          <Text style={styles.panelSub}>Search by project name, filter by status and deadline range.</Text>
          <View style={styles.searchWrap}>
            <MaterialCommunityIcons name="magnify" size={18} color={colors.textSecondary} />
            <TextInput
              value={projectSearch}
              onChangeText={setProjectSearch}
              placeholder="Search by project name…"
              placeholderTextColor={colors.inputPlaceholder}
              style={styles.searchInput}
            />
          </View>
          <View style={styles.pmFilterSelectWrap}>
            <Pressable
              style={styles.pmFilterSelectBtn}
              onPress={() => {
                setProjectStatusMenuOpen((prev) => !prev);
                setProjectTeamMenuOpen?.(false);
              }}>
              <Text style={styles.pmFilterSelectText}>
                {projectStatusFilter === 'all'
                  ? 'All Status'
                  : projectStatusFilter
                      .split(' ')
                      .map((w) => `${w.charAt(0).toUpperCase()}${w.slice(1)}`)
                      .join(' ')}
              </Text>
              <MaterialCommunityIcons name={projectStatusMenuOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
            </Pressable>
            {projectStatusMenuOpen ? (
              <View style={styles.pmFilterSelectMenuInline}>
                {PM_STATUS_OPTIONS.map((status) => (
                  <Pressable
                    key={status}
                    onPress={() => {
                      setProjectStatusFilter(status);
                      setProjectStatusMenuOpen(false);
                    }}
                    style={[styles.pmFilterOption, projectStatusFilter === status && styles.pmFilterOptionActive]}>
                    <Text style={[styles.pmFilterOptionText, projectStatusFilter === status && styles.pmFilterOptionTextActive]}>
                      {status === 'all'
                        ? 'All Status'
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
          {showTeamInProjects || isAdminOrHrRole(user?.role) ? (
            <View style={[styles.pmFilterSelectWrap, { zIndex: 30 }]}>
              <Pressable
                style={styles.pmFilterSelectBtn}
                onPress={() => {
                  setProjectTeamMenuOpen?.((prev) => !prev);
                  setProjectStatusMenuOpen(false);
                }}>
                <Text style={styles.pmFilterSelectText}>{projectTeamFilter || 'All Teams'}</Text>
                <MaterialCommunityIcons name={projectTeamMenuOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
              </Pressable>
              {projectTeamMenuOpen ? (
                <View style={styles.pmFilterSelectMenuInline}>
                  {(projectTeamOptions || ['All Teams']).map((team) => (
                    <Pressable
                      key={team}
                      onPress={() => {
                        setProjectTeamFilter?.(team);
                        setProjectTeamMenuOpen?.(false);
                      }}
                      style={[styles.pmFilterOption, projectTeamFilter === team && styles.pmFilterOptionActive]}>
                      <Text style={[styles.pmFilterOptionText, projectTeamFilter === team && styles.pmFilterOptionTextActive]}>
                        {team}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}
          <View style={styles.dateFilterRow}>
            <Pressable
              style={styles.filterDateField}
              onPress={() => openProjectFilterDate('from')}
              accessibilityRole="button"
              accessibilityLabel="Filter tasks from deadline date">
              <MaterialCommunityIcons name="calendar-month-outline" size={20} color={colors.primaryLight} />
              <Text
                style={[
                  styles.filterDateFieldSingle,
                  (!projectFromDate?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(projectFromDate.trim())) && styles.filterDateFieldPlaceholder,
                ]}
                numberOfLines={1}
                ellipsizeMode="tail">
                {projectFromDate?.trim() && /^\d{4}-\d{2}-\d{2}$/.test(projectFromDate.trim()) ? projectFromDate.trim() : 'From'}
              </Text>
            </Pressable>
            <Pressable
              style={styles.filterDateField}
              onPress={() => openProjectFilterDate('to')}
              accessibilityRole="button"
              accessibilityLabel="Filter tasks to deadline date">
              <MaterialCommunityIcons name="calendar-month-outline" size={20} color={colors.primaryLight} />
              <Text
                style={[
                  styles.filterDateFieldSingle,
                  (!projectToDate?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(projectToDate.trim())) && styles.filterDateFieldPlaceholder,
                ]}
                numberOfLines={1}
                ellipsizeMode="tail">
                {projectToDate?.trim() && /^\d{4}-\d{2}-\d{2}$/.test(projectToDate.trim()) ? projectToDate.trim() : 'To'}
              </Text>
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
        </View>

        <View style={[styles.panel, { marginTop: 12 }]}>
          <Text style={styles.panelTitle}>Projects</Text>
          <Text style={styles.panelSub}></Text>
          {projectTasksLoading && filteredProjectTasks.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>Loading tasks…</Text>
            </View>
          ) : filteredProjectTasks.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No tasks match this filter.</Text>
            </View>
          ) : (
            filteredProjectTasks.map((task) => {
              const displayStatus = getProjectTaskDisplayStatus(task);
              const statusTone = projectStatusTone(displayStatus);
              const assignment = getProjectCardAssignment(task);
              const taskRef = formatTaskRef(task.apiNumericId ?? task.id);
              const canManage = canManagePendingProjectTask(task);
              return (
              <Pressable key={task.id} style={[styles.projectCard, isCompactMobile && styles.projectCardCompact]} onPress={() => setSelectedProjectTask(task)}>
                <View style={[styles.projectDateStrip, isCompactMobile && styles.projectDateStripCompact]}>
                  <Text style={styles.projectDateDay}>{task.deadline ? task.deadline.slice(-2) : '--'}</Text>
                  <Text style={styles.projectDateMonth}>
                    {task.deadline ? new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date(task.deadline)).toUpperCase() : 'N/A'}
                  </Text>
                </View>
                <View style={styles.projectMainCol}>
                  <View style={styles.projectCardTop}>
                    <Text style={styles.projectTitle} numberOfLines={1} ellipsizeMode="tail">
                      {task.title}
                    </Text>
                    {canManage ? (
                      <View style={styles.taskActionRow}>
                        <Pressable onPress={() => handleEditProjectTask(task)} style={styles.editBtn} onPressIn={(e) => e.stopPropagation()}>
                          <MaterialCommunityIcons name="pencil-outline" size={16} color="#ffffff" />
                        </Pressable>
                        <Pressable onPress={() => handleDeleteProjectTask(task.id)} style={styles.deleteBtn} onPressIn={(e) => e.stopPropagation()}>
                          <MaterialCommunityIcons name="trash-can-outline" size={16} color={colors.dangerText} />
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                  <View style={[styles.projectStatePill, statusTone.pill]}>
                    <Text style={[styles.projectStateText, statusTone.text]}>
                      {String(displayStatus || 'Pending').toUpperCase()}
                    </Text>
                  </View>
                  {taskRef ? <Text style={styles.projectTaskRef}>{taskRef}</Text> : null}
                  {assignment.teamChip ? (
                    <View style={styles.projectTeamChip}>
                      <Text style={styles.projectTeamChipText}>{assignment.teamChip}</Text>
                    </View>
                  ) : null}
                  {assignment.assignedBy ? (
                    <Text style={styles.projectAssignLine} numberOfLines={1}>
                      <Text style={styles.projectAssignLabel}>Assigned by: </Text>
                      {assignment.assignedBy}
                    </Text>
                  ) : null}
                  {assignment.assignedTo ? (
                    <Text style={styles.projectAssignLine} numberOfLines={1}>
                      <Text style={styles.projectAssignLabel}>Assigned to: </Text>
                      {assignment.assignedTo}
                    </Text>
                  ) : null}
                  <View style={styles.projectDueLine}>
                    <MaterialCommunityIcons name="calendar-month-outline" size={18} color={colors.textSecondary} />
                    <Text style={styles.projectDueText}>{formatProjectDueDate(task.deadline)}</Text>
                  </View>
                </View>
              </Pressable>
              );
            })
          )}
        </View>
        </AnimatedBlock>
      </KeyboardAwareScrollView>

      <Modal visible={createTaskOpen} transparent animationType="slide" onRequestClose={closeProjectTaskModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCardShell}>
            <KeyboardAwareScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator
              nestedScrollEnabled
              onScrollBeginDrag={() => setHrAssignMenuOpen(false)}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>{editingTaskId ? 'Edit task' : 'New task'}</Text>
                <View style={[styles.formLabelRow, styles.formLabelRowTight]}>
                  <View style={styles.formIconCol}>
                    <MaterialCommunityIcons name="format-list-checks" size={20} color={colors.primaryLight} />
                  </View>
                  <Text style={styles.formLabelUpper}>TASK TITLE</Text>
                </View>
                <TextInput
                  value={taskTitle}
                  onChangeText={setTaskTitle}
                  placeholder="e.g. Update documentation"
                  placeholderTextColor={colors.inputPlaceholder}
                  style={styles.input}
                />
                {showCreate ? (
                  <View>
                    <View style={styles.formLabelRow}>
                      <View style={styles.formIconCol}>
                        <MaterialCommunityIcons name="account-outline" size={20} color={colors.primaryLight} />
                      </View>
                      <Text style={styles.formLabelUpper}>ASSIGN TO *</Text>
                    </View>
                    {taskAssignableLoading ? (
                      <Text style={[styles.panelSub, { marginTop: 6 }]}>Loading people…</Text>
                    ) : null}
                    {!taskAssignableLoading && taskAssignableError ? (
                      <Text style={{ fontSize: 12, color: colors.dangerText, fontWeight: '600', marginTop: 6 }}>{taskAssignableError}</Text>
                    ) : null}
                    {!taskAssignableLoading && !taskAssignableError && assigneePool.length > 0 ? (
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
                            {String(taskAssignee || '').trim() || 'Select person'}
                          </Text>
                          <MaterialCommunityIcons name={hrAssignMenuOpen ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
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
                            {assigneePool.map((person, idx) => {
                              const id = typeof person === 'object' && person != null ? person.id : null;
                              const label =
                                typeof person === 'object' && person != null ? String(person.name || '').trim() : String(person);
                              const roleLabel =
                                typeof person === 'object' && person?.role ? String(person.role) : '';
                              const idNum = id != null ? Number(id) : NaN;
                              const selected = Number.isFinite(idNum) && taskAssigneeUserId === idNum;
                              const last = idx === assigneePool.length - 1;
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
                                  <MaterialCommunityIcons name="account-outline" size={18} color={colors.primaryLight} />
                                  <Text
                                    style={[styles.hrAssignSelectOptionText, selected && styles.hrAssignSelectOptionTextActive]}
                                    numberOfLines={1}>
                                    {roleLabel ? `${label} (${roleLabel})` : label}
                                  </Text>
                                </Pressable>
                              );
                            })}
                          </ScrollView>
                        </Animated.View>
                      </View>
                    ) : !taskAssignableLoading && !taskAssignableError ? (
                      <Text style={[styles.panelSub, { marginTop: 6 }]}>
                        No assignable users found. Confirm Task Management + Auth assignable-users API.
                      </Text>
                    ) : null}
                  </View>
                ) : null}
                <View style={styles.formLabelRow}>
                  <View style={styles.formIconCol}>
                    <MaterialCommunityIcons name="calendar-month-outline" size={20} color={colors.primaryLight} />
                  </View>
                  <Text style={styles.formLabelUpper}>DEADLINE *</Text>
                </View>
                <Pressable
                  onPress={openTaskDeadlinePicker}
                  style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 }]}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: taskDeadline?.trim() ? colors.text : colors.inputPlaceholder }}>
                    {taskDeadline?.trim() && /^\d{4}-\d{2}-\d{2}$/.test(taskDeadline.trim())
                      ? taskDeadline.trim()
                      : 'mm/dd/yyyy'}
                  </Text>
                  <MaterialCommunityIcons name="calendar-month-outline" size={24} color={colors.textSecondary} />
                </Pressable>
                <View style={styles.formLabelRow}>
                  <View style={styles.formIconCol}>
                    <MaterialCommunityIcons name="paperclip" size={20} color={colors.primaryLight} />
                  </View>
                  <Text style={styles.formLabelUpper}>ATTACHMENT{editingTaskId ? '' : ' *'}</Text>
                  <Text style={styles.formLabelMuted}>
                    {editingTaskId ? ' (optional · max 5 MB)' : ' (required · max 5 MB)'}
                  </Text>
                </View>
                <View style={styles.attachmentField}>
                  <View style={styles.attachmentPicker}>
                    <Pressable style={styles.attachmentBtn} onPress={handlePickTaskAttachment}>
                      <Text style={styles.attachmentBtnText}>Choose file</Text>
                    </Pressable>
                    <Text style={styles.attachmentFileText} numberOfLines={1} ellipsizeMode="middle">
                      {taskAttachmentName || 'No file chosen'}
                    </Text>
                  </View>
                </View>
                <View style={styles.formLabelRow}>
                  <View style={styles.formIconCol}>
                    <MaterialCommunityIcons name="text-long" size={20} color={colors.primaryLight} />
                  </View>
                  <Text style={styles.formLabelUpper}>DESCRIPTION</Text>
                  <Text style={styles.formLabelMuted}> (optional)</Text>
                </View>
                <TextInput
                  value={taskDescription}
                  onChangeText={setTaskDescription}
                  placeholder="Task description"
                  placeholderTextColor={colors.inputPlaceholder}
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
                    onPress={closeProjectTaskModal}>
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
                      <Text style={styles.actionBtnText}>{editingTaskId ? 'Save changes' : 'Create task'}</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            </KeyboardAwareScrollView>
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
              themeVariant={isDark ? 'dark' : 'light'}
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
              themeVariant={isDark ? 'dark' : 'light'}
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
            <KeyboardAwareScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator>
              <View style={styles.modalCard}>
                <View style={styles.taskDetailHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.taskDetailTitleRow}>
                      <MaterialCommunityIcons name="clipboard-text-outline" size={20} color={colors.primaryLight} />
                      <Text style={styles.taskDetailHeaderTitle}>Task Details</Text>
                    </View>
                    <Text style={styles.taskDetailHeaderSub}>
                      Assignee: {selectedProjectTask?.assignedToName || employeeNameByGdcId[selectedProjectTask?.gdcId] || selectedProjectTask?.assignee || 'Unassigned'} (
                      {selectedProjectTask?.assignedRole || 'Employee'})
                    </Text>
                  </View>
                  <View style={styles.taskDetailHeaderActions}>
                    {selectedProjectTask && canManagePendingProjectTask(selectedProjectTask) ? (
                      <>
                        <Pressable
                          style={styles.taskDetailActionBtn}
                          onPress={() => {
                            handleEditProjectTask(selectedProjectTask);
                            setSelectedProjectTask(null);
                          }}>
                          <MaterialCommunityIcons name="pencil-outline" size={16} color={colors.primaryLight} />
                        </Pressable>
                        <Pressable
                          style={[styles.taskDetailActionBtn, styles.taskDetailDeleteBtn]}
                          onPress={() => {
                            handleDeleteProjectTask(selectedProjectTask.id);
                            setSelectedProjectTask(null);
                          }}>
                          <MaterialCommunityIcons name="trash-can-outline" size={16} color={colors.dangerText} />
                        </Pressable>
                      </>
                    ) : null}
                    <Pressable onPress={() => setSelectedProjectTask(null)} hitSlop={8}>
                      <MaterialCommunityIcons name="close" size={20} color={colors.textSecondary} />
                    </Pressable>
                  </View>
                </View>

                <View style={[styles.taskDetailBody, isCompactMobile && styles.taskDetailBodyMobile]}>
                  <View style={styles.taskDetailMainCol}>
                    <Text style={styles.detailTitle}>{selectedProjectTask?.title}</Text>
                    <Text style={styles.detailBody}>{selectedProjectTask?.description || 'No description'}</Text>
                    {selectedProjectTask?.attachmentName ? (
                      <Pressable
                        style={styles.taskDetailAttachmentCard}
                        onPress={() => promptTaskAttachmentActions(selectedProjectTask)}>
                        <Text style={styles.taskDetailAttachmentLabel}>Attachment</Text>
                        <View style={styles.taskDetailAttachmentRow}>
                          <MaterialCommunityIcons name="paperclip" size={18} color={colors.primaryLight} />
                          <Text style={styles.taskDetailAttachmentName} numberOfLines={2} ellipsizeMode="tail">
                            {selectedProjectTask.attachmentName}
                          </Text>
                        </View>
                      </Pressable>
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
                    {selectedDetailStatusTone ? (
                      <View style={[styles.projectStatePill, selectedDetailStatusTone.pill]}>
                        <Text style={[styles.projectStateText, selectedDetailStatusTone.text]}>
                          {String(selectedDisplayStatus || 'Pending').toUpperCase()}
                        </Text>
                      </View>
                    ) : null}
                    <View style={styles.taskDetailDueRow}>
                      <MaterialCommunityIcons name="calendar-month-outline" size={18} color={colors.textSecondary} />
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
                        <MaterialCommunityIcons name={forwardTlDropdownOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
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
                        <MaterialCommunityIcons name="note-text-outline" size={18} color={colors.primaryLight} />
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
                      placeholderTextColor={colors.inputPlaceholder}
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
            </KeyboardAwareScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
