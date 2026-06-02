import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import { Redirect, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Platform, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdminSection } from '@/components/dashboard/route-modules/admin-section';
import { AvailabilitySection } from '@/components/dashboard/route-modules/availability-section';
import { DailyUpdatesSection } from '@/components/dashboard/route-modules/daily-updates-section';
import { ProjectManagerSection } from '@/components/dashboard/route-modules/project-manager-section';
import { RequestsSection } from '@/components/dashboard/route-modules/requests-section';
import routeDetailStyles from '@/components/dashboard/route-modules/route-detail-styles';
import { TeamsManagementSection } from '@/components/dashboard/route-modules/teams-management-section';
import { TimesheetSection } from '@/components/dashboard/route-modules/timesheet-section';
import { DashboardTopbar } from '@/components/dashboard/topbar';
import { GDC_MODULES } from '@/constants/gdc-modules';
import { useAuth } from '@/context/auth-context';
import {
    approveLeaveRequest as approveLeaveRequestApi,
    approveManualTimeRequest as approveManualTimeRequestApi,
    approveTask as approveTaskApi,
    approveUser,
    createDepartment,
    createLeaveRequest as createLeaveRequestApi,
    createManualTimeRequest as createManualTimeRequestApi,
    createTask as createTaskApi,
    deleteDepartment,
    deleteTask as deleteTaskApi,
    forwardTaskToTeamLeader,
    getAllUsers,
    getAttendance30Days,
    getAttendance7Days,
    getAttendanceSummary,
    getClockHistory,
    getClockRecords,
    getCurrentShift,
    getLeadershipDailyOverview,
    getManualTimesheetRecords,
    getPendingUsersList,
    getTaskAssignableUsers,
    getTeamLeaderDailyBundle,
    getTeams,
    listDepartments,
    listLeaveRequests,
    listManualTimeRequests,
    listMyEmployeeDailyUpdates,
    listTasks,
    rejectLeaveRequest as rejectLeaveRequestApi,
    rejectManualTimeRequest as rejectManualTimeRequestApi,
    rejectUser,
    saveShiftTiming,
    sendTaskToReview,
    startTaskWork,
    submitTask as submitTaskApi,
    updateTask as updateTaskApi,
    updateUserRole,
    upsertHrDailySummary,
    upsertMyEmployeeDailyUpdate,
    upsertTeamLeaderDailySummary,
} from '@/services/api';
import {
    isApprovedRow,
    isVerifiedRow,
    normalizeApprovedUsersList,
    normalizePendingUsersList,
} from '@/utils/admin-api-response';
import { apiRoleFromDisplay, isRolePromotionAllowed, mapApprovedUserRow, mapPendingUserRow } from '@/utils/admin-directory';
import {
    amPmFromApiTime,
    apiLeaveTypeFromUi,
    apiRoleFromDisplayFilter,
    apiTimeFromAmPm,
    buildAttendanceRows,
    enrichRequestsWithAvatars,
    enrichTimesheetUserAvatars,
    filterAttendanceOverviewUsers,
    isExcludedAttendanceOverviewRole,
    mapClockHistoryToAvailabilityLog,
    mapClockHistoryToLog,
    mapLeaveRowToUi,
    mapManualRowToUi,
    mapRecordRowToTimesheetLog,
    mapSevenDayUserRow,
    mapSummaryUserToAvailability,
    mapThirtyDayUserRow,
    mapTodaySummaryUserRow
} from '@/utils/attendance-ui-map';
import { buildTeamsManagementGroups } from '@/utils/build-team-assignments';
import { resolveProfileImageUri } from '@/utils/chat-directory';
import { isAdminOrHrRole, isAdminRole } from '@/utils/roles';
import { mapTaskRowToProjectTask } from '@/utils/task-ui-map';
import { normalizeTeamsList } from '@/utils/teams-api-response';

/** Background refresh while Task / Daily Updates routes are open (same cadence as dashboard home). */
const DATA_POLL_INTERVAL_MS = 45_000;

const ATTENDANCE_ROUTE_SLUGS = new Set([
  'timesheet',
  'clock-records',
  'manual-records',
  'availability',
  'my-requests',
  'request-management',
  'admin',
]);

// --- Mock-data helpers (temporary until backend integration) ---

