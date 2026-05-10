import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Animated, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  forwardTlDropdownOpen,
  setForwardTlDropdownOpen,
  forwardDropdownAnim,
  tlForwardOptions,
  handleForwardProjectToTl,
  canStartProjectTask,
  handleStartProjectTask,
}) {
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
            <TextInput
              value={projectFromDate}
              onChangeText={setProjectFromDate}
              placeholder="From (YYYY-MM-DD)"
              placeholderTextColor="#94a3b8"
              style={[styles.input, styles.dateInput]}
            />
            <TextInput
              value={projectToDate}
              onChangeText={setProjectToDate}
              placeholder="To (YYYY-MM-DD)"
              placeholderTextColor="#94a3b8"
              style={[styles.input, styles.dateInput]}
            />
          </View>
          {isAdminRole(user?.role) ? (
            <Pressable style={styles.actionBtn} onPress={() => setCreateTaskOpen(true)}>
              <Text style={styles.actionBtnText}>Create Task</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Task List</Text>
          <Text style={styles.panelSub}>Project tasks matching current filters.</Text>
          {filteredProjectTasks.length === 0 ? (
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
            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>{editingTaskId ? 'Update Project Task' : 'Create Project Task'}</Text>
                <TextInput value={taskTitle} onChangeText={setTaskTitle} placeholder="Task title" placeholderTextColor="#94a3b8" style={styles.input} />
                <TextInput
                  value={taskAssignee}
                  onChangeText={setTaskAssignee}
                  placeholder="Assign to HR (name)"
                  placeholderTextColor="#94a3b8"
                  style={styles.input}
                />
                {isAdminRole(user?.role) ? (
                  <View style={[styles.chipRow, { marginTop: 8 }]}>
                    {hrAssignableUsers.map((hrName) => (
                      <Pressable
                        key={hrName}
                        onPress={() => setTaskAssignee(hrName)}
                        style={[styles.filterChip, taskAssignee === hrName && styles.filterChipActive]}>
                        <Text style={[styles.filterChipText, taskAssignee === hrName && styles.filterChipTextActive]}>{hrName}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
                <TextInput
                  value={taskDeadline}
                  onChangeText={setTaskDeadline}
                  placeholder="Deadline (YYYY-MM-DD)"
                  placeholderTextColor="#94a3b8"
                  style={styles.input}
                />
                <TextInput
                  value={taskDescription}
                  onChangeText={setTaskDescription}
                  placeholder="Task description"
                  placeholderTextColor="#94a3b8"
                  style={[styles.input, styles.textAreaSm]}
                  multiline
                  textAlignVertical="top"
                />
                <View style={styles.attachmentField}>
                  <Text style={styles.attachmentLabel}>Attachment (images/documents)</Text>
                  <View style={styles.attachmentPicker}>
                    <Pressable style={styles.attachmentBtn} onPress={handlePickTaskAttachment}>
                      <Text style={styles.attachmentBtnText}>Choose file</Text>
                    </Pressable>
                    <Text style={styles.attachmentFileText} numberOfLines={1}>
                      {taskAttachmentName || 'No file chosen'}
                    </Text>
                  </View>
                </View>
                <View style={styles.modalActions}>
                  <Pressable style={styles.cancelBtn} onPress={() => setCreateTaskOpen(false)}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </Pressable>
                  <Pressable style={styles.modalPrimaryBtn} onPress={handleCreateProjectTask}>
                    <Text style={styles.actionBtnText}>{editingTaskId ? 'Update Task' : 'Save Task'}</Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
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
                          {tlForwardOptions.map((lead) => (
                            <Pressable
                              key={`${lead.name}-${lead.team}`}
                              onPress={() => {
                                setForwardTlName(lead.name);
                                setForwardTlDropdownOpen(false);
                              }}
                              style={[styles.forwardSelectOption, forwardTlName === lead.name && styles.forwardSelectOptionActive]}>
                              <Text style={[styles.forwardSelectOptionText, forwardTlName === lead.name && styles.forwardSelectOptionTextActive]}>
                                {lead.name} — {lead.team}
                              </Text>
                            </Pressable>
                          ))}
                        </Animated.View>
                      ) : null}
                    </View>
                    <Pressable style={[styles.modalPrimaryBtn, !forwardTlName && styles.actionBtnDisabled]} disabled={!forwardTlName} onPress={handleForwardProjectToTl}>
                      <Text style={styles.actionBtnText}>Forward to TL</Text>
                    </Pressable>
                  </View>
                ) : null}
                {canStartProjectTask ? (
                  <View style={styles.forwardWrap}>
                    <Text style={styles.forwardTitle}>Ready to start this task?</Text>
                    <Pressable style={styles.startWorkBtn} onPress={handleStartProjectTask}>
                      <MaterialCommunityIcons name="play-circle-outline" size={16} color="#fff" />
                      <Text style={styles.actionBtnText}>Start Work</Text>
                    </Pressable>
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
