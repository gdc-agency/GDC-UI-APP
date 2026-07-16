import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import { Redirect, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Platform, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdminSection } from '@/components/dashboard/route-modules/admin-section';
import { AvailabilitySection } from '@/components/dashboard/route-modules/availability-section';
import { DailyUpdatesSection } from '@/components/dashboard/route-modules/daily-updates-section';
import { ProjectManagerSection } from '@/components/dashboard/route-modules/project-manager-section';
import { RequestsSection } from '@/components/dashboard/route-modules/requests-section';
import { TeamTlSection } from '@/components/dashboard/route-modules/team-tl-section';
import { TimesheetSection } from '@/components/dashboard/route-modules/timesheet-section';
import { DashboardTopbar } from '@/components/dashboard/topbar';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/context/theme-context';
import {
    approveLeaveRequest as approveLeaveRequestApi,
    approveManualTimeRequest as approveManualTimeRequestApi,
    approveTask as approveTaskApi,
    approveUser,
    createDepartment,
    createLeaveRequest as createLeaveRequestApi,
    createManualTimeRequest as createManualTimeRequestApi,
    createPortalClient,
    createPortalShare,
    createTask as createTaskApi,
    deleteDepartment,
    deletePortalClient,
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
    getMyTeamRoster,
    getMyTodayStatus,
    getPendingUsersList,
    getPortalOrgStats,
    getShiftStatus,
    getAttendanceControlSettings,
    getTaskAssignableUsers,
    getTeamLeaderDailyBundle,
    getTeams,
    invitePortalClient,
    listDepartments,
    listLeaveRequests,
    listManualTimeRequests,
    listMyEmployeeDailyUpdates,
    listPortalClients,
    listTasks,
    rejectLeaveRequest as rejectLeaveRequestApi,
    rejectManualTimeRequest as rejectManualTimeRequestApi,
    rejectUser,
    saveShiftTiming,
    setAttendanceControlSettings,
    setShiftStatus,
    sendTaskToReview,
    startTaskWork,
    submitTask as submitTaskApi,
    updateTask as updateTaskApi,
    updateUserRole,
    upsertHrDailySummary,
    upsertMyEmployeeDailyUpdate,
    upsertTeamLeaderDailySummary,
} from '@/data/api';
import { GDC_MODULES } from '@/data/constants/gdc-modules';
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
    applyViewerAvatarToOwnRequests,
    buildAttendanceRows,
    buildMyAvailabilityLogFromSevenDays,
    employeesFromTeamRoster,
    enrichRequestsWithAvatars,
    enrichTimesheetLogsWithAvatars,
    enrichTimesheetUserAvatars,
    filterAttendanceOverviewUsers,
    filterMyOwnRequests,
    filterUsersForAttendanceViewer,
    isExcludedAttendanceOverviewRole,
    mapClockHistoryToAvailabilityLog,
    mapClockHistoryToLog,
    mapLeaveRowToUi,
    mapManualRowToUi,
    mapRecordRowToTimesheetLog,
    mapSevenDayUserRow,
    mapSummaryUserToAvailability,
    mapThirtyDayUserRow,
    mapTodayStatusToAvailabilityStatus,
    mapTodaySummaryUserRow
} from '@/utils/attendance-ui-map';
import { fetchChatParticipantSnapshots } from '@/data/api/profile-api';
import {
  computeMyAvailabilityKpis,
  filterAvailabilityLogByRange,
  getAvailabilityLogRange,
  teamsMatch,
} from '@/utils/availability-helpers';
import { resolveProfileImageUri } from '@/utils/chat-directory';
import { countProjectManagerStats } from '@/utils/dashboard-task-stats';
import {
  breakInputToMinutes,
  DEFAULT_WORK_WEEK_DAYS,
  minutesToBreakInput,
  normalizeShiftPayload,
  todayDateInput,
} from '@/utils/time-control';
import { canCreateProjectTask, isAdminOrHrRole, isAdminRole, isHrRole, isTeamLeaderRole } from '@/utils/roles';
import {
  formatTaskRef,
  getTaskCardAssignment,
} from '@/utils/task-card-display';
import { displayRoleFromApi, getManagementTaskDisplayStatus, mapTaskRowToProjectTask } from '@/utils/task-ui-map';
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