function assignableRoleKey(roleRaw) {
  let r = String(roleRaw || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_');
  if (r === 'teamleader') r = 'team_leader';
  return r;
}

export default function RouteDetailScreen() {
  // --- Route + auth context ---
  const params = useLocalSearchParams();
  const { id } = params;
  const router = useRouter();
  const { user, token } = useAuth();
  const { width } = useWindowDimensions();
  const isCompactMobile = width < 420;
  const slug = Array.isArray(id) ? id[0] : id;
  const route = useMemo(() => GDC_MODULES.find((m) => m.id === slug), [slug]);

  // --- Local UI/state buckets ---
  const [dateMode, setDateMode] = useState('today');
  const [employeeUpdate, setEmployeeUpdate] = useState('');
  const [leaderSummary, setLeaderSummary] = useState('');
  const [hrNote, setHrNote] = useState('');
  const [dailyScreenLoading, setDailyScreenLoading] = useState(false);
  const [dailyScreenError, setDailyScreenError] = useState(null);
  const [dailyTlBundle, setDailyTlBundle] = useState(null);
  const [dailyLeadership, setDailyLeadership] = useState(null);
  const [dailySaveBusy, setDailySaveBusy] = useState(false);
  const [taskSubmitNote, setTaskSubmitNote] = useState('');
  const [taskWorkflowBusy, setTaskWorkflowBusy] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberStatusFilter, setMemberStatusFilter] = useState('all');
  const [summarySearch, setSummarySearch] = useState('');
  const [teamFilter, setTeamFilter] = useState('all');
  const [projectTasks, setProjectTasks] = useState([]);
  const [projectTasksLoading, setProjectTasksLoading] = useState(false);
  const [taskAssignableRaw, setTaskAssignableRaw] = useState([]);
  const [taskAssignableLoading, setTaskAssignableLoading] = useState(false);
  const [taskAssignableError, setTaskAssignableError] = useState(null);
  const [projectSearch, setProjectSearch] = useState('');
  const [projectStatusFilter, setProjectStatusFilter] = useState('all');
  const [projectFromDate, setProjectFromDate] = useState('');
  const [projectToDate, setProjectToDate] = useState('');
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [saveProjectTaskPhase, setSaveProjectTaskPhase] = useState('idle');
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [selectedProjectTask, setSelectedProjectTask] = useState(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskAssigneeUserId, setTaskAssigneeUserId] = useState(null);
  const [taskPriority, setTaskPriority] = useState('Medium');
  const [taskStatus, setTaskStatus] = useState('Pending');
  const [taskDeadline, setTaskDeadline] = useState('');
  const [taskAttachmentName, setTaskAttachmentName] = useState('');
  const [taskAttachmentUri, setTaskAttachmentUri] = useState('');
  const [forwardTlName, setForwardTlName] = useState('');
  const [forwardTlId, setForwardTlId] = useState(null);
  const [forwardTlDropdownOpen, setForwardTlDropdownOpen] = useState(false);
  const [projectStatusMenuOpen, setProjectStatusMenuOpen] = useState(false);
  const [teamAssignSearch, setTeamAssignSearch] = useState('');
  const [teamTlRosterLoading, setTeamTlRosterLoading] = useState(false);
  const [teamTlRosterError, setTeamTlRosterError] = useState(null);
  const [teamRosterTeams, setTeamRosterTeams] = useState([]);
  const [teamRosterUsers, setTeamRosterUsers] = useState([]);
  const [adminControlTab, setAdminControlTab] = useState('employees');
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminUsersLoading, setAdminUsersLoading] = useState(false);
  const [adminRoleFilter, setAdminRoleFilter] = useState('All');
  const [adminUserSearch, setAdminUserSearch] = useState('');
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [adminRoleSavingTarget, setAdminRoleSavingTarget] = useState(/** @type {string | null} */ (null));
  const [adminDirectoryActionKey, setAdminDirectoryActionKey] = useState(/** @type {string | null} */ (null));
  const [selectedAdminUserId, setSelectedAdminUserId] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [newDepartment, setNewDepartment] = useState('');
  const [shiftSaveLoading, setShiftSaveLoading] = useState(false);
  const [deptAddLoading, setDeptAddLoading] = useState(false);
  const [timesheetWindow, setTimesheetWindow] = useState('7d');
  const [tlTimesheetTab, setTlTimesheetTab] = useState('my-attendance');
  const [myRequestsTab, setMyRequestsTab] = useState('leave');
  const [timesheetSearch, setTimesheetSearch] = useState('');
  const [tlTeamSearch, setTlTeamSearch] = useState('');
  const [tlRecordSearch, setTlRecordSearch] = useState('');
  const [timesheetRoleFilter, setTimesheetRoleFilter] = useState('all');
  const [recordProviderFilter, setRecordProviderFilter] = useState('all');
  const [recordSearch, setRecordSearch] = useState('');
  const [recordFromDate, setRecordFromDate] = useState('');
  const [recordToDate, setRecordToDate] = useState('');
  const [recordDepartmentFilter, setRecordDepartmentFilter] = useState('all');
  const [recordStatusFilter, setRecordStatusFilter] = useState('all');
  const [requestStatusMenuOpen, setRequestStatusMenuOpen] = useState(false);
  const [timesheetUsers, setTimesheetUsers] = useState([]);
  const [timesheetLogs, setTimesheetLogs] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState(null);
  const [myAvailabilityLog, setMyAvailabilityLog] = useState([]);
  const [availabilityUsers, setAvailabilityUsers] = useState([]);
  const [availabilityRoleFilter, setAvailabilityRoleFilter] = useState('all');
  const [availabilityStatusFilter, setAvailabilityStatusFilter] = useState('all');
  const [availabilityQuickFilter, setAvailabilityQuickFilter] = useState('all');
  const [availabilitySearch, setAvailabilitySearch] = useState('');
  const [hoveredAvailabilityStatus, setHoveredAvailabilityStatus] = useState(null);
  const [availabilityFromDate, setAvailabilityFromDate] = useState('2026-05-01');
  const [availabilityToDate, setAvailabilityToDate] = useState('2026-05-31');
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [manualRequests, setManualRequests] = useState([]);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [leaveType, setLeaveType] = useState('Leave');
  const [leaveFromDate, setLeaveFromDate] = useState('');
  const [leaveToDate, setLeaveToDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [manualDate, setManualDate] = useState('');
  const [manualClockIn, setManualClockIn] = useState('');
  const [manualClockOut, setManualClockOut] = useState('');
  const [manualBreakOut, setManualBreakOut] = useState('');
  const [manualReason, setManualReason] = useState('');
  const [leaveStatusFilter, setLeaveStatusFilter] = useState('All');
  const [manualStatusFilter, setManualStatusFilter] = useState('All');
  const [requestAdminSearch, setRequestAdminSearch] = useState('');
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState(null);
  const [rejectTargetType, setRejectTargetType] = useState('leave');
  const [rejectReason, setRejectReason] = useState('');
  const [leaveTypeDropdownOpen, setLeaveTypeDropdownOpen] = useState(false);
  const [shiftDate, setShiftDate] = useState('2026-05-07');
  const [shiftStart, setShiftStart] = useState('10:00 AM');
  const [shiftEnd, setShiftEnd] = useState('07:00 PM');
  const forwardDropdownAnim = useRef(new Animated.Value(0)).current;

  const fetchAdminDirectory = useCallback(async () => {
    if (!token || !isAdminRole(user?.role)) return;
    setAdminUsersLoading(true);
    try {
      const pendingRes = await getPendingUsersList(token);
      let pendingRows = normalizePendingUsersList(pendingRes);

      let approvedRows = [];
      try {
        const approvedRes = await getAllUsers(token, { approvedOnly: true });
        approvedRows = normalizeApprovedUsersList(approvedRes);
      } catch {
        const fallback = await getAllUsers(token, {});
        const all = normalizeApprovedUsersList(fallback);
        approvedRows = all.filter((r) => isVerifiedRow(r) && isApprovedRow(r));
        if (!pendingRows.length) {
          pendingRows = all.filter((r) => isVerifiedRow(r) && !isApprovedRow(r));
        }
      }

      const merged = [
        ...approvedRows.map(mapApprovedUserRow).filter((m) => m.id != null),
        ...pendingRows.map(mapPendingUserRow).filter((m) => m.id != null),
      ].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
      setAdminUsers(merged);
    } catch (e) {
      Alert.alert('Admin directory', e?.message ?? 'Could not load users');
    } finally {
      setAdminUsersLoading(false);
    }
  }, [token, user?.role]);

  const fetchDepartments = useCallback(async () => {
    if (!token || !isAdminRole(user?.role)) return;
    try {
      const res = await listDepartments(token);
      const raw = Array.isArray(res?.data) ? res.data : [];
      const names = raw.map((d) => (typeof d === 'string' ? d : d?.name)).filter(Boolean);
      setDepartments(names);
    } catch (e) {
      Alert.alert('Departments', e?.message ?? 'Could not load departments');
    }
  }, [token, user?.role]);

  useEffect(() => {
    if (slug !== 'admin' || !isAdminRole(user?.role) || !token) return;
    fetchAdminDirectory();
  }, [slug, token, user?.role, fetchAdminDirectory]);

  useEffect(() => {
    if (slug !== 'admin' || !isAdminRole(user?.role) || !token) return;
    if (adminControlTab !== 'departments') return;
    fetchDepartments();
  }, [slug, adminControlTab, token, user?.role, fetchDepartments]);

  const loadTaskAssignableUsers = useCallback(async () => {
    if (!token || slug !== 'project-manager') return;
    if (!isAdminOrHrRole(user?.role)) {
      setTaskAssignableRaw([]);
      setTaskAssignableError(null);
      return;
    }
    setTaskAssignableLoading(true);
    setTaskAssignableError(null);
    try {
      const rows = await getTaskAssignableUsers(token);
      const list = Array.isArray(rows) ? rows : [];
      const normalized = list
        .map((r) => ({
          id: Number(r.id),
          name: String(r.name ?? r.full_name ?? r.username ?? '').trim(),
          role: r.role,
        }))
        .filter((r) => Number.isFinite(r.id) && r.name);
      setTaskAssignableRaw(normalized);
    } catch (e) {
      setTaskAssignableRaw([]);
      setTaskAssignableError(e?.message ?? 'Could not load assignable users (check Task API + Auth).');
    } finally {
      setTaskAssignableLoading(false);
    }
  }, [token, slug, user?.role]);

  const loadProjectTasks = useCallback(async () => {
    if (!token || slug !== 'project-manager') return;
    setProjectTasksLoading(true);
    try {
      const query = {};
      const f = String(projectStatusFilter || 'all').toLowerCase().trim();
      if (f === 'pending') query.status = 'pending';
      else if (f === 'in progress') query.status = 'in_progress';
      else if (f === 'review') query.status = 'review';
      else if (f === 'submitted') query.status = 'submitted';
      else if (f === 'approved') query.status = 'approved';
      const sq = projectSearch.trim();
      if (sq) query.q = sq;
      const from = projectFromDate.trim();
      const to = projectToDate.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(from)) query.from = from;
      if (/^\d{4}-\d{2}-\d{2}$/.test(to)) query.to = to;
      const rows = await listTasks(token, query);
      setProjectTasks(rows.map(mapTaskRowToProjectTask));
    } catch (e) {
      Alert.alert('Tasks', e?.message ?? 'Could not load tasks');
    } finally {
      setProjectTasksLoading(false);
    }
  }, [token, slug, projectStatusFilter, projectSearch, projectFromDate, projectToDate]);

  useFocusEffect(
    useCallback(() => {
      if (slug !== 'project-manager' || !token) return undefined;
      void loadProjectTasks();
      void loadTaskAssignableUsers();
      return undefined;
    }, [slug, token, loadProjectTasks, loadTaskAssignableUsers]),
  );

  useEffect(() => {
    if (slug !== 'project-manager' || !token) return undefined;
    const id = setInterval(() => {
      void loadProjectTasks();
      void loadTaskAssignableUsers();
    }, DATA_POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [slug, token, loadProjectTasks, loadTaskAssignableUsers]);

  useEffect(() => {
    if (slug !== 'project-manager' || !createTaskOpen || !token || !isAdminRole(user?.role)) return;
    void loadTaskAssignableUsers();
  }, [createTaskOpen, slug, token, user?.role, loadTaskAssignableUsers]);

  useEffect(() => {
    if (!roleModalOpen) setAdminRoleSavingTarget(null);
  }, [roleModalOpen]);

  useEffect(() => {
    if (!createTaskOpen) setSaveProjectTaskPhase('idle');
  }, [createTaskOpen]);

  useEffect(() => {
    if (!selectedProjectTask) {
      setTaskSubmitNote('');
    }
  }, [selectedProjectTask]);

  const loadTeamTlRoster = useCallback(async () => {
    if (!token || !isAdminOrHrRole(user?.role)) {
      setTeamRosterTeams([]);
      setTeamRosterUsers([]);
      setTeamTlRosterError(null);
      setTeamTlRosterLoading(false);
      return;
    }
    setTeamTlRosterLoading(true);
    setTeamTlRosterError(null);
    try {
      const [teamsRes, usersRes] = await Promise.all([getTeams(token), getAllUsers(token, { approvedOnly: true })]);
      const teams = normalizeTeamsList(teamsRes);
      const userRows = normalizeApprovedUsersList(usersRes);
      setTeamRosterTeams(teams);
      setTeamRosterUsers(userRows);
    } catch (e) {
      setTeamRosterTeams([]);
      setTeamRosterUsers([]);
      setTeamTlRosterError(e?.message ?? 'Could not load team roster');
    } finally {
      setTeamTlRosterLoading(false);
    }
  }, [token, user?.role]);

  useFocusEffect(
    useCallback(() => {
      if (slug !== 'team-tl' && slug !== 'team-data') return;
      void loadTeamTlRoster();
    }, [slug, loadTeamTlRoster]),
  );

  useEffect(() => {
    const tab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
    const filter = Array.isArray(params.filter) ? params.filter[0] : params.filter;
    const status = Array.isArray(params.status) ? params.status[0] : params.status;

    if (slug === 'admin') {
      if (tab) setAdminControlTab(String(tab));
      if (filter) setAdminRoleFilter(String(filter));
    }
    if (slug === 'my-requests' && tab) {
      setMyRequestsTab(String(tab) === 'manual' ? 'manual' : 'leave');
    }
    if (slug === 'request-management' && status) {
      setLeaveStatusFilter(String(status));
    }
    if (slug === 'manual-time-requests' && status) {
      setManualStatusFilter(String(status));
    }
    if (slug === 'project-manager' && status) {
      setProjectStatusFilter(String(status).toLowerCase());
      setProjectStatusMenuOpen(false);
    }
    if (slug === 'availability' && filter) {
      const q = String(filter).toLowerCase();
      if (q === 'present') {
        setAvailabilityQuickFilter('present');
        setAvailabilityStatusFilter('Available');
      } else if (q === 'absent') {
        setAvailabilityQuickFilter('absent');
        setAvailabilityStatusFilter('Unavailable');
      } else if (q === 'leave') {
        setAvailabilityQuickFilter('leave');
        setAvailabilityStatusFilter('Leave');
      } else if (q === 'all') {
        setAvailabilityQuickFilter('all');
        setAvailabilityStatusFilter('all');
      }
    }
  }, [params.filter, params.status, params.tab, slug]);
  const reportingYmd = useMemo(() => {
    const d = new Date();
    if (dateMode === 'yesterday') d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, [dateMode]);

  const loadDailyUpdatesScreen = useCallback(async () => {
    if (!token || slug !== 'daily-updates') return;
    setDailyScreenLoading(true);
    setDailyScreenError(null);
    try {
      const role = String(user?.role || '');
      if (role === 'Employee') {
        const rows = await listMyEmployeeDailyUpdates(token);
        const list = Array.isArray(rows) ? rows : [];
        const row = list.find((r) => r && String(r.date || '').slice(0, 10) === reportingYmd);
        setEmployeeUpdate(row && row.body != null ? String(row.body) : '');
      } else if (role === 'Team Leader') {
        const bundle = await getTeamLeaderDailyBundle(token, reportingYmd);
        setDailyTlBundle(bundle && typeof bundle === 'object' ? bundle : null);
        const sum = bundle?.team_leader_summary;
        setLeaderSummary(sum && sum.body != null ? String(sum.body) : '');
      } else if (role === 'HR' || isAdminRole(role)) {
        const overview = await getLeadershipDailyOverview(token, reportingYmd);
        setDailyLeadership(overview && typeof overview === 'object' ? overview : null);
        const hr = overview?.hr_summary;
        if (role === 'HR' && hr && hr.body != null) setHrNote(String(hr.body));
        if (isAdminRole(role) && hr && hr.body != null) setHrNote(String(hr.body));
      }
    } catch (e) {
      setDailyScreenError(e?.message ?? 'Could not load daily updates');
      if (user?.role === 'Employee') setEmployeeUpdate('');
      if (user?.role === 'Team Leader') {
        setDailyTlBundle(null);
        setLeaderSummary('');
      }
      if (user?.role === 'HR' || isAdminRole(user?.role)) {
        setDailyLeadership(null);
      }
    } finally {
      setDailyScreenLoading(false);
    }
  }, [token, slug, user?.role, reportingYmd]);

  useFocusEffect(
    useCallback(() => {
      if (slug !== 'daily-updates' || !token) return undefined;
      void loadDailyUpdatesScreen();
      return undefined;
    }, [slug, token, loadDailyUpdatesScreen]),
  );

  useEffect(() => {
    if (slug !== 'daily-updates' || !token) return undefined;
    const id = setInterval(() => void loadDailyUpdatesScreen(), DATA_POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [slug, token, loadDailyUpdatesScreen]);

  useEffect(() => {
    Animated.timing(forwardDropdownAnim, {
      toValue: forwardTlDropdownOpen ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [forwardDropdownAnim, forwardTlDropdownOpen]);

  const tlMembersFromApi = useMemo(() => {
    if (!dailyTlBundle || typeof dailyTlBundle !== 'object') return [];
    const members = Array.isArray(dailyTlBundle.members) ? dailyTlBundle.members : [];
    const updates = Array.isArray(dailyTlBundle.employee_updates) ? dailyTlBundle.employee_updates : [];
    const myUid = parseInt(String(user?.id || ''), 10);
    const myNameNorm = String(user?.name || '')
      .trim()
      .toLowerCase();

    return members
      .map((m) => {
        const midNum = m?.id != null ? parseInt(String(m.id), 10) : NaN;
        const mid = m?.id != null ? String(m.id) : '';
        const name = String(m.full_name ?? m.name ?? m.username ?? '').trim() || (mid ? `User ${mid}` : 'Member');
        const u = updates.find((e) => e && String(e.userId) === mid);
        const hasBody = u && String(u.body ?? '').trim();
        return {
          memberId: mid,
          memberNumericId: Number.isFinite(midNum) ? midNum : null,
          name,
          status: hasBody ? 'Submitted' : 'Missing',
          updateBody: hasBody ? String(u.body) : '',
        };
      })
      .filter((row) => {
        if (Number.isFinite(myUid) && row.memberNumericId != null && row.memberNumericId === myUid) return false;
        if (myNameNorm && row.name.trim().toLowerCase() === myNameNorm) return false;
        return true;
      });
  }, [dailyTlBundle, user?.id, user?.name]);

  const leadershipRowsFromApi = useMemo(() => {
    if (!dailyLeadership || typeof dailyLeadership !== 'object') return [];
    const arr = Array.isArray(dailyLeadership.team_leader_summaries) ? dailyLeadership.team_leader_summaries : [];
    return arr.map((s) => ({
      team: String(s?.team ?? 'Team'),
      lead: '',
      summary: String(s?.body ?? ''),
    }));
  }, [dailyLeadership]);

  const filteredTlMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    let rows = tlMembersFromApi;
    if (q) rows = rows.filter((m) => m.name.toLowerCase().includes(q));
    if (memberStatusFilter !== 'all') rows = rows.filter((m) => m.status.toLowerCase() === memberStatusFilter);
    return rows;
  }, [tlMembersFromApi, memberSearch, memberStatusFilter]);

  const filteredTlRows = useMemo(() => {
    const q = summarySearch.trim().toLowerCase();
    let rows = leadershipRowsFromApi;
    if (q) rows = rows.filter((r) => `${r.team} ${r.lead} ${r.summary}`.toLowerCase().includes(q));
    return rows;
  }, [summarySearch, leadershipRowsFromApi]);

  const visibleProjectTasks = useMemo(() => {
    if (!user?.role) return projectTasks;
    if (isAdminRole(user.role)) return projectTasks;
    if (user.role === 'HR') {
      return projectTasks;
    }
    if (user.role === 'Team Leader') {
      return projectTasks;
    }
    const empUid = parseInt(String(user.id), 10);
    if (!Number.isFinite(empUid)) return projectTasks;
    return projectTasks.filter((task) => task.assignedToUserId === empUid);
  }, [projectTasks, user?.id, user?.role]);

  const filteredProjectTasks = useMemo(() => {
    const q = projectSearch.trim().toLowerCase();
    const f = String(projectStatusFilter || 'all').toLowerCase().trim();
    return visibleProjectTasks.filter((task) => {
      if (f !== 'all') {
        if (f === 'overdue') {
          const today = new Date().toISOString().slice(0, 10);
          if (!task.deadline || task.deadline >= today) return false;
          const st = String(task.status || '').toLowerCase();
          if (!st.includes('pending') && !st.includes('progress')) return false;
        } else if (f === 'completed') {
          const st = String(task.status || '').toLowerCase();
          if (!st.includes('approved') && !st.includes('submitted')) return false;
        } else if (String(task.status || '').toLowerCase() !== f) return false;
      }
      if (projectFromDate && task.deadline < projectFromDate) return false;
      if (projectToDate && task.deadline > projectToDate) return false;
      if (!q) return true;
      const haystack =
        `${task.id} ${task.title} ${task.description} ${task.assignee} ${task.assignedToName ?? ''} ${task.priority} ${task.status} ${task.attachmentName ?? ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [projectFromDate, projectSearch, projectStatusFilter, projectToDate, visibleProjectTasks]);
  const formatProjectDueDate = useCallback((isoDate) => {
    if (!isoDate) return 'Due date not set';
    const parsed = new Date(isoDate);
    if (Number.isNaN(parsed.getTime())) return `Due ${isoDate}`;
    return `Due ${new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(parsed)}`;
  }, []);
  const projectStatusTone = useCallback((status) => {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'pending') return styles.projectStatusPending;
    if (normalized === 'in progress' || normalized === 'working') return styles.projectStatusProgress;
    if (normalized === 'review') return styles.projectStatusReview;
    if (normalized === 'submitted') return styles.projectStatusSubmitted;
    if (normalized === 'overdue') return styles.projectStatusOverdue;
    if (normalized === 'completed' || normalized === 'approved') return styles.projectStatusCompleted;
    return styles.projectStatusDefault;
  }, []);
  const hrAssignableUsers = useMemo(() => {
    if (!isAdminRole(user?.role)) return [];
    return taskAssignableRaw
      .filter((u) => assignableRoleKey(u.role) === 'hr')
      .map((u) => ({ id: u.id, name: String(u.name || '').trim() }))
      .filter((u) => u.name);
  }, [user?.role, taskAssignableRaw]);

  const tlForwardPickList = useMemo(() => {
    if (user?.role !== 'HR') return [];
    return taskAssignableRaw
      .filter((u) => assignableRoleKey(u.role) === 'team_leader')
      .map((u) => ({
        id: u.id,
        name: String(u.name || '').trim(),
        team: u.team_name != null ? String(u.team_name) : u.team != null ? String(u.team) : '',
      }))
      .filter((u) => u.name);
  }, [user?.role, taskAssignableRaw]);

  const myUid = parseInt(String(user?.id || ''), 10);
  const canForwardProjectTask =
    user?.role === 'HR' &&
    selectedProjectTask?.status === 'Pending' &&
    selectedProjectTask?.assignedRole === 'HR' &&
    Number.isFinite(myUid) &&
    selectedProjectTask?.assignedToUserId === myUid;
  const canStartProjectTask =
    (user?.role === 'Employee' || user?.role === 'Team Leader') &&
    selectedProjectTask?.status === 'Pending' &&
    Number.isFinite(myUid) &&
    selectedProjectTask?.assignedToUserId === myUid;
  const canSubmitProjectTask =
    (user?.role === 'Employee' || user?.role === 'Team Leader') &&
    Number.isFinite(myUid) &&
    selectedProjectTask?.assignedToUserId === myUid &&
    ['In Progress', 'Review'].includes(String(selectedProjectTask?.status || ''));
  const isTlCreatedSelectedTask = selectedProjectTask?.createdByRole === 'Team Leader';
  const isReviewerUser =
    user?.role === 'Admin' || user?.role === 'HR' || user?.role === 'Team Leader';
  const canReviewerActOnTlCreatedTask =
    !isTlCreatedSelectedTask ||
    (user?.role === 'Team Leader' && selectedProjectTask?.createdByUserId === myUid) ||
    isAdminRole(user?.role) ||
    user?.role === 'HR';
  const canSendToReviewProjectTask =
    Boolean(selectedProjectTask) &&
    String(selectedProjectTask?.status || '') === 'Submitted' &&
    isReviewerUser &&
    canReviewerActOnTlCreatedTask;
  const canApproveProjectTask =
    Boolean(selectedProjectTask) &&
    ['Submitted', 'Review'].includes(String(selectedProjectTask?.status || '')) &&
    isReviewerUser &&
    canReviewerActOnTlCreatedTask;
  const employeeNameByGdcId = useMemo(
    () => Object.fromEntries(timesheetUsers.map((entry) => [entry.gdcId, entry.name])),
    [timesheetUsers],
  );
  const teamsManagementGroups = useMemo(
    () => buildTeamsManagementGroups(teamRosterTeams, teamRosterUsers),
    [teamRosterTeams, teamRosterUsers],
  );
  const teamsFilteredByTlSearch = useMemo(() => {
    const q = teamAssignSearch.trim().toLowerCase();
    if (!q) return teamsManagementGroups;
    return teamsManagementGroups.filter((t) => {
      return String(t.name || '').toLowerCase().includes(q);
    });
  }, [teamsManagementGroups, teamAssignSearch]);

  const timesheetDays = useMemo(() => {
    const days = [];
    const now = new Date();
    const total = timesheetWindow === 'today' ? 1 : timesheetWindow === '7d' ? 7 : 30;
    for (let i = total - 1; i >= 0; i -= 1) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const iso = `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`;
      days.push(iso);
    }
    return days;
  }, [timesheetWindow]);

  const loadAttendanceScreen = useCallback(async () => {
    if (!token || !ATTENDANCE_ROUTE_SLUGS.has(slug)) return;
    setAttendanceLoading(true);
    setAttendanceError(null);
    try {
      const roleQ = apiRoleFromDisplayFilter(timesheetRoleFilter);
      const searchQ =
        slug === 'clock-records' || slug === 'manual-records'
          ? recordSearch.trim()
          : timesheetSearch.trim();
      const rangeFrom = recordFromDate || timesheetDays[0] || '';
      const rangeTo = recordToDate || timesheetDays[timesheetDays.length - 1] || '';

      if (slug === 'request-management' || slug === 'my-requests') {
        const [leaves, manuals] = await Promise.all([listLeaveRequests(token), listManualTimeRequests(token)]);
        let leaveUi = leaves.map((row) => mapLeaveRowToUi(row));
        let manualUi = manuals.map((row) => mapManualRowToUi(row));
        if (leaveUi.some((r) => !r.avatarUrl) || manualUi.some((r) => !r.avatarUrl)) {
          try {
            const authRes = await getAllUsers(token, { approvedOnly: true });
            const profileRows = normalizeApprovedUsersList(authRes);
            leaveUi = enrichRequestsWithAvatars(leaveUi, profileRows);
            manualUi = enrichRequestsWithAvatars(manualUi, profileRows);
          } catch {
            /* use requester_avatar from attendance DB */
          }
        }
        setLeaveRequests(leaveUi);
        setManualRequests(manualUi);
        return;
      }

      if (slug === 'availability') {
        const summary = await getAttendanceSummary(token, {
          role: apiRoleFromDisplayFilter(availabilityRoleFilter),
        });
        let availUsers = filterAttendanceOverviewUsers(
          summary.users
            .filter((row) => !isExcludedAttendanceOverviewRole(row.role))
            .map((row) => mapSummaryUserToAvailability(row)),
        );
        if (availUsers.some((u) => !u.avatarUrl)) {
          try {
            const authRes = await getAllUsers(token, { approvedOnly: true });
            availUsers = enrichTimesheetUserAvatars(availUsers, normalizeApprovedUsersList(authRes));
          } catch {
            /* attendance profile_image only */
          }
        }
        setAvailabilityUsers(availUsers);
        const history = await getClockHistory(token);
        setMyAvailabilityLog(history.map((row) => mapClockHistoryToAvailabilityLog(row)));
        return;
      }

      if (slug === 'admin') {
        const shift = await getCurrentShift(token);
        if (shift && typeof shift === 'object') {
          const s = /** @type {{ effective_date?: string; shift_start?: string; shift_end?: string }} */ (shift);
          if (s.effective_date) setShiftDate(String(s.effective_date).slice(0, 10));
          if (s.shift_start) setShiftStart(amPmFromApiTime(s.shift_start));
          if (s.shift_end) setShiftEnd(amPmFromApiTime(s.shift_end));
        }
        return;
      }

      if (slug === 'clock-records' || slug === 'manual-records') {
        const recordRole =
          recordProviderFilter !== 'all' ? apiRoleFromDisplayFilter(recordProviderFilter) : roleQ;
        const query = {
          from: rangeFrom,
          to: rangeTo,
          ...(recordRole !== 'ALL' ? { role: recordRole } : {}),
          ...(searchQ ? { gdc_id: searchQ } : {}),
          ...(recordDepartmentFilter !== 'all' ? { department: recordDepartmentFilter } : {}),
          ...(slug === 'manual-records' && recordStatusFilter !== 'all'
            ? { status: recordStatusFilter }
            : {}),
        };
        const source = slug === 'manual-records' ? 'manual' : 'clock';
        const rows =
          source === 'manual'
            ? await getManualTimesheetRecords(token, query)
            : await getClockRecords(token, query);
        const logs = rows
          .filter((row) => !isExcludedAttendanceOverviewRole(row.role))
          .map((row) => mapRecordRowToTimesheetLog(row, source));
        const usersByGdc = new Map();
        for (const log of logs) {
          if (!usersByGdc.has(log.gdcId)) {
            usersByGdc.set(log.gdcId, {
              gdcId: log.gdcId,
              name: log.userName || log.gdcId,
              role: log.userRole || 'Employee',
              team: log.team || log.department || '—',
              avatarUrl: log.avatarUrl || null,
            });
          }
        }
        setTimesheetUsers(filterAttendanceOverviewUsers([...usersByGdc.values()]));
        setTimesheetLogs(logs);
        return;
      }

      if (slug === 'timesheet') {
        if (timesheetWindow === '30d') {
          const data = await getAttendance30Days(token, {
            role: roleQ,
            ...(searchQ ? { search: searchQ } : {}),
          });
          setTimesheetUsers(
            filterAttendanceOverviewUsers(
              data.users
                .filter((row) => !isExcludedAttendanceOverviewRole(row.role))
                .map((row) => mapThirtyDayUserRow(row)),
            ),
          );
          setTimesheetLogs([]);
        } else if (timesheetWindow === '7d') {
          const rows = await getAttendance7Days(token, {
            role: roleQ,
            ...(searchQ ? { search: searchQ } : {}),
          });
          setTimesheetUsers(
            filterAttendanceOverviewUsers(
              rows
                .filter((row) => !isExcludedAttendanceOverviewRole(row.role))
                .map((row) => mapSevenDayUserRow(row)),
            ),
          );
          setTimesheetLogs([]);
        } else {
          const summary = await getAttendanceSummary(token, { role: roleQ });
          const today = timesheetDays[0] || '';
          let todayUsers = filterAttendanceOverviewUsers(
            summary.users
              .filter((row) => !isExcludedAttendanceOverviewRole(row.role))
              .map((row) => mapTodaySummaryUserRow(row, today)),
          );
          if (todayUsers.some((u) => !u.avatarUrl)) {
            try {
              const authRes = await getAllUsers(token, { approvedOnly: true });
              todayUsers = enrichTimesheetUserAvatars(todayUsers, normalizeApprovedUsersList(authRes));
            } catch {
              /* use attendance profile_image only */
            }
          }
          setTimesheetUsers(todayUsers);
          setTimesheetLogs([]);
        }

        if (user?.role === 'Employee' || user?.role === 'Team Leader') {
          const history = await getClockHistory(token);
          setTimesheetLogs(history.map((row) => mapClockHistoryToLog(row)));
        } else if (timesheetWindow === 'today' && user?.role === 'Team Leader') {
          const rows = await getClockRecords(token, { from: rangeFrom, to: rangeTo });
          setTimesheetLogs(rows.map((row) => mapRecordRowToTimesheetLog(row, 'clock')));
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load attendance data';
      setAttendanceError(msg);
    } finally {
      setAttendanceLoading(false);
    }
  }, [
    token,
    slug,
    timesheetWindow,
    timesheetRoleFilter,
    timesheetSearch,
    recordSearch,
    timesheetDays,
    recordFromDate,
    recordToDate,
    recordProviderFilter,
    recordDepartmentFilter,
    recordStatusFilter,
    availabilityRoleFilter,
    user?.role,
  ]);

  useFocusEffect(
    useCallback(() => {
      if (!ATTENDANCE_ROUTE_SLUGS.has(slug) || !token) return undefined;
      void loadAttendanceScreen();
      const timer = setInterval(() => {
        void loadAttendanceScreen();
      }, DATA_POLL_INTERVAL_MS);
      return () => clearInterval(timer);
    }, [slug, token, loadAttendanceScreen]),
  );

  useEffect(() => {
    if (!ATTENDANCE_ROUTE_SLUGS.has(slug) || !token) return;
    void loadAttendanceScreen();
  }, [
    slug,
    token,
    timesheetWindow,
    timesheetRoleFilter,
    recordFromDate,
    recordToDate,
    recordProviderFilter,
    recordDepartmentFilter,
    recordStatusFilter,
    recordSearch,
    availabilityRoleFilter,
    loadAttendanceScreen,
  ]);

  const filteredTimesheetUsers = useMemo(() => {
    const q = timesheetSearch.trim().toLowerCase();
    return filterAttendanceOverviewUsers(timesheetUsers).filter((u) => {
      if (timesheetRoleFilter !== 'all' && u.role !== timesheetRoleFilter) return false;
      if (!q) return true;
      return `${u.name} ${u.gdcId} ${u.team} ${u.role}`.toLowerCase().includes(q);
    });
  }, [timesheetRoleFilter, timesheetSearch, timesheetUsers]);

  const attendanceRows = useMemo(() => {
    if (timesheetWindow === '30d') {
      return filteredTimesheetUsers.map((u) => ({
        ...u,
        cells: [],
        counts: u.counts || { present: 0, late: 0, absent: 0 },
      }));
    }
    return buildAttendanceRows(filteredTimesheetUsers, timesheetDays, timesheetLogs);
  }, [filteredTimesheetUsers, timesheetDays, timesheetLogs, timesheetWindow]);

  const recordRouteTab = slug === 'clock-records' ? 'clock' : slug === 'manual-records' ? 'manual' : 'clock';
  const providerOptions = ['all', 'Employee', 'HR', 'Team Leader'];
  const providerFilterOptions = user?.role === 'HR' ? ['all', 'Employee', 'Team Leader'] : providerOptions;

  const recordDepartmentOptions = useMemo(() => {
    const depts = new Set();
    timesheetUsers.forEach((u) => {
      const t = String(u.team || '').trim();
      if (t && t !== '—') depts.add(t);
    });
    timesheetLogs.forEach((l) => {
      const t = String(l.department || l.team || '').trim();
      if (t && t !== '—') depts.add(t);
    });
    return ['all', ...Array.from(depts).sort((a, b) => a.localeCompare(b))];
  }, [timesheetLogs, timesheetUsers]);

  const recordExportQuery = useMemo(() => {
    const recordRole =
      recordProviderFilter !== 'all' ? apiRoleFromDisplayFilter(recordProviderFilter) : undefined;
    const q = recordSearch.trim();
    return {
      ...(recordFromDate ? { from: recordFromDate } : {}),
      ...(recordToDate ? { to: recordToDate } : {}),
      ...(recordRole && recordRole !== 'ALL' ? { role: recordRole } : {}),
      ...(q ? { gdc_id: q } : {}),
      ...(recordDepartmentFilter !== 'all' ? { department: recordDepartmentFilter } : {}),
      ...(slug === 'manual-records' && recordStatusFilter !== 'all'
        ? { status: recordStatusFilter }
        : {}),
    };
  }, [
    recordDepartmentFilter,
    recordFromDate,
    recordProviderFilter,
    recordSearch,
    recordStatusFilter,
    recordToDate,
    slug,
  ]);

  const filteredRecords = useMemo(() => {
    const usersById = new Map(timesheetUsers.map((u) => [u.gdcId, u]));
    return timesheetLogs
      .filter((rec) => {
        if (recordRouteTab !== rec.source) return false;
        const u = usersById.get(rec.gdcId);
        if (!u) return false;
        if (recordProviderFilter !== 'all' && u.role !== recordProviderFilter) return false;
        const dept = String(u.team || rec.department || '').trim();
        if (recordDepartmentFilter !== 'all' && dept !== recordDepartmentFilter) return false;
        if (recordFromDate && rec.date < recordFromDate) return false;
        if (recordToDate && rec.date > recordToDate) return false;
        const q = recordSearch.trim().toLowerCase();
        if (!q) return true;
        return `${u.name} ${u.gdcId} ${dept} ${rec.id}`.toLowerCase().includes(q);
      })
      .map((rec) => ({ ...rec, user: usersById.get(rec.gdcId) }));
  }, [
    recordDepartmentFilter,
    recordFromDate,
    recordProviderFilter,
    recordRouteTab,
    recordSearch,
    recordToDate,
    timesheetLogs,
    timesheetUsers,
  ]);
  const employeeProfile = useMemo(() => {
    if (user?.role !== 'Employee') return null;
    const authAvatar = resolveProfileImageUri(user?.avatar);
    const gid = user?.gdc_id ? String(user.gdc_id) : '';
    if (gid) {
      const match = timesheetUsers.find((u) => u.gdcId === gid);
      if (match) return { ...match, avatarUrl: match.avatarUrl || authAvatar };
    }
    const fallback =
      timesheetUsers.find((u) => u.role === 'Employee' && u.name === user.name) ||
      timesheetUsers.find((u) => u.role === 'Employee') || {
        gdcId: gid || 'me',
        name: user?.name || 'Employee',
        role: 'Employee',
        team: user?.team_name || '—',
        avatarUrl: authAvatar,
      };
    return fallback.avatarUrl ? fallback : { ...fallback, avatarUrl: authAvatar };
  }, [timesheetUsers, user?.avatar, user?.gdc_id, user?.name, user?.role, user?.team_name]);
  const employeeAttendanceLogs = useMemo(() => {
    if (!employeeProfile) return [];
    return timesheetLogs
      .filter((log) => log.gdcId === employeeProfile.gdcId && timesheetDays.includes(log.date))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [employeeProfile, timesheetDays, timesheetLogs]);
  const employeeAttendanceSummary = useMemo(() => {
    const totalHours = employeeAttendanceLogs.reduce((sum, row) => sum + row.hours, 0);
    const overtime = employeeAttendanceLogs.reduce((sum, row) => sum + Math.max(0, row.hours - 8), 0);
    const lateMarks = employeeAttendanceLogs.filter((row) => row.status === 'L').length;
    return { totalHours, overtime, lateMarks };
  }, [employeeAttendanceLogs]);
  const employeeAttendanceEntry = useMemo(() => {
    if (!employeeProfile) return null;
    const rows = buildAttendanceRows([employeeProfile], timesheetDays, timesheetLogs);
    return rows[0] || null;
  }, [employeeProfile, timesheetDays, timesheetLogs]);
  const tlProfile = useMemo(() => {
    if (user?.role !== 'Team Leader') return null;
    const authAvatar = resolveProfileImageUri(user?.avatar);
    const gid = user?.gdc_id ? String(user.gdc_id) : '';
    if (gid) {
      const match = timesheetUsers.find((u) => u.gdcId === gid);
      if (match) return { ...match, avatarUrl: match.avatarUrl || authAvatar };
    }
    const fallback =
      timesheetUsers.find((u) => u.role === 'Team Leader' && u.name === user.name) ||
      timesheetUsers.find((u) => u.role === 'Team Leader') || {
        gdcId: gid || 'me',
        name: user?.name || 'Team Leader',
        role: 'Team Leader',
        team: user?.team_name || '—',
        avatarUrl: authAvatar,
      };
    return fallback.avatarUrl ? fallback : { ...fallback, avatarUrl: authAvatar };
  }, [timesheetUsers, user?.avatar, user?.gdc_id, user?.name, user?.role, user?.team_name]);
  const tlTeamMembers = useMemo(() => {
    if (!tlProfile) return [];
    return timesheetUsers.filter((u) => u.team === tlProfile.team && u.role !== 'Team Leader');
  }, [tlProfile, timesheetUsers]);
  const tlTeamMemberIds = useMemo(() => new Set(tlTeamMembers.map((m) => m.gdcId)), [tlTeamMembers]);
  const tlMyAttendanceLogs = useMemo(() => {
    if (!tlProfile) return [];
    return timesheetLogs
      .filter((log) => log.gdcId === tlProfile.gdcId && timesheetDays.includes(log.date))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [timesheetDays, tlProfile, timesheetLogs]);
  const tlMyAttendanceSummary = useMemo(() => {
    const totalHours = tlMyAttendanceLogs.reduce((sum, row) => sum + row.hours, 0);
    const overtime = tlMyAttendanceLogs.reduce((sum, row) => sum + Math.max(0, row.hours - 8), 0);
    const lateMarks = tlMyAttendanceLogs.filter((row) => row.status === 'L').length;
    return { totalHours, overtime, lateMarks };
  }, [tlMyAttendanceLogs]);
  const tlMyAttendanceEntry = useMemo(() => {
    if (!tlProfile) return null;
    const rows = buildAttendanceRows([tlProfile], timesheetDays, timesheetLogs);
    return rows[0] || null;
  }, [timesheetDays, tlProfile, timesheetLogs]);
  const tlTeamOverviewRows = useMemo(() => {
    const q = tlTeamSearch.trim().toLowerCase();
    return attendanceRows
      .filter((row) => tlTeamMemberIds.has(row.gdcId))
      .filter((row) => (!q ? true : `${row.name} ${row.gdcId}`.toLowerCase().includes(q)));
  }, [attendanceRows, tlTeamMemberIds, tlTeamSearch]);
  const tlTeamRecordRows = useMemo(() => {
    const q = tlRecordSearch.trim().toLowerCase();
    const usersById = new Map(timesheetUsers.map((u) => [u.gdcId, u]));
    return timesheetLogs
      .filter((log) => tlTeamMemberIds.has(log.gdcId) && timesheetDays.includes(log.date))
      .filter((log) => {
        if (!q) return true;
        const u = usersById.get(log.gdcId);
        return `${u?.name ?? ''} ${u?.gdcId ?? ''} ${u?.team ?? ''}`.toLowerCase().includes(q);
      })
      .map((log) => ({ ...log, user: usersById.get(log.gdcId) }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [timesheetDays, tlRecordSearch, tlTeamMemberIds, timesheetLogs, timesheetUsers]);

  const filteredAvailabilityUsers = useMemo(() => {
    const q = availabilitySearch.trim().toLowerCase();
    return availabilityUsers.filter((u) => {
      if (availabilityRoleFilter !== 'all' && u.role !== availabilityRoleFilter) return false;
      if (availabilityStatusFilter !== 'all' && u.status !== availabilityStatusFilter) return false;
      if (availabilityQuickFilter === 'present' && u.status !== 'Available') return false;
      if (availabilityQuickFilter === 'absent' && u.status !== 'Unavailable') return false;
      if (availabilityQuickFilter === 'leave' && u.status !== 'Leave') return false;
      if (!q) return true;
      return `${u.name} ${u.gdcId} ${u.team} ${u.role} ${u.status}`.toLowerCase().includes(q);
    });
  }, [
    availabilityQuickFilter,
    availabilityRoleFilter,
    availabilitySearch,
    availabilityStatusFilter,
    availabilityUsers,
  ]);

  const availabilitySummary = useMemo(() => {
    const present = filteredAvailabilityUsers.filter((u) => u.status === 'Available').length;
    const absent = filteredAvailabilityUsers.filter((u) => u.status === 'Unavailable').length;
    const leave = filteredAvailabilityUsers.filter((u) => u.status === 'Leave').length;
    return { total: filteredAvailabilityUsers.length, present, absent, leave };
  }, [filteredAvailabilityUsers]);

  const filteredMyAvailabilityLog = useMemo(
    () => myAvailabilityLog.filter((r) => r.date >= availabilityFromDate && r.date <= availabilityToDate),
    [availabilityFromDate, availabilityToDate, myAvailabilityLog],
  );

  const myLeaveRequests = useMemo(() => {
    if (!user) return [];
    if (user.role === 'Employee' || user.role === 'Team Leader') return leaveRequests;
    return leaveRequests.filter((r) => r.employee === user.name);
  }, [leaveRequests, user]);

  const filteredAdminLeaveRequests = useMemo(() => {
    const q = requestAdminSearch.trim().toLowerCase();
    let list = leaveStatusFilter === 'All' ? leaveRequests : leaveRequests.filter((r) => r.status === leaveStatusFilter);
    if (!q) return list;
    return list.filter((r) =>
      `${r.employee} ${r.role} ${r.team} ${r.type} ${r.reason} ${r.gdcId}`.toLowerCase().includes(q),
    );
  }, [leaveRequests, leaveStatusFilter, requestAdminSearch]);

  const filteredAdminManualRequests = useMemo(() => {
    const q = requestAdminSearch.trim().toLowerCase();
    let list = manualStatusFilter === 'All' ? manualRequests : manualRequests.filter((r) => r.status === manualStatusFilter);
    if (!q) return list;
    return list.filter((r) =>
      `${r.employee} ${r.role} ${r.team} ${r.reason} ${r.gdcId} ${r.date}`.toLowerCase().includes(q),
    );
  }, [manualRequests, manualStatusFilter, requestAdminSearch]);

  const filteredMyLeaveRequests = useMemo(() => {
    if (leaveStatusFilter === 'All') return myLeaveRequests;
    return myLeaveRequests.filter((r) => r.status === leaveStatusFilter);
  }, [leaveStatusFilter, myLeaveRequests]);

  const myManualRequests = useMemo(() => {
    if (!user) return [];
    if (user.role === 'Employee' || user.role === 'Team Leader') return manualRequests;
    return manualRequests.filter((r) => r.employee === user.name);
  }, [manualRequests, user]);

  const filteredMyManualRequests = useMemo(() => {
    if (manualStatusFilter === 'All') return myManualRequests;
    return myManualRequests.filter((r) => r.status === manualStatusFilter);
  }, [manualStatusFilter, myManualRequests]);

  const filteredAdminUsers = useMemo(() => {
    const q = adminUserSearch.trim().toLowerCase();
    return adminUsers.filter((member) => {
      if (adminRoleFilter === 'Pending' && member.accountStatus !== 'Pending') return false;
      if (adminRoleFilter !== 'All' && adminRoleFilter !== 'Pending' && member.role !== adminRoleFilter) return false;
      if (!q) return true;
      return `${member.name} ${member.gdcId} ${member.email} ${member.team} ${member.role}`.toLowerCase().includes(q);
    });
  }, [adminRoleFilter, adminUserSearch, adminUsers]);

  const submitLeaveRequest = async () => {
    if (!token || !leaveFromDate || !leaveToDate) return;
    try {
      await createLeaveRequestApi(token, {
        leave_type: apiLeaveTypeFromUi(leaveType),
        start_date: leaveFromDate,
        end_date: leaveToDate,
        reason: leaveReason || undefined,
      });
      await loadAttendanceScreen();
      setLeaveModalOpen(false);
      setLeaveType('Leave');
      setLeaveFromDate('');
      setLeaveToDate('');
      setLeaveReason('');
      setLeaveTypeDropdownOpen(false);
      Alert.alert('Submitted', 'Leave request sent for approval.');
    } catch (err) {
      Alert.alert('Leave request failed', err instanceof Error ? err.message : 'Could not submit leave');
    }
  };

  const submitManualRequest = async () => {
    if (!token || !manualDate || !manualClockIn || !manualClockOut) return;
    try {
      await createManualTimeRequestApi(token, {
        date: manualDate,
        check_in: apiTimeFromAmPm(manualClockIn),
        check_out: apiTimeFromAmPm(manualClockOut),
        break_out: manualBreakOut ? apiTimeFromAmPm(manualBreakOut) : undefined,
        reason: manualReason || undefined,
      });
      await loadAttendanceScreen();
      setManualModalOpen(false);
      setManualDate('');
      setManualClockIn('');
      setManualClockOut('');
      setManualBreakOut('');
      setManualReason('');
      Alert.alert('Submitted', 'Manual time request sent for approval.');
    } catch (err) {
      Alert.alert('Manual request failed', err instanceof Error ? err.message : 'Could not submit request');
    }
  };

  const updateLeaveStatus = async (id, status, adminReason = '') => {
    if (!token) return;
    try {
      if (status === 'Approved') {
        await approveLeaveRequestApi(token, id);
      } else if (status === 'Rejected') {
        await rejectLeaveRequestApi(token, id, { rejection_reason: adminReason || 'Rejected' });
      }
      await loadAttendanceScreen();
    } catch (err) {
      Alert.alert('Leave update failed', err instanceof Error ? err.message : 'Could not update leave');
    }
  };

  const updateManualStatus = async (id, status, adminReason = '') => {
    if (!token) return;
    try {
      if (status === 'Approved') {
        await approveManualTimeRequestApi(token, id);
      } else if (status === 'Rejected') {
        await rejectManualTimeRequestApi(token, id, { rejection_reason: adminReason || 'Rejected' });
      }
      await loadAttendanceScreen();
    } catch (err) {
      Alert.alert('Manual update failed', err instanceof Error ? err.message : 'Could not update request');
    }
  };

  const openRejectModal = (id, type = 'leave') => {
    setRejectTargetId(id);
    setRejectTargetType(type);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const submitRejectRequest = () => {
    const reason = rejectReason.trim();
    if (!rejectTargetId || !reason) return;
    if (rejectTargetType === 'manual') {
      void updateManualStatus(rejectTargetId, 'Rejected', reason);
    } else {
      void updateLeaveStatus(rejectTargetId, 'Rejected', reason);
    }
    setRejectModalOpen(false);
    setRejectTargetId(null);
    setRejectTargetType('leave');
    setRejectReason('');
  };

  const handleSaveShiftTiming = async () => {
    if (!token || !shiftDate || !shiftStart || !shiftEnd || shiftSaveLoading) return;
    setShiftSaveLoading(true);
    try {
      await saveShiftTiming(token, {
        shift_start: apiTimeFromAmPm(shiftStart),
        shift_end: apiTimeFromAmPm(shiftEnd),
        effective_date: shiftDate,
      });
      Alert.alert('Saved', 'Shift timing updated.');
    } catch (err) {
      Alert.alert('Shift save failed', err instanceof Error ? err.message : 'Could not save shift');
    } finally {
      setShiftSaveLoading(false);
    }
  };

  const openAvailabilityDatePicker = (target) => {
    const currentRaw = target === 'from' ? availabilityFromDate : availabilityToDate;
    const parsed = currentRaw ? new Date(`${currentRaw}T00:00:00`) : new Date();
    const safeDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
    DateTimePickerAndroid.open({
      value: safeDate,
      onChange: (_event, selected) => {
        if (!selected) return;
        const next = formatDateISO(selected);
        if (target === 'from') setAvailabilityFromDate(next);
        else setAvailabilityToDate(next);
      },
      mode: 'date',
      is24Hour: false,
    });
  };

  const parseShiftDate = () => {
    if (!shiftDate) return new Date();
    const parsed = new Date(shiftDate);
    if (Number.isNaN(parsed.getTime())) return new Date();
    return parsed;
  };

  const formatDateISO = (date) => {
    const y = date.getFullYear();
    const m = `${date.getMonth() + 1}`.padStart(2, '0');
    const d = `${date.getDate()}`.padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const formatTimeAmPm = (date) => {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`;
  };

  const openShiftDatePicker = () => {
    DateTimePickerAndroid.open({
      value: parseShiftDate(),
      onChange: (_event, selected) => {
        if (selected) setShiftDate(formatDateISO(selected));
      },
      mode: 'date',
      is24Hour: false,
    });
  };

  const openShiftTimePicker = (target) => {
    DateTimePickerAndroid.open({
      value: new Date(),
      onChange: (_event, selected) => {
        if (!selected) return;
        const formatted = formatTimeAmPm(selected);
        if (target === 'start') setShiftStart(formatted);
        else setShiftEnd(formatted);
      },
      mode: 'time',
      is24Hour: false,
    });
  };

  const openLeaveDatePicker = (target) => {
    const currentRaw = target === 'from' ? leaveFromDate : leaveToDate;
    const parsed = currentRaw ? new Date(`${currentRaw}T00:00:00`) : new Date();
    const safeDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
    DateTimePickerAndroid.open({
      value: safeDate,
      onChange: (_event, selected) => {
        if (!selected) return;
        const next = formatDateISO(selected);
        if (target === 'from') setLeaveFromDate(next);
        else setLeaveToDate(next);
      },
      mode: 'date',
      is24Hour: false,
    });
  };

  const openManualDatePicker = () => {
    const parsed = manualDate ? new Date(`${manualDate}T00:00:00`) : new Date();
    const safeDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
    DateTimePickerAndroid.open({
      value: safeDate,
      onChange: (_event, selected) => {
        if (!selected) return;
        setManualDate(formatDateISO(selected));
      },
      mode: 'date',
      is24Hour: false,
    });
  };

  const openManualTimePicker = (target) => {
    DateTimePickerAndroid.open({
      value: new Date(),
      onChange: (_event, selected) => {
        if (!selected) return;
        const formatted = formatTimeAmPm(selected);
        if (target === 'in') setManualClockIn(formatted);
        else if (target === 'out') setManualClockOut(formatted);
        else setManualBreakOut(formatted);
      },
      mode: 'time',
      is24Hour: false,
    });
  };

  const selectedAdminUser = useMemo(
    () =>
      adminUsers.find((member) => member.id != null && Number(member.id) === Number(selectedAdminUserId)) ?? null,
    [adminUsers, selectedAdminUserId],
  );

  const openRoleModal = (member) => {
    if (member == null || member.id == null || !Number.isFinite(Number(member.id))) return;
    setSelectedAdminUserId(Number(member.id));
    setRoleModalOpen(true);
  };

  const applyAdminRole = async (nextRoleDisplay) => {
    if (adminRoleSavingTarget) return;
    const member = adminUsers.find((m) => m.id != null && Number(m.id) === Number(selectedAdminUserId));
    if (!member || !token) return;
    const numericId = Number(member.id);
    if (user?.id != null && Number(user.id) === numericId) {
      Alert.alert('Not allowed', 'You cannot change your own role.');
      return;
    }
    if (!isRolePromotionAllowed(member.role, nextRoleDisplay)) {
      Alert.alert(
        'Not allowed',
        'Roles can only move up the ladder (Employee → Team Leader → HR). Demoting HR or Team Leader is not allowed.',
      );
      return;
    }
    const apiRole = apiRoleFromDisplay(nextRoleDisplay);
    setAdminRoleSavingTarget(nextRoleDisplay);
    try {
      if (member.accountStatus === 'Pending') {
        await approveUser(token, { userId: numericId, role: apiRole });
      } else {
        await updateUserRole(token, numericId, { role: apiRole });
      }
      setRoleModalOpen(false);
      setSelectedAdminUserId(null);
      await fetchAdminDirectory();
    } catch (e) {
      Alert.alert('Role update failed', e?.message ?? 'Could not update role');
    } finally {
      setAdminRoleSavingTarget(null);
    }
  };

  /** Pending signups — POST /api/admin/reject-user (deletes the row). */
  const rejectAdminUser = (member) => {
    if (!token || member.accountStatus !== 'Pending' || member.id == null) return;
    if (user?.id != null && Number(user.id) === Number(member.id)) {
      Alert.alert('Not allowed', 'You cannot reject your own account.');
      return;
    }
    Alert.alert('Reject user', `Remove ${member.name} from pending registrations?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const key = `reject-${String(member.id)}`;
            setAdminDirectoryActionKey(key);
            try {
              await rejectUser(token, { userId: Number(member.id) });
              await fetchAdminDirectory();
            } catch (e) {
              const detail = e?.name === 'ApiError' && e?.status ? `${e.message} (HTTP ${e.status})` : e?.message;
              Alert.alert('Reject failed', detail ?? 'Could not reject user');
            } finally {
              setAdminDirectoryActionKey((cur) => (cur === key ? null : cur));
            }
          })();
        },
      },
    ]);
  };

  /**
   * Trash on approved rows — POST /api/admin/reject-user `{ userId }`.
   * Web: `window.confirm` + `window.alert` (RN Alert confirm is unreliable on some browsers).
   */
  const deleteApprovedDirectoryUser = (member) => {
    if (!token) {
      if (Platform.OS === 'web' && typeof globalThis.alert === 'function') {
        globalThis.alert('You are not signed in.');
      } else {
        Alert.alert('Delete', 'You are not signed in.');
      }
      return;
    }
    if (member?.id == null || !Number.isFinite(Number(member.id))) {
      const msg = 'Missing user id — refresh the directory.';
      if (Platform.OS === 'web' && typeof globalThis.alert === 'function') {
        globalThis.alert(msg);
      } else {
        Alert.alert('Delete', msg);
      }
      return;
    }
    if (member.accountStatus === 'Pending') {
      rejectAdminUser(member);
      return;
    }
    if (user?.id != null && Number(user.id) === Number(member.id)) {
      const msg = 'You cannot delete your own account.';
      if (Platform.OS === 'web' && typeof globalThis.alert === 'function') {
        globalThis.alert(msg);
      } else {
        Alert.alert('Not allowed', msg);
      }
      return;
    }

    const runDelete = () => {
      void (async () => {
        const key = `delete-${String(member.id)}`;
        setAdminDirectoryActionKey(key);
        try {
          await rejectUser(token, { userId: Number(member.id) });
          await fetchAdminDirectory();
        } catch (e) {
          const detail = e?.name === 'ApiError' && e?.status ? `${e.message} (HTTP ${e.status})` : e?.message;
          const line = detail ?? 'Could not delete user';
          if (Platform.OS === 'web' && typeof globalThis.alert === 'function') {
            globalThis.alert(`Delete failed\n\n${line}`);
          } else {
            Alert.alert('Delete failed', line);
          }
        } finally {
          setAdminDirectoryActionKey((cur) => (cur === key ? null : cur));
        }
      })();
    };

    const msg = `Permanently delete ${member.name}? They will not be able to sign in.`;
    if (Platform.OS === 'web' && typeof globalThis.confirm === 'function') {
      if (globalThis.confirm(msg)) runDelete();
      return;
    }

    Alert.alert('Delete user', msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: runDelete },
    ]);
  };

  const handleAddDepartment = async () => {
    const name = newDepartment.trim();
    if (!name || !token || deptAddLoading) return;
    setDeptAddLoading(true);
    try {
      await createDepartment(token, name);
      setNewDepartment('');
      await fetchDepartments();
    } catch (e) {
      Alert.alert('Add department', e?.message ?? 'Could not add department');
    } finally {
      setDeptAddLoading(false);
    }
  };

  const handleRemoveDepartment = (deptName) => {
    if (!token) return;
    Alert.alert('Remove department', `Remove “${deptName}”?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await deleteDepartment(token, deptName);
              await fetchDepartments();
            } catch (e) {
              Alert.alert('Remove failed', e?.message ?? 'Could not remove department');
            }
          })();
        },
      },
    ]);
  };

  const resetProjectForm = () => {
    setTaskTitle('');
    setTaskDescription('');
    setTaskAssignee('');
    setTaskAssigneeUserId(null);
    setTaskPriority('Medium');
    setTaskStatus('Pending');
    setTaskDeadline('');
    setTaskAttachmentName('');
    setTaskAttachmentUri('');
    setForwardTlName('');
    setForwardTlId(null);
    setEditingTaskId(null);
    setSaveProjectTaskPhase('idle');
  };

  const closeProjectTaskModal = () => {
    setCreateTaskOpen(false);
    resetProjectForm();
  };

  const openCreateProjectTaskModal = () => {
    resetProjectForm();
    setCreateTaskOpen(true);
  };

  const handlePickTaskAttachment = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.length) return;
    const selected = result.assets[0];
    setTaskAttachmentName(selected.name || 'selected-file');
    setTaskAttachmentUri(selected.uri || '');
  };

  const handleCreateProjectTask = async () => {
    if (!token) return;
    const title = taskTitle.trim();
    const deadline = taskDeadline.trim();
    if (!title || !deadline) {
      Alert.alert('Validation', 'Title and deadline are required.');
      return;
    }

    const resolveHrAssigneeId = () => {
      if (taskAssigneeUserId != null && Number.isFinite(Number(taskAssigneeUserId))) return Number(taskAssigneeUserId);
      const trimmed = taskAssignee.trim().toLowerCase();
      const row = hrAssignableUsers.find((u) => String(u.name || '').trim().toLowerCase() === trimmed);
      return row && row.id != null ? Number(row.id) : null;
    };

    if (editingTaskId) {
      const existing = projectTasks.find((t) => t.id === editingTaskId);
      const apiId = existing?.apiNumericId;
      if (!Number.isFinite(apiId)) {
        Alert.alert('Tasks', 'Cannot update this task (missing server id).');
        return;
      }
      setSaveProjectTaskPhase('saving');
      try {
        const patch = {
          title,
          deadline,
          description: taskDescription.trim() || '',
        };
        if (isAdminRole(user?.role)) {
          const hid = resolveHrAssigneeId();
          if (hid) patch.assigned_to = hid;
        }
        if (taskAttachmentUri) {
          patch.attachmentUri = taskAttachmentUri;
          patch.attachmentName = taskAttachmentName;
        }
        await updateTaskApi(token, apiId, patch);
        await loadProjectTasks();
        setSaveProjectTaskPhase('success');
        await new Promise((r) => setTimeout(r, 480));
        closeProjectTaskModal();
      } catch (e) {
        Alert.alert('Tasks', e?.message ?? 'Update failed');
      } finally {
        setSaveProjectTaskPhase('idle');
      }
      return;
    }

    if (!isAdminRole(user?.role)) {
      Alert.alert('Tasks', 'Only administrators can create tasks here.');
      return;
    }
    const assignedTo = resolveHrAssigneeId();
    if (!Number.isFinite(assignedTo)) {
      Alert.alert('Assign HR', 'Choose an HR user from the Assign to HR dropdown.');
      return;
    }
    setSaveProjectTaskPhase('saving');
    try {
      await createTaskApi(token, {
        title,
        assigned_to: assignedTo,
        deadline,
        description: taskDescription.trim() || undefined,
        attachmentUri: taskAttachmentUri || undefined,
        attachmentName: taskAttachmentName || undefined,
      });
      await loadProjectTasks();
      setSaveProjectTaskPhase('success');
      await new Promise((r) => setTimeout(r, 480));
      setProjectStatusFilter('pending');
      closeProjectTaskModal();
    } catch (e) {
      Alert.alert('Tasks', e?.message ?? 'Could not create task');
    } finally {
      setSaveProjectTaskPhase('idle');
    }
  };

  const handleEditProjectTask = (task) => {
    setEditingTaskId(task.id);
    setTaskTitle(task.title);
    setTaskDescription(task.description);
    setTaskAssignee(task.assignedToName || task.assignee || '');
    setTaskAssigneeUserId(task.assignedToUserId ?? null);
    setTaskPriority(task.priority || 'Medium');
    setTaskStatus(task.status || 'Pending');
    setTaskDeadline(task.deadline);
    setTaskAttachmentName(task.attachmentName || '');
    setTaskAttachmentUri('');
    setCreateTaskOpen(true);
  };

  const handleDeleteProjectTask = (taskId) => {
    if (!token) return;
    const task = projectTasks.find((t) => t.id === taskId);
    const apiId = task?.apiNumericId;
    if (!Number.isFinite(apiId)) {
      Alert.alert('Tasks', 'Cannot delete this task.');
      return;
    }
    Alert.alert('Delete task', 'Remove this task permanently?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await deleteTaskApi(token, apiId);
              await loadProjectTasks();
              setSelectedProjectTask(null);
            } catch (e) {
              Alert.alert('Tasks', e?.message ?? 'Delete failed');
            }
          })();
        },
      },
    ]);
  };

  const handleForwardProjectToTl = async () => {
    if (!token || !selectedProjectTask || !forwardTlId || !canForwardProjectTask) return;
    const apiId = selectedProjectTask.apiNumericId;
    if (!Number.isFinite(apiId)) return;
    try {
      await forwardTaskToTeamLeader(token, apiId, forwardTlId);
      await loadProjectTasks();
      setForwardTlName('');
      setForwardTlId(null);
      setForwardTlDropdownOpen(false);
      setSelectedProjectTask(null);
    } catch (e) {
      Alert.alert('Forward task', e?.message ?? 'Could not forward');
    }
  };

  const handleStartProjectTask = async () => {
    if (!token || !selectedProjectTask || !canStartProjectTask) return;
    const apiId = selectedProjectTask.apiNumericId;
    if (!Number.isFinite(apiId)) return;
    try {
      setTaskWorkflowBusy(true);
      const res = await startTaskWork(token, apiId);
      await loadProjectTasks();
      const raw = res && typeof res === 'object' && 'data' in res ? /** @type {{ data?: unknown }} */ (res).data : null;
      if (raw && typeof raw === 'object') {
        setSelectedProjectTask(mapTaskRowToProjectTask(/** @type {Record<string, unknown>} */ (raw)));
        setTaskSubmitNote('');
      } else {
        setSelectedProjectTask(null);
      }
    } catch (e) {
      Alert.alert('Start work', e?.message ?? 'Could not start task');
    } finally {
      setTaskWorkflowBusy(false);
    }
  };

  const handleSubmitProjectTask = async () => {
    if (!token || !selectedProjectTask || !canSubmitProjectTask) return;
    const apiId = selectedProjectTask.apiNumericId;
    if (!Number.isFinite(apiId)) return;
    const note = taskSubmitNote.trim();
    if (!note) {
      Alert.alert('Submit task', 'Please enter a submission note.');
      return;
    }
    try {
      setTaskWorkflowBusy(true);
      await submitTaskApi(token, apiId, note);
      await loadProjectTasks();
      setSelectedProjectTask(null);
    } catch (e) {
      Alert.alert('Submit task', e?.message ?? 'Submit failed');
    } finally {
      setTaskWorkflowBusy(false);
    }
  };

  const handleSendToReviewProjectTask = async () => {
    if (!token || !selectedProjectTask || !canSendToReviewProjectTask) return;
    const apiId = selectedProjectTask.apiNumericId;
    if (!Number.isFinite(apiId)) return;
    try {
      setTaskWorkflowBusy(true);
      await sendTaskToReview(token, apiId);
      await loadProjectTasks();
      setSelectedProjectTask(null);
    } catch (e) {
      Alert.alert('Send to review', e?.message ?? 'Request failed');
    } finally {
      setTaskWorkflowBusy(false);
    }
  };

  const handleApproveProjectTask = async () => {
    if (!token || !selectedProjectTask || !canApproveProjectTask) return;
    const apiId = selectedProjectTask.apiNumericId;
    if (!Number.isFinite(apiId)) return;
    try {
      setTaskWorkflowBusy(true);
      await approveTaskApi(token, apiId);
      await loadProjectTasks();
      setSelectedProjectTask(null);
    } catch (e) {
      Alert.alert('Approve task', e?.message ?? 'Approve failed');
    } finally {
      setTaskWorkflowBusy(false);
    }
  };

  const handleSaveEmployeeDailyUpdate = async () => {
    if (!token || user?.role !== 'Employee') return;
    setDailySaveBusy(true);
    try {
      await upsertMyEmployeeDailyUpdate(token, { date: reportingYmd, body: employeeUpdate });
      await loadDailyUpdatesScreen();
      Alert.alert('Saved', 'Your daily update was saved.');
    } catch (e) {
      Alert.alert('Daily update', e?.message ?? 'Save failed');
    } finally {
      setDailySaveBusy(false);
    }
  };

  const handleSaveTlDailySummary = async () => {
    if (!token || user?.role !== 'Team Leader') return;
    setDailySaveBusy(true);
    try {
      await upsertTeamLeaderDailySummary(token, { date: reportingYmd, body: leaderSummary });
      await loadDailyUpdatesScreen();
      Alert.alert('Saved', 'Team summary saved.');
    } catch (e) {
      Alert.alert('Team summary', e?.message ?? 'Save failed');
    } finally {
      setDailySaveBusy(false);
    }
  };

  const handleSaveHrDailySummary = async () => {
    if (!token || user?.role !== 'HR') return;
    setDailySaveBusy(true);
    try {
      await upsertHrDailySummary(token, { date: reportingYmd, body: hrNote });
      await loadDailyUpdatesScreen();
      Alert.alert('Saved', 'HR note saved.');
    } catch (e) {
      Alert.alert('HR note', e?.message ?? 'Save failed');
    } finally {
      setDailySaveBusy(false);
    }
  };
  const myAvailabilitySummary = useMemo(() => {
    let present = 0;
    let absent = 0;
    let totalHours = 0;
    filteredMyAvailabilityLog.forEach((row) => {
      if (row.status === 'Present') present += 1;
      else if (row.status === 'Absent') absent += 1;
      if (typeof row.hours === 'number') totalHours += row.hours;
    });
    const leave = filteredMyAvailabilityLog.filter((row) => row.status === 'Leave').length;
    return { present, absent, leave, totalHours };
  }, [filteredMyAvailabilityLog]);
  const currentAvailabilityStatus = useMemo(() => {
    if (!user?.role) return 'Available';
    const match =
      availabilityUsers.find((u) => u.name === user?.name && u.role === user.role) ||
      availabilityUsers.find((u) => u.role === user.role);
    return match?.status || 'Available';
  }, [availabilityUsers, user?.name, user?.role]);
  const updateMyAvailabilityStatus = (nextStatus) => {
    if (!user?.role) return;
    setAvailabilityUsers((prev) => {
      const exactIdx = prev.findIndex((entry) => entry.name === user?.name && entry.role === user.role);
      if (exactIdx >= 0) {
        return prev.map((entry, index) => (index === exactIdx ? { ...entry, status: nextStatus } : entry));
      }
      const roleIdx = prev.findIndex((entry) => entry.role === user.role);
      if (roleIdx >= 0) {
        return prev.map((entry, index) => (index === roleIdx ? { ...entry, status: nextStatus } : entry));
      }
      return prev;
    });
  };

  if (slug === 'daily-updates') {
    return (
      <DailyUpdatesSection
        styles={styles}
        dateMode={dateMode}
        setDateMode={setDateMode}
        user={user}
        reportingYmd={reportingYmd}
        dailyScreenLoading={dailyScreenLoading}
        dailyScreenError={dailyScreenError}
        dailySaveBusy={dailySaveBusy}
        employeeUpdate={employeeUpdate}
        setEmployeeUpdate={setEmployeeUpdate}
        leaderSummary={leaderSummary}
        setLeaderSummary={setLeaderSummary}
        hrNote={hrNote}
        setHrNote={setHrNote}
        memberSearch={memberSearch}
        setMemberSearch={setMemberSearch}
        memberStatusFilter={memberStatusFilter}
        setMemberStatusFilter={setMemberStatusFilter}
        filteredTlMembers={filteredTlMembers}
        summarySearch={summarySearch}
        setSummarySearch={setSummarySearch}
        filteredTlRows={filteredTlRows}
        onSaveEmployeeUpdate={handleSaveEmployeeDailyUpdate}
        onSaveTlTeamSummary={handleSaveTlDailySummary}
        onSaveHrNote={handleSaveHrDailySummary}
      />
    );
  }

  if (slug === 'project-manager') {
    return (
      <ProjectManagerSection
        styles={styles}
        user={user}
        isCompactMobile={isCompactMobile}
        projectSearch={projectSearch}
        setProjectSearch={setProjectSearch}
        projectStatusFilter={projectStatusFilter}
        setProjectStatusFilter={setProjectStatusFilter}
        projectStatusMenuOpen={projectStatusMenuOpen}
        setProjectStatusMenuOpen={setProjectStatusMenuOpen}
        projectFromDate={projectFromDate}
        setProjectFromDate={setProjectFromDate}
        projectToDate={projectToDate}
        setProjectToDate={setProjectToDate}
        openCreateProjectTaskModal={openCreateProjectTaskModal}
        closeProjectTaskModal={closeProjectTaskModal}
        projectTasksLoading={projectTasksLoading}
        filteredProjectTasks={filteredProjectTasks}
        setSelectedProjectTask={setSelectedProjectTask}
        handleEditProjectTask={handleEditProjectTask}
        handleDeleteProjectTask={handleDeleteProjectTask}
        projectStatusTone={projectStatusTone}
        employeeNameByGdcId={employeeNameByGdcId}
        formatProjectDueDate={formatProjectDueDate}
        createTaskOpen={createTaskOpen}
        editingTaskId={editingTaskId}
        taskTitle={taskTitle}
        setTaskTitle={setTaskTitle}
        taskAssignee={taskAssignee}
        setTaskAssignee={setTaskAssignee}
        taskAssigneeUserId={taskAssigneeUserId}
        setTaskAssigneeUserId={setTaskAssigneeUserId}
        hrAssignableUsers={hrAssignableUsers}
        taskDeadline={taskDeadline}
        setTaskDeadline={setTaskDeadline}
        taskDescription={taskDescription}
        setTaskDescription={setTaskDescription}
        handlePickTaskAttachment={handlePickTaskAttachment}
        taskAttachmentName={taskAttachmentName}
        handleCreateProjectTask={handleCreateProjectTask}
        selectedProjectTask={selectedProjectTask}
        canForwardProjectTask={canForwardProjectTask}
        forwardTlName={forwardTlName}
        setForwardTlName={setForwardTlName}
        forwardTlId={forwardTlId}
        setForwardTlId={setForwardTlId}
        forwardTlDropdownOpen={forwardTlDropdownOpen}
        setForwardTlDropdownOpen={setForwardTlDropdownOpen}
        forwardDropdownAnim={forwardDropdownAnim}
        tlForwardOptions={tlForwardPickList}
        handleForwardProjectToTl={handleForwardProjectToTl}
        canStartProjectTask={canStartProjectTask}
        handleStartProjectTask={handleStartProjectTask}
        taskSubmitNote={taskSubmitNote}
        setTaskSubmitNote={setTaskSubmitNote}
        canSubmitProjectTask={canSubmitProjectTask}
        handleSubmitProjectTask={handleSubmitProjectTask}
        canSendToReviewProjectTask={canSendToReviewProjectTask}
        handleSendToReviewProjectTask={handleSendToReviewProjectTask}
        canApproveProjectTask={canApproveProjectTask}
        handleApproveProjectTask={handleApproveProjectTask}
        taskWorkflowBusy={taskWorkflowBusy}
        taskAssignableLoading={taskAssignableLoading}
        taskAssignableError={taskAssignableError}
        saveProjectTaskPhase={saveProjectTaskPhase}
      />
    );
  }

  if (slug === 'timesheet' || slug === 'clock-records' || slug === 'manual-records') {
    return (
      <TimesheetSection
        styles={styles}
        ctx={{
          slug,
          user,
          router,
          setTlTimesheetTab,
          tlTimesheetTab,
          timesheetWindow,
          setTimesheetWindow,
          tlMyAttendanceSummary,
          tlMyAttendanceLogs,
          tlMyAttendanceEntry,
          timesheetDays,
          tlProfile,
          tlTeamSearch,
          setTlTeamSearch,
          tlTeamOverviewRows,
          tlRecordSearch,
          setTlRecordSearch,
          tlTeamRecordRows,
          employeeAttendanceSummary,
          employeeProfile,
          employeeAttendanceLogs,
          employeeAttendanceEntry,
          setTimesheetRoleFilter,
          timesheetRoleFilter,
          timesheetSearch,
          setTimesheetSearch,
          attendanceRows,
          recordRouteTab,
          providerFilterOptions,
          setRecordProviderFilter,
          recordProviderFilter,
          recordSearch,
          setRecordSearch,
          recordFromDate,
          setRecordFromDate,
          recordToDate,
          setRecordToDate,
          recordDepartmentFilter,
          setRecordDepartmentFilter,
          recordDepartmentOptions,
          recordStatusFilter,
          setRecordStatusFilter,
          token,
          recordExportQuery,
          filteredRecords,
          attendanceLoading,
          attendanceError,
          onRetryAttendance: loadAttendanceScreen,
        }}
      />
    );
  }

  if (slug === 'availability') {
    return (
      <AvailabilitySection
        styles={styles}
        ctx={{
          user,
          setAvailabilityRoleFilter,
          availabilityRoleFilter,
          setAvailabilityStatusFilter,
          availabilityStatusFilter,
          availabilityQuickFilter,
          setAvailabilityQuickFilter,
          availabilitySearch,
          setAvailabilitySearch,
          filteredAvailabilityUsers,
          updateMyAvailabilityStatus,
          setHoveredAvailabilityStatus,
          hoveredAvailabilityStatus,
          currentAvailabilityStatus,
          myAvailabilitySummary,
          openAvailabilityDatePicker,
          availabilityFromDate,
          availabilityToDate,
          filteredMyAvailabilityLog,
          attendanceLoading,
          attendanceError,
          onRetryAttendance: loadAttendanceScreen,
        }}
      />
    );
  }

  if (slug === 'admin') {
    if (!isAdminRole(user?.role)) {
      return <Redirect href="/dashboard/(tabs)" />;
    }
    return (
      <AdminSection
        styles={styles}
        ctx={{
          isCompactMobile,
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
          shiftSaveLoading,
          newDepartment,
          setNewDepartment,
          handleAddDepartment,
          deptAddLoading,
          departments,
          setDepartments,
          roleModalOpen,
          setRoleModalOpen,
          setSelectedAdminUserId,
          selectedAdminUser,
          applyAdminRole,
          adminRoleSavingTarget,
          adminDirectoryActionKey,
        }}
      />
    );
  }

  if (slug === 'request-management' || slug === 'manual-time-requests' || slug === 'my-requests') {
    return (
      <RequestsSection
        styles={styles}
        ctx={{
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
          requestAdminSearch,
          setRequestAdminSearch,
          updateManualStatus,
          updateLeaveStatus,
          openRejectModal,
          requestStatusMenuOpen,
          setRequestStatusMenuOpen,
          filteredMyManualRequests,
          filteredMyLeaveRequests,
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
          rejectModalOpen,
          setRejectModalOpen,
          rejectTargetType,
          rejectReason,
          setRejectReason,
          submitRejectRequest,
          attendanceLoading,
          attendanceError,
          onRetryAttendance: loadAttendanceScreen,
        }}
      />
    );
  }

  if (slug === 'team-data') {
    return (
      <TeamsManagementSection
        teams={teamsFilteredByTlSearch}
        loading={teamTlRosterLoading}
        error={teamTlRosterError}
        onRetry={loadTeamTlRoster}
        canView={isAdminOrHrRole(user?.role)}
        searchQuery={teamAssignSearch}
        onSearchChange={setTeamAssignSearch}
      />
    );
  }

  if (slug === 'team-tl') {
    return (
      <TeamsManagementSection
        teams={teamsFilteredByTlSearch}
        loading={teamTlRosterLoading}
        error={teamTlRosterError}
        onRetry={loadTeamTlRoster}
        canView={isAdminOrHrRole(user?.role)}
        searchQuery={teamAssignSearch}
        onSearchChange={setTeamAssignSearch}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <DashboardTopbar />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.title}>{route?.label ?? 'Route'}</Text>
          <Text style={styles.sub}>{route?.description ?? 'This route screen is ready for API integration.'}</Text>
          <View style={styles.box}>
            <Text style={styles.boxTitle}>Module Screen</Text>
            <Text style={styles.boxText}>This section will show real backend data and actions for this route.</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = routeDetailStyles;