function assignableRoleKey(roleRaw) {
  let r = String(roleRaw || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_');
  if (r === 'teamleader') r = 'team_leader';
  return r;
}

export default function RouteDetailScreen() {
  const { moduleStyles } = useTheme();
  const styles = moduleStyles.routeDetail;

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
  const [projectPeopleById, setProjectPeopleById] = useState(
    /** @type {Record<string, { id: number, name: string, role: string, team: string }>} */ ({}),
  );
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
  const [projectTeamFilter, setProjectTeamFilter] = useState('All Teams');
  const [projectTeamMenuOpen, setProjectTeamMenuOpen] = useState(false);
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
  const [portalClients, setPortalClients] = useState([]);
  const [portalStats, setPortalStats] = useState({
    totalClients: 0,
    totalShares: 0,
    portalUsers: 0,
    engagementPercent: 0,
  });
  const [portalSearch, setPortalSearch] = useState('');
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalAddOpen, setPortalAddOpen] = useState(false);
  const [portalCompanyName, setPortalCompanyName] = useState('');
  const [portalContactName, setPortalContactName] = useState('');
  const [portalContactEmail, setPortalContactEmail] = useState('');
  const [portalSaving, setPortalSaving] = useState(false);
  const [portalActionKey, setPortalActionKey] = useState(null);
  const [portalShareClientId, setPortalShareClientId] = useState(null);
  const [portalShareType, setPortalShareType] = useState('report');
  const [portalShareTitle, setPortalShareTitle] = useState('');
  const [portalShareSummary, setPortalShareSummary] = useState('');
  const [shiftSaveLoading, setShiftSaveLoading] = useState(false);
  const [deptAddLoading, setDeptAddLoading] = useState(false);
  const [shiftLoading, setShiftLoading] = useState(false);
  const [shiftTimezone, setShiftTimezone] = useState('Asia/Karachi');
  const [shiftWorkWeekDays, setShiftWorkWeekDays] = useState([...DEFAULT_WORK_WEEK_DAYS]);
  const [shiftBreakStart, setShiftBreakStart] = useState('');
  const [shiftBreakDuration, setShiftBreakDuration] = useState('01:00');
  const [shiftLateAfter, setShiftLateAfter] = useState(15);
  const [shiftClockInCutoff, setShiftClockInCutoff] = useState(60);
  const [shiftGraceBefore, setShiftGraceBefore] = useState(5);
  const [shiftMinHours, setShiftMinHours] = useState(4);
  const [shiftAutoCheckout, setShiftAutoCheckout] = useState(12);
  const [shiftHolidays, setShiftHolidays] = useState([]);
  const [shiftHolidayDraft, setShiftHolidayDraft] = useState('');
  const [shiftEnabled, setShiftEnabled] = useState(false);
  const [shiftId, setShiftId] = useState(null);
  const [liveShiftNotifications, setLiveShiftNotifications] = useState(true);
  const [shiftControlSnapshot, setShiftControlSnapshot] = useState(null);
  const [shiftLastUpdatedAt, setShiftLastUpdatedAt] = useState(null);
  const [shiftLastUpdatedBy, setShiftLastUpdatedBy] = useState(null);
  const [timezoneMenuOpen, setTimezoneMenuOpen] = useState(false);
  const [timesheetWindow, setTimesheetWindow] = useState('7d');
  const [tlTimesheetTab, setTlTimesheetTab] = useState('my-attendance');
  const [myRequestsTab, setMyRequestsTab] = useState('leave');
  const [timesheetSearch, setTimesheetSearch] = useState('');
  const [tlTeamSearch, setTlTeamSearch] = useState('');
  const [timesheetRoleFilter, setTimesheetRoleFilter] = useState('all');
  const [recordProviderFilter, setRecordProviderFilter] = useState('all');
  const [recordSearch, setRecordSearch] = useState('');
  const [recordFromDate, setRecordFromDate] = useState('');
  const [recordToDate, setRecordToDate] = useState('');
  const [recordDepartmentFilter, setRecordDepartmentFilter] = useState('all');
  const [recordStatusFilter, setRecordStatusFilter] = useState('all');
  const [requestStatusMenuOpen, setRequestStatusMenuOpen] = useState(false);
  const [timesheetUsers, setTimesheetUsers] = useState([]);
  const [tlRosterEmployees, setTlRosterEmployees] = useState([]);
  const [tlRosterTeamName, setTlRosterTeamName] = useState(/** @type {string | null} */ (null));
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
  const [availabilityFromDate, setAvailabilityFromDate] = useState('');
  const [availabilityToDate, setAvailabilityToDate] = useState('');
  const [availabilityTab, setAvailabilityTab] = useState('my');
  const [availabilityLogPreset, setAvailabilityLogPreset] = useState('7d');
  const [availabilityShift, setAvailabilityShift] = useState(null);
  const [myAvailabilityToday, setMyAvailabilityToday] = useState(null);
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
  const [shiftDate, setShiftDate] = useState(() => todayDateInput());
  const [shiftStart, setShiftStart] = useState('09:00 AM');
  const [shiftEnd, setShiftEnd] = useState('06:00 PM');
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

  const fetchPortalClients = useCallback(async (searchTerm) => {
    if (!token || !isAdminRole(user?.role)) return;
    setPortalLoading(true);
    try {
      const q = typeof searchTerm === 'string' ? searchTerm : portalSearch;
      const res = await listPortalClients(token, {
        page: 1,
        limit: 50,
        search: String(q || '').trim() || undefined,
      });
      const rows = Array.isArray(res?.data) ? res.data : [];
      setPortalClients(rows);
      if (res?.stats && typeof res.stats === 'object') {
        setPortalStats({
          totalClients: Number(res.stats.totalClients) || 0,
          totalShares: Number(res.stats.totalShares) || 0,
          portalUsers: Number(res.stats.portalUsers) || 0,
          engagementPercent: Number(res.stats.engagementPercent) || 0,
        });
      } else {
        try {
          const statsRes = await getPortalOrgStats(token);
          const s = statsRes?.data || {};
          setPortalStats({
            totalClients: Number(s.totalClients) || 0,
            totalShares: Number(s.totalShares) || 0,
            portalUsers: Number(s.portalUsers) || 0,
            engagementPercent: Number(s.engagementPercent) || 0,
          });
        } catch {
          /* stats optional */
        }
      }
    } catch (e) {
      Alert.alert('Client Portal', e?.message ?? 'Could not load clients');
    } finally {
      setPortalLoading(false);
    }
  }, [token, user?.role, portalSearch]);

  useEffect(() => {
    if (slug !== 'admin' || !isAdminRole(user?.role) || !token) return;
    if (adminControlTab !== 'client-portal') return;
    void fetchPortalClients('');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once when tab opens
  }, [slug, adminControlTab, token, user?.role]);

  const handleCreatePortalClient = useCallback(async () => {
    const companyName = portalCompanyName.trim();
    const contactEmail = portalContactEmail.trim();
    if (!companyName || !contactEmail) {
      Alert.alert('Add client', 'Company name and contact email are required.');
      return;
    }
    setPortalSaving(true);
    try {
      await createPortalClient(token, {
        companyName,
        contactEmail,
        contactName: portalContactName.trim() || undefined,
      });
      setPortalCompanyName('');
      setPortalContactName('');
      setPortalContactEmail('');
      setPortalAddOpen(false);
      await fetchPortalClients();
      Alert.alert('Client Portal', 'Client added.');
    } catch (e) {
      Alert.alert('Add client', e?.message ?? 'Failed to add client');
    } finally {
      setPortalSaving(false);
    }
  }, [
    token,
    portalCompanyName,
    portalContactEmail,
    portalContactName,
    fetchPortalClients,
  ]);

  const handleDeletePortalClient = useCallback(
    (client) => {
      Alert.alert('Delete client', `Remove ${client.companyName || 'this client'}?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setPortalActionKey(`del-${client.id}`);
            try {
              await deletePortalClient(token, client.id);
              await fetchPortalClients();
            } catch (e) {
              Alert.alert('Delete client', e?.message ?? 'Failed');
            } finally {
              setPortalActionKey(null);
            }
          },
        },
      ]);
    },
    [token, fetchPortalClients],
  );

  const handleInvitePortalClient = useCallback(
    async (client) => {
      setPortalActionKey(`inv-${client.id}`);
      try {
        const res = await invitePortalClient(token, client.id);
        const link = res?.data?.inviteLink;
        Alert.alert(
          'Invite sent',
          link ? `Invite ready for ${res?.data?.email || client.contactEmail}.` : res?.message || 'Invite sent.',
        );
      } catch (e) {
        Alert.alert('Invite', e?.message ?? 'Failed to send invite');
      } finally {
        setPortalActionKey(null);
      }
    },
    [token],
  );

  const handleCreatePortalShare = useCallback(async () => {
    const title = portalShareTitle.trim();
    if (!portalShareClientId || !title) {
      Alert.alert('Share', 'Title is required.');
      return;
    }
    setPortalSaving(true);
    try {
      await createPortalShare(token, portalShareClientId, {
        shareType: portalShareType === 'announcement' ? 'report' : portalShareType,
        title: portalShareType === 'announcement' ? `[Announcement] ${title}` : title,
        summary: portalShareSummary.trim() || undefined,
      });
      setPortalShareClientId(null);
      setPortalShareTitle('');
      setPortalShareSummary('');
      setPortalShareType('report');
      await fetchPortalClients();
      Alert.alert('Share', 'Shared with client.');
    } catch (e) {
      Alert.alert('Share', e?.message ?? 'Failed to share');
    } finally {
      setPortalSaving(false);
    }
  }, [
    token,
    portalShareClientId,
    portalShareTitle,
    portalShareType,
    portalShareSummary,
    fetchPortalClients,
  ]);

  const loadTaskAssignableUsers = useCallback(async () => {
    if (!token || slug !== 'project-manager') return;
    if (!canCreateProjectTask(user?.role) && user?.role !== 'HR') {
      setTaskAssignableRaw((prev) => (prev.length ? [] : prev));
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
          team: String(r.team_name ?? r.team ?? r.department ?? '').trim(),
        }))
        .filter((r) => Number.isFinite(r.id) && r.name);
      setTaskAssignableRaw((prev) => {
        if (
          prev.length === normalized.length &&
          prev.every(
            (p, i) =>
              p.id === normalized[i].id &&
              p.name === normalized[i].name &&
              String(p.role) === String(normalized[i].role) &&
              p.team === normalized[i].team,
          )
        ) {
          return prev;
        }
        return normalized;
      });
    } catch (e) {
      setTaskAssignableRaw([]);
      setTaskAssignableError(e?.message ?? 'Could not load assignable users (check Task API + Auth).');
    } finally {
      setTaskAssignableLoading(false);
    }
  }, [token, slug, user?.role]);

  const loadProjectTasks = useCallback(
    async ({ silent = false } = {}) => {
      if (!token || slug !== 'project-manager') return;
      if (!silent) setProjectTasksLoading(true);
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
        const mapped = rows.map(mapTaskRowToProjectTask);
        setProjectTasks(mapped);

        // Resolve Assigned by / Assigned to names (CRM uses full user store).
        const peopleIds = [
          ...new Set(
            mapped
              .flatMap((t) => [t.createdByUserId, t.assignedByUserId, t.assignedToUserId])
              .filter((id) => id != null && Number.isFinite(Number(id)))
              .map((id) => String(id)),
          ),
        ];
        if (peopleIds.length) {
          try {
            const snapRes = await fetchChatParticipantSnapshots(token, peopleIds);
            const snapRows = Array.isArray(snapRes?.data)
              ? snapRes.data
              : Array.isArray(snapRes)
                ? snapRes
                : [];
            setProjectPeopleById((prev) => {
              const next = { ...prev };
              for (const row of snapRows) {
                const id = row?.id != null ? Number(row.id) : NaN;
                if (!Number.isFinite(id)) continue;
                const name = String(row.name ?? row.full_name ?? row.username ?? '').trim();
                if (!name) continue;
                next[String(id)] = {
                  id,
                  name,
                  role: displayRoleFromApi(row.role),
                  team: String(row.team_name ?? row.team ?? row.department ?? '').trim(),
                };
              }
              return next;
            });
          } catch {
            /* name resolution is best-effort */
          }
        }
      } catch (e) {
        if (!silent) Alert.alert('Tasks', e?.message ?? 'Could not load tasks');
      } finally {
        if (!silent) setProjectTasksLoading(false);
      }
    },
    [token, slug, projectStatusFilter, projectSearch, projectFromDate, projectToDate],
  );

  const loadProjectTasksRef = useRef(loadProjectTasks);
  const loadTaskAssignableUsersRef = useRef(loadTaskAssignableUsers);
  loadProjectTasksRef.current = loadProjectTasks;
  loadTaskAssignableUsersRef.current = loadTaskAssignableUsers;

  const projectTasksHydratedRef = useRef(false);
  useEffect(() => {
    if (slug !== 'project-manager') {
      projectTasksHydratedRef.current = false;
      return undefined;
    }
    return undefined;
  }, [slug]);

  useFocusEffect(
    useCallback(() => {
      if (slug !== 'project-manager' || !token) return undefined;
      const silent = projectTasksHydratedRef.current;
      void (async () => {
        await loadProjectTasksRef.current({ silent });
        projectTasksHydratedRef.current = true;
      })();
      void loadTaskAssignableUsersRef.current();
      return undefined;
    }, [slug, token]),
  );

  useEffect(() => {
    if (slug !== 'project-manager' || !token) return undefined;
    const id = setInterval(() => {
      void loadProjectTasksRef.current({ silent: true });
      void loadTaskAssignableUsersRef.current();
    }, DATA_POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [slug, token]);

  // First open: show loading at most 1s, then go silent even if request still running.
  useEffect(() => {
    if (slug !== 'project-manager' || !projectTasksLoading) return undefined;
    const t = setTimeout(() => setProjectTasksLoading(false), 1000);
    return () => clearTimeout(t);
  }, [slug, projectTasksLoading]);

  // Filter changes: silent refresh (no spinner loop).
  useEffect(() => {
    if (slug !== 'project-manager' || !token) return;
    if (!projectTasksHydratedRef.current) return;
    void loadProjectTasksRef.current({ silent: true });
  }, [slug, token, projectStatusFilter, projectSearch, projectFromDate, projectToDate]);

  useEffect(() => {
    if (slug !== 'project-manager' || !createTaskOpen || !token || !canCreateProjectTask(user?.role)) return;
    void loadTaskAssignableUsersRef.current();
  }, [createTaskOpen, slug, token, user?.role]);

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
      if (slug !== 'team-tl') return;
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
      setAvailabilityTab('team');
      if (q === 'present') {
        setAvailabilityQuickFilter('present');
        setAvailabilityStatusFilter('present');
      } else if (q === 'absent' || q === 'offline') {
        setAvailabilityQuickFilter('offline');
        setAvailabilityStatusFilter('offline');
      } else if (q === 'leave') {
        setAvailabilityQuickFilter('leave');
        setAvailabilityStatusFilter('leave');
      } else if (q === 'away') {
        setAvailabilityQuickFilter('away');
        setAvailabilityStatusFilter('away');
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
    const teamF = String(projectTeamFilter || 'All Teams').trim();
    const teamMap = Object.fromEntries(
      taskAssignableRaw
        .filter((u) => u?.id != null && u.team)
        .map((u) => [String(u.id), String(u.team).trim()]),
    );
    return visibleProjectTasks.filter((task) => {
      const assigneeTeam =
        String(task.assigneeTeam || teamMap[String(task.assignedToUserId)] || '').trim();
      if (teamF && teamF !== 'All Teams') {
        if (assigneeTeam !== teamF) return false;
      }
      if (f !== 'all') {
        if (f === 'overdue') {
          const today = new Date().toISOString().slice(0, 10);
          if (!task.deadline || task.deadline >= today) return false;
          const st = String(task.status || '').toLowerCase();
          if (st === 'approved') return false;
        } else if (f === 'completed') {
          const st = String(task.status || '').toLowerCase();
          if (!st.includes('approved')) return false;
        } else if (f === 'in progress' || f === 'working') {
          const st = String(task.status || '').toLowerCase();
          if (!st.includes('progress') && st !== 'working') return false;
        } else if (String(task.status || '').toLowerCase() !== f) {
          return false;
        }
      }
      if (projectFromDate && task.deadline < projectFromDate) return false;
      if (projectToDate && task.deadline > projectToDate) return false;
      if (!q) return true;
      const haystack =
        `${task.id} ${task.title} ${task.description} ${task.assignee} ${task.assignedToName ?? ''} ${task.priority} ${task.status} ${task.attachmentName ?? ''} ${assigneeTeam}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [projectFromDate, projectSearch, projectStatusFilter, projectTeamFilter, projectToDate, visibleProjectTasks, taskAssignableRaw]);

  const projectManagerStats = useMemo(
    () => countProjectManagerStats(visibleProjectTasks, user?.role),
    [visibleProjectTasks, user?.role],
  );

  const projectTeamOptions = useMemo(() => {
    const teams = new Set();
    for (const t of visibleProjectTasks) {
      const team = String(t.assigneeTeam || '').trim();
      if (team) teams.add(team);
    }
    for (const u of taskAssignableRaw) {
      const team = String(u.team || '').trim();
      if (team) teams.add(team);
    }
    return ['All Teams', ...Array.from(teams).sort((a, b) => a.localeCompare(b))];
  }, [visibleProjectTasks, taskAssignableRaw]);

  const showTeamInProjects = isAdminOrHrRole(user?.role);
  const canCreateProject = canCreateProjectTask(user?.role);

  const taskUserDirectoryById = useMemo(() => {
    /** @type {Record<string, { id: number, name: string, role: string, team: string }>} */
    const map = { ...projectPeopleById };
    for (const u of taskAssignableRaw) {
      if (u?.id == null) continue;
      const key = String(u.id);
      map[key] = {
        id: u.id,
        name: u.name || map[key]?.name || '',
        role: displayRoleFromApi(u.role) || map[key]?.role || '',
        team: u.team || map[key]?.team || '',
      };
    }
    if (user?.id != null) {
      map[String(user.id)] = {
        id: Number(user.id),
        name: String(user.name || user.full_name || '').trim() || 'You',
        role: String(user.role || ''),
        team: String(user.team_name ?? user.team ?? '').trim(),
      };
    }
    return map;
  }, [taskAssignableRaw, projectPeopleById, user]);

  const enrichTaskTeam = useCallback(
    (task) => {
      if (task?.assigneeTeam) return task;
      const id = task?.assignedToUserId;
      if (id == null) return task;
      const row = taskUserDirectoryById[String(id)];
      if (!row?.team) return task;
      return { ...task, assigneeTeam: row.team };
    },
    [taskUserDirectoryById],
  );

  const filteredProjectTasksEnriched = useMemo(
    () => filteredProjectTasks.map(enrichTaskTeam),
    [filteredProjectTasks, enrichTaskTeam],
  );

  const formatProjectDueDate = useCallback((isoDate) => {
    if (!isoDate) return 'Due date not set';
    const parsed = new Date(isoDate);
    if (Number.isNaN(parsed.getTime())) return `Due ${isoDate}`;
    return `Due ${new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(parsed)}`;
  }, []);
  const projectStatusTone = useCallback((status) => {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'pending') {
      return { pill: styles.projectStatusPending, text: styles.projectStatusPendingText };
    }
    if (normalized === 'in progress' || normalized === 'working') {
      return { pill: styles.projectStatusProgress, text: styles.projectStatusProgressText };
    }
    if (normalized === 'review') {
      return { pill: styles.projectStatusReview, text: styles.projectStatusReviewText };
    }
    if (normalized === 'submitted') {
      return { pill: styles.projectStatusSubmitted, text: styles.projectStatusSubmittedText };
    }
    if (normalized === 'overdue') {
      return { pill: styles.projectStatusOverdue, text: styles.projectStatusOverdueText };
    }
    if (normalized === 'completed' || normalized === 'approved') {
      return { pill: styles.projectStatusCompleted, text: styles.projectStatusCompletedText };
    }
    return { pill: styles.projectStatusDefault, text: styles.projectStatusDefaultText };
  }, [styles]);

  const assignableUsersForCreate = useMemo(() => {
    if (!canCreateProjectTask(user?.role)) return [];
    return taskAssignableRaw
      .map((u) => ({
        id: u.id,
        name: String(u.name || '').trim(),
        role: displayRoleFromApi(u.role),
        team: u.team || '',
      }))
      .filter((u) => u.name);
  }, [user?.role, taskAssignableRaw]);

  /** @deprecated Prefer assignableUsersForCreate — kept for forward flow HR filter */
  const hrAssignableUsers = useMemo(() => {
    if (!isAdminRole(user?.role)) return [];
    return taskAssignableRaw
      .filter((u) => assignableRoleKey(u.role) === 'hr')
      .map((u) => ({ id: u.id, name: String(u.name || '').trim() }))
      .filter((u) => u.name);
  }, [user?.role, taskAssignableRaw]);

  const canManagePendingProjectTask = useCallback(
    (task) => {
      if (!user?.role || !task || String(task.status || '') !== 'Pending') return false;
      const myUid = parseInt(String(user.id), 10);
      if (!Number.isFinite(myUid)) return false;
      const createdBy = task.createdByUserId ?? task.assignedByUserId;
      const assigneeRole = String(task.assignedRole || '');
      const assigneeTeam = String(task.assigneeTeam || taskUserDirectoryById[String(task.assignedToUserId)]?.team || '').trim();
      const myTeam = String(user.team_name ?? user.team ?? '').trim();

      if (isAdminRole(user.role)) {
        return createdBy === myUid;
      }
      if (isHrRole(user.role)) {
        if (task.createdByRole === 'Admin' && task.assignedToUserId === myUid) return false;
        if (createdBy !== myUid) return false;
        return assigneeRole === 'Team Leader' || assigneeRole === 'Employee';
      }
      if (isTeamLeaderRole(user.role)) {
        if (createdBy !== myUid) return false;
        return assigneeRole === 'Employee' && (!!myTeam ? assigneeTeam === myTeam : true);
      }
      return false;
    },
    [user, taskUserDirectoryById],
  );

  const getProjectTaskDisplayStatus = useCallback(
    (task) => getManagementTaskDisplayStatus(task, user?.role),
    [user?.role],
  );

  const getProjectCardAssignment = useCallback(
    (task) => getTaskCardAssignment(enrichTaskTeam(task), user, taskUserDirectoryById),
    [enrichTaskTeam, user, taskUserDirectoryById],
  );

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
      const rangeFrom = recordFromDate || '';
      const rangeTo = recordToDate || '';

      if (slug === 'request-management' || slug === 'my-requests') {
        const [leaves, manuals] = await Promise.all([listLeaveRequests(token), listManualTimeRequests(token)]);
        let leaveUi = leaves.map((row) => mapLeaveRowToUi(row));
        let manualUi = manuals.map((row) => mapManualRowToUi(row));
        try {
          const authRes = await getAllUsers(token, { approvedOnly: true });
          const profileRows = normalizeApprovedUsersList(authRes);
          leaveUi = enrichRequestsWithAvatars(leaveUi, profileRows);
          manualUi = enrichRequestsWithAvatars(manualUi, profileRows);
        } catch {
          /* use requester_avatar from attendance DB */
        }
        if (slug === 'my-requests' && user) {
          leaveUi = applyViewerAvatarToOwnRequests(leaveUi, user);
          manualUi = applyViewerAvatarToOwnRequests(manualUi, user);
        }
        setLeaveRequests(leaveUi);
        setManualRequests(manualUi);
        return;
      }

      if (slug === 'availability') {
        const role = user?.role;
        const isAdmin = isAdminRole(role);
        const isHr = isHrRole(role);
        const isTl = isTeamLeaderRole(role);
        const needTeam = isAdmin || isHr || isTl;
        const needPersonal = !isAdmin;

        const loadTeamUsers = async () => {
          const roleParam = isTl
            ? 'employee'
            : apiRoleFromDisplayFilter(availabilityRoleFilter);
          const summary = await getAttendanceSummary(token, { role: roleParam });
          let availUsers = filterUsersForAttendanceViewer(
            role,
            summary.users
              .filter((row) => !isExcludedAttendanceOverviewRole(row.role))
              .map((row) => mapSummaryUserToAvailability(row)),
          );
          if (isTl) {
            const myTeam = String(user?.team_name ?? user?.department ?? '').trim();
            availUsers = availUsers.filter(
              (u) => u.role === 'Employee' && teamsMatch(u.team, myTeam),
            );
          }
          if (availUsers.some((u) => !u.avatarUrl)) {
            try {
              const authRes = await getAllUsers(token, { approvedOnly: true });
              availUsers = enrichTimesheetUserAvatars(availUsers, normalizeApprovedUsersList(authRes));
            } catch {
              /* attendance profile_image only */
            }
          }
          return availUsers;
        };

        const loadPersonal = async () => {
          const gdc = user?.gdc_id ? String(user.gdc_id).trim() : '';
          const [todayRow, sevenRows, history, leaves, shift] = await Promise.all([
            getMyTodayStatus(token).catch(() => null),
            getAttendance7Days(token, gdc ? { search: gdc } : {}),
            getClockHistory(token),
            listLeaveRequests(token).catch(() => []),
            getCurrentShift(token).catch(() => null),
          ]);
          const meRow =
            (gdc ? sevenRows.find((r) => String(r.gdc_id ?? '').trim() === gdc) : null) ||
            sevenRows[0] ||
            null;
          const logByDate = new Map();
          const baseLog = meRow ? buildMyAvailabilityLogFromSevenDays(meRow, history) : [];
          for (const row of baseLog) {
            if (row.date) logByDate.set(row.date, row);
          }
          for (const row of history) {
            const mapped = mapClockHistoryToAvailabilityLog(row);
            if (!mapped.date) continue;
            if (!logByDate.has(mapped.date)) logByDate.set(mapped.date, mapped);
          }
          const log = [...logByDate.values()].sort((a, b) => b.date.localeCompare(a.date));
          const todayStatus = mapTodayStatusToAvailabilityStatus(todayRow?.today_status);
          const meUser = {
            gdcId: gdc || String(todayRow?.gdc_id ?? ''),
            name: String(todayRow?.name ?? user?.name ?? ''),
            role: user?.role ?? 'Employee',
            team: String(user?.team_name ?? user?.department ?? '—'),
            avatarUrl: resolveProfileImageUri(user?.avatar) || null,
            status: todayStatus,
            cardStatus:
              todayStatus === 'Leave'
                ? 'leave'
                : todayStatus === 'Available'
                  ? 'present'
                  : 'offline',
            attendanceLabel:
              todayStatus === 'Available' ? 'Present' : todayStatus === 'Leave' ? 'On Leave' : 'Offline',
            activityLabel:
              todayStatus === 'Available' ? 'Working' : todayStatus === 'Leave' ? 'Leave' : 'Offline',
            active: todayStatus === 'Available',
            checkIn: todayRow?.check_in ? String(todayRow.check_in) : null,
            checkOut: todayRow?.check_out ? String(todayRow.check_out) : null,
            checkInLabel: todayRow?.check_in
              ? String(todayRow.check_in).slice(11, 16) || '—'
              : '—',
            checkOutLabel: todayRow?.check_out
              ? String(todayRow.check_out).slice(11, 16) || '—'
              : '—',
            liveStatus: String(todayRow?.live_status ?? todayRow?.today_status ?? '—'),
          };
          const leaveUi = (Array.isArray(leaves) ? leaves : []).map((row) => mapLeaveRowToUi(row));
          const shiftObj =
            shift && typeof shift === 'object'
              ? shift.data && typeof shift.data === 'object'
                ? shift.data
                : shift
              : null;
          return { log, meUser, leaveUi, shift: shiftObj };
        };

        if (needTeam && needPersonal) {
          const [teamUsers, personal] = await Promise.all([loadTeamUsers(), loadPersonal()]);
          setAvailabilityUsers(teamUsers);
          setMyAvailabilityLog(personal.log);
          setLeaveRequests(personal.leaveUi);
          setAvailabilityShift(personal.shift && typeof personal.shift === 'object' ? personal.shift : null);
          setMyAvailabilityToday(personal.meUser);
        } else if (needTeam) {
          const teamUsers = await loadTeamUsers();
          setAvailabilityUsers(teamUsers);
          setMyAvailabilityLog([]);
          setAvailabilityShift(null);
          setMyAvailabilityToday(null);
        } else {
          const personal = await loadPersonal();
          setMyAvailabilityLog(personal.log);
          setLeaveRequests(personal.leaveUi);
          setAvailabilityShift(personal.shift && typeof personal.shift === 'object' ? personal.shift : null);
          setAvailabilityUsers([personal.meUser]);
          setMyAvailabilityToday(personal.meUser);
        }
        return;
      }

      if (slug === 'admin') {
        const day = /^\d{4}-\d{2}-\d{2}$/.test(String(shiftDate || '')) ? shiftDate : undefined;
        const shift = await getCurrentShift(token, day);
        if (shift) applyShiftFromApi(shift);
        return;
      }

      if (slug === 'clock-records' || slug === 'manual-records') {
        const recordRole =
          recordProviderFilter !== 'all' ? apiRoleFromDisplayFilter(recordProviderFilter) : roleQ;
        const query = {
          ...(rangeFrom ? { from: rangeFrom } : {}),
          ...(rangeTo ? { to: rangeTo } : {}),
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
        let logs = rows
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
        let recordUsers = filterAttendanceOverviewUsers([...usersByGdc.values()]);
        if (
          logs.some((l) => !l.avatarUrl) ||
          recordUsers.some((u) => !u.avatarUrl)
        ) {
          try {
            const authRes = await getAllUsers(token, { approvedOnly: true });
            const profileRows = normalizeApprovedUsersList(authRes);
            recordUsers = enrichTimesheetUserAvatars(recordUsers, profileRows);
            logs = enrichTimesheetLogsWithAvatars(logs, profileRows);
          } catch {
            /* attendance profile_image only */
          }
        }
        setTimesheetUsers(recordUsers);
        setTimesheetLogs(logs);
        return;
      }

      if (slug === 'timesheet') {
        if (user?.role !== 'Team Leader') {
          setTlRosterEmployees([]);
          setTlRosterTeamName(null);
        }
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

        if (user?.role === 'Employee' || user?.role === 'HR') {
          const history = await getClockHistory(token);
          let historyLogs = history.map((row) => mapClockHistoryToLog(row));
          const authAvatar = resolveProfileImageUri(user?.avatar);
          if (authAvatar || user?.name) {
            historyLogs = historyLogs.map((log) => ({
              ...log,
              avatarUrl: log.avatarUrl || authAvatar,
              userName: log.userName || user?.name || '',
              userRole: log.userRole || user?.role || 'Employee',
              gdcId: log.gdcId || (user?.gdc_id ? String(user.gdc_id) : log.gdcId),
              team: log.team || user?.team_name || user?.department || log.team,
            }));
          }
          if (historyLogs.some((l) => !l.avatarUrl)) {
            try {
              const authRes = await getAllUsers(token, { approvedOnly: true });
              historyLogs = enrichTimesheetLogsWithAvatars(
                historyLogs,
                normalizeApprovedUsersList(authRes),
              );
            } catch {
              /* session avatar only */
            }
          }
          setTimesheetLogs(historyLogs);
        } else if (user?.role === 'Team Leader') {
          try {
            const roster = await getMyTeamRoster(token);
            const { teamName, members } = employeesFromTeamRoster(roster);
            let rosterUi = members;
            if (rosterUi.some((u) => !u.avatarUrl)) {
              try {
                const authRes = await getAllUsers(token, { approvedOnly: true });
                rosterUi = enrichTimesheetUserAvatars(
                  rosterUi,
                  normalizeApprovedUsersList(authRes),
                );
              } catch {
                /* roster profile_image only */
              }
            }
            setTlRosterEmployees(rosterUi);
            setTlRosterTeamName(teamName || String(user?.team_name || '').trim() || null);
          } catch {
            setTlRosterEmployees([]);
            setTlRosterTeamName(String(user?.team_name || '').trim() || null);
          }

          const history = await getClockHistory(token);
          let personalLogs = history.map((row) => mapClockHistoryToLog(row));
          const authAvatar = resolveProfileImageUri(user?.avatar);
          if (authAvatar || user?.name) {
            personalLogs = personalLogs.map((log) => ({
              ...log,
              avatarUrl: log.avatarUrl || authAvatar,
              userName: log.userName || user?.name || '',
              userRole: log.userRole || 'Team Leader',
              gdcId: log.gdcId || (user?.gdc_id ? String(user.gdc_id) : log.gdcId),
              team: log.team || user?.team_name || user?.department || log.team,
            }));
          }
          let teamClockLogs = [];
          if (rangeFrom || rangeTo) {
            const teamLabel = String(user?.team_name || user?.department || '').trim();
            const rows = await getClockRecords(token, {
              ...(rangeFrom ? { from: rangeFrom } : {}),
              ...(rangeTo ? { to: rangeTo } : {}),
              role: 'employee',
              ...(teamLabel ? { department: teamLabel } : {}),
            });
            teamClockLogs = rows
              .filter((row) => !isExcludedAttendanceOverviewRole(row.role))
              .map((row) => mapRecordRowToTimesheetLog(row, 'clock'));
          }
          let merged = [...personalLogs, ...teamClockLogs];
          if (merged.some((l) => !l.avatarUrl)) {
            try {
              const authRes = await getAllUsers(token, { approvedOnly: true });
              const profileRows = normalizeApprovedUsersList(authRes);
              merged = enrichTimesheetLogsWithAvatars(merged, profileRows);
            } catch {
              /* session / attendance profile_image only */
            }
          }
          setTimesheetLogs(merged);
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
    user?.team_name,
    user?.department,
    user?.name,
    user?.avatar,
    user?.gdc_id,
    shiftDate,
    applyShiftFromApi,
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

  useEffect(() => {
    if (user?.role !== 'HR') return;
    if (timesheetRoleFilter === 'HR') setTimesheetRoleFilter('all');
  }, [user?.role, timesheetRoleFilter]);

  const filteredTimesheetUsers = useMemo(() => {
    const q = timesheetSearch.trim().toLowerCase();
    return filterUsersForAttendanceViewer(user?.role, timesheetUsers).filter((u) => {
      if (timesheetRoleFilter !== 'all' && u.role !== timesheetRoleFilter) return false;
      if (!q) return true;
      return `${u.name} ${u.gdcId} ${u.team} ${u.role}`.toLowerCase().includes(q);
    });
  }, [timesheetRoleFilter, timesheetSearch, timesheetUsers, user?.role]);

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
    const scopedUsers = filterUsersForAttendanceViewer(user?.role, timesheetUsers);
    const usersById = new Map(scopedUsers.map((u) => [u.gdcId, u]));
    const allowedGdc = new Set(scopedUsers.map((u) => u.gdcId));
    return timesheetLogs
      .filter((rec) => {
        if (recordRouteTab !== rec.source) return false;
        if (!allowedGdc.has(rec.gdcId)) return false;
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
      .map((rec) => {
        const u = usersById.get(rec.gdcId);
        const avatarUrl = rec.avatarUrl || u?.avatarUrl || null;
        return {
          ...rec,
          avatarUrl,
          user: u ? { ...u, avatarUrl: u.avatarUrl || avatarUrl } : undefined,
        };
      });
  }, [
    recordDepartmentFilter,
    recordFromDate,
    recordProviderFilter,
    recordRouteTab,
    recordSearch,
    recordToDate,
    timesheetLogs,
    timesheetUsers,
    user?.role,
  ]);
  const employeeProfile = useMemo(() => {
    // Personal "My attendance" for Employee + HR (CRM includes HR My attendance).
    if (user?.role !== 'Employee' && user?.role !== 'HR') return null;
    const authAvatar = resolveProfileImageUri(user?.avatar);
    const gid = user?.gdc_id ? String(user.gdc_id) : '';
    const roleWanted = user.role === 'HR' ? 'HR' : 'Employee';
    if (gid) {
      const match = timesheetUsers.find((u) => u.gdcId === gid);
      if (match) return { ...match, avatarUrl: match.avatarUrl || authAvatar, role: match.role || roleWanted };
    }
    const fallback =
      timesheetUsers.find((u) => u.role === roleWanted && u.name === user.name) ||
      timesheetUsers.find((u) => u.role === roleWanted) || {
        gdcId: gid || 'me',
        name: user?.name || roleWanted,
        role: roleWanted,
        team: user?.team_name || user?.department || '—',
        avatarUrl: authAvatar,
      };
    return fallback.avatarUrl ? fallback : { ...fallback, avatarUrl: authAvatar };
  }, [timesheetUsers, user?.avatar, user?.department, user?.gdc_id, user?.name, user?.role, user?.team_name]);
  const employeeAttendanceLogs = useMemo(() => {
    if (!employeeProfile) return [];
    return timesheetLogs
      .filter((log) => log.gdcId === employeeProfile.gdcId && timesheetDays.includes(log.date))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [employeeProfile, timesheetDays, timesheetLogs]);
  const employeeAttendanceSummary = useMemo(() => {
    const totalHours = employeeAttendanceLogs.reduce((sum, row) => sum + row.hours, 0);
    const overtime = employeeAttendanceLogs.reduce((sum, row) => sum + Math.max(0, row.hours - 8), 0);
    const lateMarks = employeeAttendanceLogs.filter((row) => row.status === 'L' || row.status === 'Late').length;
    const presentDays = employeeAttendanceLogs.filter((row) => Number(row.hours) > 0).length;
    const workingDays = Math.max(timesheetDays.length, 1);
    const attendancePct = Math.round((presentDays / workingDays) * 1000) / 10;
    return { totalHours, overtime, lateMarks, attendancePct, presentDays, workingDays };
  }, [employeeAttendanceLogs, timesheetDays.length]);
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
    const teamLabel =
      tlRosterTeamName || String(user?.team_name || user?.department || '').trim() || '—';
    const fallback =
      timesheetUsers.find((u) => u.role === 'Team Leader' && u.name === user.name) ||
      timesheetUsers.find((u) => u.role === 'Team Leader') || {
        gdcId: gid || 'me',
        name: user?.name || 'Team Leader',
        role: 'Team Leader',
        team: teamLabel,
        avatarUrl: authAvatar,
      };
    return fallback.avatarUrl ? fallback : { ...fallback, avatarUrl: authAvatar };
  }, [
    timesheetUsers,
    tlRosterTeamName,
    user?.avatar,
    user?.department,
    user?.gdc_id,
    user?.name,
    user?.role,
    user?.team_name,
  ]);
  const tlTeamMembers = useMemo(() => tlRosterEmployees, [tlRosterEmployees]);
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
    const lateMarks = tlMyAttendanceLogs.filter((row) => row.status === 'L' || row.status === 'Late').length;
    const presentDays = tlMyAttendanceLogs.filter((row) => Number(row.hours) > 0).length;
    const workingDays = Math.max(timesheetDays.length, 1);
    const attendancePct = Math.round((presentDays / workingDays) * 1000) / 10;
    return { totalHours, overtime, lateMarks, attendancePct, presentDays, workingDays };
  }, [tlMyAttendanceLogs, timesheetDays.length]);
  const tlMyAttendanceEntry = useMemo(() => {
    if (!tlProfile) return null;
    const rows = buildAttendanceRows([tlProfile], timesheetDays, timesheetLogs);
    return rows[0] || null;
  }, [timesheetDays, tlProfile, timesheetLogs]);
  const tlTeamOverviewRows = useMemo(() => {
    const q = tlTeamSearch.trim().toLowerCase();
    const apiByGdc = new Map(attendanceRows.map((r) => [r.gdcId, r]));
    const rows = tlTeamMembers.map((m) => {
      const api = apiByGdc.get(m.gdcId);
      if (api) {
        return {
          ...api,
          name: m.name || api.name,
          avatarUrl: m.avatarUrl || api.avatarUrl,
          team: m.team || api.team,
          role: m.role || api.role,
        };
      }
      const built = buildAttendanceRows([m], timesheetDays, timesheetLogs)[0];
      if (built) return built;
      return {
        ...m,
        cells: timesheetWindow === '30d' ? [] : timesheetDays.map(() => 'A'),
        counts:
          timesheetWindow === '30d'
            ? { present: 0, late: 0, absent: timesheetDays.length }
            : undefined,
      };
    });
    return rows.filter((row) =>
      !q ? true : `${row.name} ${row.gdcId}`.toLowerCase().includes(q),
    );
  }, [
    attendanceRows,
    timesheetDays,
    timesheetLogs,
    timesheetWindow,
    tlTeamMembers,
    tlTeamSearch,
  ]);
  const tlProviderFilterOptions = useMemo(() => ['all', 'Employee'], []);

  const tlTeamRecordDepartmentOptions = useMemo(() => {
    const depts = new Set();
    tlTeamMembers.forEach((u) => {
      const t = String(u.team || '').trim();
      if (t && t !== '—') depts.add(t);
    });
    timesheetLogs.forEach((l) => {
      const t = String(l.team || l.department || '').trim();
      if (t && t !== '—') depts.add(t);
    });
    return ['all', ...Array.from(depts).sort((a, b) => a.localeCompare(b))];
  }, [tlTeamMembers, timesheetLogs]);

  const tlFilteredTeamRecords = useMemo(() => {
    const usersById = new Map(tlTeamMembers.map((u) => [u.gdcId, u]));
    const rosterGdc = new Set(tlTeamMembers.map((m) => m.gdcId));
    const from = recordFromDate || '';
    const to = recordToDate || '';
    const q = recordSearch.trim().toLowerCase();
    return timesheetLogs
      .filter((rec) => rec.source === 'clock' && rosterGdc.has(rec.gdcId))
      .filter((rec) => (!from || rec.date >= from) && (!to || rec.date <= to))
      .filter((rec) => {
        const u = usersById.get(rec.gdcId);
        if (!u) return false;
        if (recordProviderFilter !== 'all' && u.role !== recordProviderFilter) return false;
        const dept = String(u.team || rec.department || '').trim();
        if (recordDepartmentFilter !== 'all' && dept !== recordDepartmentFilter) return false;
        if (!q) return true;
        return `${u.name} ${u.gdcId} ${dept} ${rec.id}`.toLowerCase().includes(q);
      })
      .map((rec) => {
        const u = usersById.get(rec.gdcId);
        const avatarUrl = rec.avatarUrl || u?.avatarUrl || null;
        return {
          ...rec,
          avatarUrl,
          user: u ? { ...u, avatarUrl } : undefined,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [
    recordDepartmentFilter,
    recordFromDate,
    recordProviderFilter,
    recordSearch,
    recordToDate,
    timesheetLogs,
    tlTeamMembers,
  ]);

  const tlRecordExportQuery = useMemo(() => {
    const recordRole =
      recordProviderFilter !== 'all' ? apiRoleFromDisplayFilter(recordProviderFilter) : 'employee';
    const teamDept = String(tlRosterTeamName || tlProfile?.team || '').trim();
    const q = recordSearch.trim();
    return {
      ...(recordFromDate ? { from: recordFromDate } : {}),
      ...(recordToDate ? { to: recordToDate } : {}),
      ...(recordRole && recordRole !== 'ALL' ? { role: recordRole } : { role: 'employee' }),
      ...(recordDepartmentFilter !== 'all'
        ? { department: recordDepartmentFilter }
        : teamDept
          ? { department: teamDept }
          : {}),
      ...(q ? { gdc_id: q } : {}),
    };
  }, [
    recordDepartmentFilter,
    recordFromDate,
    recordProviderFilter,
    recordSearch,
    recordToDate,
    tlProfile?.team,
    tlRosterTeamName,
  ]);

  const filteredAvailabilityUsers = useMemo(() => {
    const q = availabilitySearch.trim().toLowerCase();
    return availabilityUsers.filter((u) => {
      if (availabilityRoleFilter !== 'all' && u.role !== availabilityRoleFilter) return false;
      const card = u.cardStatus || (u.status === 'Leave' ? 'leave' : u.status === 'Available' ? 'present' : 'offline');
      if (availabilityStatusFilter !== 'all' && card !== availabilityStatusFilter) return false;
      if (availabilityQuickFilter !== 'all' && card !== availabilityQuickFilter) return false;
      if (!q) return true;
      return `${u.name} ${u.gdcId} ${u.team} ${u.role} ${u.status} ${u.email || ''}`.toLowerCase().includes(q);
    });
  }, [
    availabilityQuickFilter,
    availabilityRoleFilter,
    availabilitySearch,
    availabilityStatusFilter,
    availabilityUsers,
  ]);

  const availabilitySummary = useMemo(() => {
    const present = filteredAvailabilityUsers.filter((u) => (u.cardStatus || '') === 'present').length;
    const away = filteredAvailabilityUsers.filter((u) => (u.cardStatus || '') === 'away').length;
    const leave = filteredAvailabilityUsers.filter((u) => (u.cardStatus || '') === 'leave').length;
    const offline = filteredAvailabilityUsers.filter((u) => (u.cardStatus || '') === 'offline').length;
    const total = filteredAvailabilityUsers.length;
    const pct = (n) => (total > 0 ? Math.round((n / total) * 100) : 0);
    return { total, present, away, leave, offline, pct };
  }, [filteredAvailabilityUsers]);

  const availabilityLogRange = useMemo(() => {
    if (availabilityFromDate || availabilityToDate) {
      return { start: availabilityFromDate || '', end: availabilityToDate || '' };
    }
    return getAvailabilityLogRange(availabilityLogPreset);
  }, [availabilityFromDate, availabilityToDate, availabilityLogPreset]);

  const filteredMyAvailabilityLog = useMemo(
    () => filterAvailabilityLogByRange(myAvailabilityLog, availabilityLogRange.start, availabilityLogRange.end),
    [availabilityLogRange.end, availabilityLogRange.start, myAvailabilityLog],
  );

  const myLeaveRequests = useMemo(() => {
    if (!user) return [];
    return filterMyOwnRequests(leaveRequests, user);
  }, [leaveRequests, user]);

  const myAvailabilityKpis = useMemo(
    () =>
      computeMyAvailabilityKpis(filteredMyAvailabilityLog, myLeaveRequests, {
        gdcId: user?.gdc_id,
        name: user?.name,
      }),
    [filteredMyAvailabilityLog, myLeaveRequests, user?.gdc_id, user?.name],
  );

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
    return filterMyOwnRequests(manualRequests, user);
  }, [manualRequests, user]);

  const filteredMyManualRequests = useMemo(() => {
    if (manualStatusFilter === 'All') return myManualRequests;
    return myManualRequests.filter((r) => r.status === manualStatusFilter);
  }, [manualStatusFilter, myManualRequests]);

  const filteredMyLeaveRequestsBoard = useMemo(() => {
    const q = requestAdminSearch.trim().toLowerCase();
    let list =
      leaveStatusFilter === 'All' ? myLeaveRequests : myLeaveRequests.filter((r) => r.status === leaveStatusFilter);
    if (!q) return list;
    return list.filter((r) =>
      `${r.employee} ${r.role} ${r.team} ${r.type} ${r.reason} ${r.gdcId}`.toLowerCase().includes(q),
    );
  }, [leaveStatusFilter, myLeaveRequests, requestAdminSearch]);

  const filteredMyManualRequestsBoard = useMemo(() => {
    const q = requestAdminSearch.trim().toLowerCase();
    let list =
      manualStatusFilter === 'All'
        ? myManualRequests
        : myManualRequests.filter((r) => r.status === manualStatusFilter);
    if (!q) return list;
    return list.filter((r) =>
      `${r.employee} ${r.role} ${r.team} ${r.reason} ${r.gdcId} ${r.date}`.toLowerCase().includes(q),
    );
  }, [manualStatusFilter, myManualRequests, requestAdminSearch]);

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

  const applyShiftFromApi = useCallback((raw) => {
    const current = normalizeShiftPayload(raw);
    if (!current) return;
    if (current.effective_date) setShiftDate(String(current.effective_date).slice(0, 10));
    if (current.shift_start) setShiftStart(amPmFromApiTime(current.shift_start));
    if (current.shift_end) setShiftEnd(amPmFromApiTime(current.shift_end));
    if (current.break_start) setShiftBreakStart(amPmFromApiTime(current.break_start));
    else setShiftBreakStart('');
    if (typeof current.break_duration_minutes === 'number') {
      setShiftBreakDuration(minutesToBreakInput(current.break_duration_minutes));
    }
    if (current.timezone) setShiftTimezone(String(current.timezone));
    const sid = current.shift_id ?? current.id;
    if (sid != null) setShiftId(Number(sid));
    if (typeof current.is_enabled === 'boolean') setShiftEnabled(current.is_enabled);
    if (current.updated_at) setShiftLastUpdatedAt(String(current.updated_at));
    if (current.updated_by_name) setShiftLastUpdatedBy(String(current.updated_by_name));
    setShiftLateAfter(Number(current.late_after_minutes ?? 15));
    setShiftClockInCutoff(Number(current.clock_in_cutoff_minutes ?? 60));
    setShiftGraceBefore(Number(current.grace_before_start_minutes ?? 5));
    setShiftMinHours(Number(current.minimum_working_hours ?? 4));
    setShiftAutoCheckout(Number(current.auto_checkout_after_hours ?? 12));
    setShiftWorkWeekDays(
      Array.isArray(current.work_week_days) && current.work_week_days.length
        ? [...current.work_week_days]
        : [...DEFAULT_WORK_WEEK_DAYS],
    );
    setShiftHolidays(Array.isArray(current.holiday_dates) ? [...current.holiday_dates] : []);
  }, []);

  const loadTimeControl = useCallback(
    async (asOf) => {
      if (!token || !isAdminRole(user?.role)) return;
      setShiftLoading(true);
      try {
        const day = asOf || todayDateInput();
        const [status, current, control] = await Promise.all([
          getShiftStatus(token, day).catch(() => ({ shift_id: null, is_enabled: false })),
          getCurrentShift(token, day).catch(() => null),
          getAttendanceControlSettings(token).catch(() => null),
        ]);
        setShiftEnabled(Boolean(status.is_enabled));
        if (status.shift_id != null) setShiftId(status.shift_id);
        if (current) applyShiftFromApi(current);
        if (control) {
          setShiftControlSnapshot(control);
          setLiveShiftNotifications(Boolean(control.live_shift_notifications_enabled));
        }
      } catch (e) {
        Alert.alert('Time Control', e?.message ?? 'Could not load shift config');
      } finally {
        setShiftLoading(false);
      }
    },
    [token, user?.role, applyShiftFromApi],
  );

  useEffect(() => {
    if (slug !== 'admin' || !isAdminRole(user?.role) || !token) return;
    if (adminControlTab !== 'time') return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(shiftDate || ''))) return;
    void loadTimeControl(shiftDate);
  }, [slug, adminControlTab, token, user?.role, shiftDate, loadTimeControl]);

  const toggleShiftWorkWeekDay = useCallback((day) => {
    setShiftWorkWeekDays((prev) => {
      const next = prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day];
      return next.length ? [...new Set(next)].sort((a, b) => a - b) : [...DEFAULT_WORK_WEEK_DAYS];
    });
  }, []);

  const addShiftHoliday = useCallback(() => {
    const iso = String(shiftHolidayDraft || '').trim().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      Alert.alert('Holiday', 'Use YYYY-MM-DD format.');
      return;
    }
    setShiftHolidays((prev) => (prev.includes(iso) ? prev : [...prev, iso].sort()));
    setShiftHolidayDraft('');
  }, [shiftHolidayDraft]);

  const removeShiftHoliday = useCallback((iso) => {
    setShiftHolidays((prev) => prev.filter((d) => d !== iso));
  }, []);

  const toggleShiftEnabled = useCallback(
    async (next) => {
      try {
        await setShiftStatus(token, { shift_id: shiftId ?? 1, is_enabled: next });
        setShiftEnabled(next);
      } catch (e) {
        Alert.alert('Shift status', e?.message ?? 'Could not update');
      }
    },
    [token, shiftId],
  );

  useEffect(() => {
    if (slug !== 'admin' || adminControlTab !== 'time') return;
    if (!token || !shiftControlSnapshot) return;
    const timer = setTimeout(() => {
      void setAttendanceControlSettings(token, {
        ...shiftControlSnapshot,
        live_shift_notifications_enabled: liveShiftNotifications,
      }).catch(() => undefined);
    }, 400);
    return () => clearTimeout(timer);
  }, [liveShiftNotifications, shiftControlSnapshot, slug, adminControlTab, token]);

  const handleSaveShiftTiming = async () => {
    if (!token || !shiftDate || !shiftStart || !shiftEnd || shiftSaveLoading) return;
    const startApi = apiTimeFromAmPm(shiftStart);
    const endApi = apiTimeFromAmPm(shiftEnd);
    const [sh, sm] = String(startApi).split(':').map((x) => Number.parseInt(x, 10));
    const [eh, em] = String(endApi).split(':').map((x) => Number.parseInt(x, 10));
    if (Number.isNaN(sh) || Number.isNaN(sm) || Number.isNaN(eh) || Number.isNaN(em)) {
      Alert.alert('Shift', 'Enter valid office start/end times.');
      return;
    }
    if (eh * 60 + em <= sh * 60 + sm) {
      Alert.alert('Shift', 'Office end must be after office start.');
      return;
    }
    const breakMinutes = breakInputToMinutes(shiftBreakDuration);
    if (breakMinutes == null) {
      Alert.alert('Shift', 'Enter break length as HH:MM (e.g. 00:30).');
      return;
    }
    if (String(shiftBreakStart || '').trim() && breakMinutes <= 0) {
      Alert.alert('Shift', 'Set a break length when break start is configured.');
      return;
    }
    if (!shiftWorkWeekDays.length) {
      Alert.alert('Shift', 'Select at least one working day.');
      return;
    }
    if (shiftClockInCutoff < shiftLateAfter) {
      Alert.alert('Shift', 'Clock-in cutoff must be at or after the late mark window.');
      return;
    }
    setShiftSaveLoading(true);
    try {
      const saved = await saveShiftTiming(token, {
        shift_start: startApi,
        shift_end: endApi,
        effective_date: shiftDate,
        break_start: String(shiftBreakStart || '').trim()
          ? apiTimeFromAmPm(shiftBreakStart)
          : null,
        break_duration_minutes: breakMinutes,
        timezone: shiftTimezone,
        late_after_minutes: shiftLateAfter,
        clock_in_cutoff_minutes: shiftClockInCutoff,
        grace_before_start_minutes: shiftGraceBefore,
        minimum_working_hours: shiftMinHours,
        auto_checkout_after_hours: shiftAutoCheckout,
        work_week_days: shiftWorkWeekDays,
        holiday_dates: shiftHolidays,
      });
      applyShiftFromApi(saved);
      setShiftLastUpdatedAt(new Date().toISOString());
      setShiftLastUpdatedBy(user?.name || 'Admin');
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
        else if (target === 'end') setShiftEnd(formatted);
        else if (target === 'break') setShiftBreakStart(formatted);
      },
      mode: 'time',
      is24Hour: false,
    });
  };

  const openShiftBreakStartPicker = () => openShiftTimePicker('break');

  const openHolidayDatePicker = () => {
    const parsed = shiftHolidayDraft ? new Date(`${shiftHolidayDraft}T00:00:00`) : new Date();
    const safe = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
    DateTimePickerAndroid.open({
      value: safe,
      onChange: (_event, selected) => {
        if (selected) setShiftHolidayDraft(formatDateISO(selected));
      },
      mode: 'date',
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
    if (!canCreateProject) {
      Alert.alert('Projects', 'You are not allowed to create projects.');
      return;
    }
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

    const resolveAssigneeId = () => {
      if (taskAssigneeUserId != null && Number.isFinite(Number(taskAssigneeUserId))) return Number(taskAssigneeUserId);
      const trimmed = taskAssignee.trim().toLowerCase();
      const pool = assignableUsersForCreate.length ? assignableUsersForCreate : hrAssignableUsers;
      const row = pool.find((u) => String(u.name || '').trim().toLowerCase() === trimmed);
      return row && row.id != null ? Number(row.id) : null;
    };

    if (editingTaskId) {
      const existing = projectTasks.find((t) => t.id === editingTaskId);
      if (!canManagePendingProjectTask(existing)) {
        Alert.alert('Tasks', 'You cannot edit this task.');
        return;
      }
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
        const aid = resolveAssigneeId();
        if (aid) patch.assigned_to = aid;
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

    if (!canCreateProject) {
      Alert.alert('Tasks', 'You are not allowed to create projects.');
      return;
    }
    const assignedTo = resolveAssigneeId();
    if (!Number.isFinite(assignedTo)) {
      Alert.alert('Assign to', 'Choose someone from the Assign to dropdown.');
      return;
    }
    if (!taskAttachmentUri) {
      Alert.alert('Attachment', 'An attachment is required when creating a project.');
      return;
    }
    setSaveProjectTaskPhase('saving');
    try {
      await createTaskApi(token, {
        title,
        assigned_to: assignedTo,
        deadline,
        description: taskDescription.trim() || undefined,
        attachmentUri: taskAttachmentUri,
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
    if (!canManagePendingProjectTask(task)) return;
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
    if (!canManagePendingProjectTask(task)) {
      Alert.alert('Tasks', 'You cannot delete this task.');
      return;
    }
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
    if (myAvailabilityToday?.status) return myAvailabilityToday.status;
    if (!user?.role) return 'Available';
    const gdc = user?.gdc_id ? String(user.gdc_id).trim() : '';
    const match =
      (gdc ? availabilityUsers.find((u) => u.gdcId === gdc) : null) ||
      availabilityUsers.find((u) => u.name === user?.name && u.role === user.role) ||
      availabilityUsers[0];
    return match?.status || 'Available';
  }, [availabilityUsers, myAvailabilityToday, user?.gdc_id, user?.name, user?.role]);
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

  if (slug === 'team-data') {
    return <Redirect href="/dashboard/(tabs)/route/team-tl" />;
  }

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
        projectTeamFilter={projectTeamFilter}
        setProjectTeamFilter={setProjectTeamFilter}
        projectTeamMenuOpen={projectTeamMenuOpen}
        setProjectTeamMenuOpen={setProjectTeamMenuOpen}
        projectTeamOptions={projectTeamOptions}
        showTeamInProjects={showTeamInProjects}
        projectManagerStats={projectManagerStats}
        canCreateProject={canCreateProject}
        projectFromDate={projectFromDate}
        setProjectFromDate={setProjectFromDate}
        projectToDate={projectToDate}
        setProjectToDate={setProjectToDate}
        openCreateProjectTaskModal={openCreateProjectTaskModal}
        closeProjectTaskModal={closeProjectTaskModal}
        projectTasksLoading={projectTasksLoading}
        filteredProjectTasks={filteredProjectTasksEnriched}
        setSelectedProjectTask={setSelectedProjectTask}
        handleEditProjectTask={handleEditProjectTask}
        handleDeleteProjectTask={handleDeleteProjectTask}
        canManagePendingProjectTask={canManagePendingProjectTask}
        getProjectTaskDisplayStatus={getProjectTaskDisplayStatus}
        getProjectCardAssignment={getProjectCardAssignment}
        formatTaskRef={formatTaskRef}
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
        assignableUsersForCreate={assignableUsersForCreate}
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
          tlFilteredTeamRecords,
          tlRecordExportQuery,
          tlTeamRecordDepartmentOptions,
          tlProviderFilterOptions,
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
          router,
          availabilityTab,
          setAvailabilityTab,
          setAvailabilityRoleFilter,
          availabilityRoleFilter,
          setAvailabilityStatusFilter,
          availabilityStatusFilter,
          availabilityQuickFilter,
          setAvailabilityQuickFilter,
          availabilitySearch,
          setAvailabilitySearch,
          filteredAvailabilityUsers,
          availabilitySummary,
          currentAvailabilityStatus,
          myAvailabilityToday,
          myAvailabilitySummary,
          myAvailabilityKpis,
          availabilityLogPreset,
          setAvailabilityLogPreset,
          setAvailabilityFromDate,
          setAvailabilityToDate,
          openAvailabilityDatePicker,
          availabilityFromDate,
          availabilityToDate,
          filteredMyAvailabilityLog,
          myAvailabilityLog,
          availabilityShift,
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
          openShiftBreakStartPicker,
          openHolidayDatePicker,
          handleSaveShiftTiming,
          shiftSaveLoading,
          shiftLoading,
          shiftTimezone,
          setShiftTimezone,
          shiftWorkWeekDays,
          toggleShiftWorkWeekDay,
          shiftBreakStart,
          setShiftBreakStart,
          shiftBreakDuration,
          setShiftBreakDuration,
          shiftLateAfter,
          setShiftLateAfter,
          shiftClockInCutoff,
          setShiftClockInCutoff,
          shiftGraceBefore,
          setShiftGraceBefore,
          shiftMinHours,
          setShiftMinHours,
          shiftAutoCheckout,
          setShiftAutoCheckout,
          shiftHolidays,
          shiftHolidayDraft,
          setShiftHolidayDraft,
          addShiftHoliday,
          removeShiftHoliday,
          shiftEnabled,
          toggleShiftEnabled,
          liveShiftNotifications,
          setLiveShiftNotifications,
          shiftLastUpdatedAt,
          shiftLastUpdatedBy,
          timezoneMenuOpen,
          setTimezoneMenuOpen,
          newDepartment,
          setNewDepartment,
          handleAddDepartment,
          deptAddLoading,
          departments,
          setDepartments,
          portalClients,
          portalStats,
          portalSearch,
          setPortalSearch,
          portalLoading,
          portalAddOpen,
          setPortalAddOpen,
          portalCompanyName,
          setPortalCompanyName,
          portalContactName,
          setPortalContactName,
          portalContactEmail,
          setPortalContactEmail,
          portalSaving,
          portalActionKey,
          portalShareClientId,
          setPortalShareClientId,
          portalShareType,
          setPortalShareType,
          portalShareTitle,
          setPortalShareTitle,
          portalShareSummary,
          setPortalShareSummary,
          handleCreatePortalClient,
          handleDeletePortalClient,
          handleInvitePortalClient,
          handleCreatePortalShare,
          refreshPortalClients: fetchPortalClients,
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

  if (slug === 'team-tl') {
    return (
      <TeamTlSection
        styles={styles}
        teamRosterTeams={teamRosterTeams}
        teamRosterUsers={teamRosterUsers}
        canViewTeamRoster={isAdminOrHrRole(user?.role)}
        rosterLoading={teamTlRosterLoading}
        rosterError={teamTlRosterError}
        onRetryRoster={loadTeamTlRoster}
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
