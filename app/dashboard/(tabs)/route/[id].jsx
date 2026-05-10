import * as DocumentPicker from 'expo-document-picker';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Redirect, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Platform, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardTopbar } from '@/components/dashboard/topbar';
import { AvailabilitySection } from '@/components/dashboard/route-modules/availability-section';
import { AdminSection } from '@/components/dashboard/route-modules/admin-section';
import { DailyUpdatesSection } from '@/components/dashboard/route-modules/daily-updates-section';
import { ProjectManagerSection } from '@/components/dashboard/route-modules/project-manager-section';
import { RequestsSection } from '@/components/dashboard/route-modules/requests-section';
import {
  AVAILABILITY_USERS,
  LEAVE_REQUESTS,
  MANUAL_TIME_REQUESTS,
  MY_AVAILABILITY_LOG,
  PROJECT_TASKS,
  TIMESHEET_LOGS,
  TIMESHEET_USERS,
  TL_OPTIONS,
  TL_ROWS,
} from '@/components/dashboard/route-modules/route-detail-mock-data';
import routeDetailStyles from '@/components/dashboard/route-modules/route-detail-styles';
import { TeamTlSection } from '@/components/dashboard/route-modules/team-tl-section';
import { TimesheetSection } from '@/components/dashboard/route-modules/timesheet-section';
import { GDC_MODULES } from '@/constants/gdc-modules';
import { useAuth } from '@/context/auth-context';
import {
  approveUser,
  createDepartment,
  deleteDepartment,
  getAllUsers,
  getAssignableUsers,
  getPendingUsersList,
  getTeams,
  listDepartments,
  rejectUser,
  updateUserRole,
} from '@/services/api';
import {
  isApprovedRow,
  isVerifiedRow,
  normalizeApprovedUsersList,
  normalizePendingUsersList,
} from '@/utils/admin-api-response';
import { apiRoleFromDisplay, mapApprovedUserRow, mapPendingUserRow } from '@/utils/admin-directory';
import { buildTeamAssignmentRows } from '@/utils/build-team-assignments';
import { isAdminOrHrRole, isAdminRole } from '@/utils/roles';
import { normalizeTeamsList } from '@/utils/teams-api-response';

// --- Mock-data helpers (temporary until backend integration) ---
const makeMockGdcId = () => {
  const mid = Math.floor(100000 + Math.random() * 900000);
  const end = Math.floor(1 + Math.random() * 99)
    .toString()
    .padStart(2, '0');
  return `GDC-${mid}-${end}`;
};

const DEFAULT_HR_NAME = TIMESHEET_USERS.find((u) => u.role === 'HR')?.name || 'HR';
const DEFAULT_TL_NAME = TL_OPTIONS[0]?.name || 'Team Leader';

const normalizeProjectTask = (task) => {
  if (task.assignedRole && task.assignedToName) return task;
  const raw = String(task.assignee || '').toLowerCase();
  if (raw.includes('hr')) {
    return {
      ...task,
      assignedRole: 'HR',
      assignedToName: DEFAULT_HR_NAME,
      assignee: `HR: ${DEFAULT_HR_NAME}`,
      createdByRole: task.createdByRole || 'Admin',
    };
  }
  if (raw.includes('team leader')) {
    return {
      ...task,
      assignedRole: 'Team Leader',
      assignedToName: DEFAULT_TL_NAME,
      assignee: `TL: ${DEFAULT_TL_NAME}`,
      createdByRole: task.createdByRole || 'Admin',
    };
  }
  return {
    ...task,
    assignedRole: task.assignedRole || 'Employee',
    assignedToName: task.assignedToName || task.assignee || 'Unassigned',
    createdByRole: task.createdByRole || 'Admin',
  };
};

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
  const [memberSearch, setMemberSearch] = useState('');
  const [memberStatusFilter, setMemberStatusFilter] = useState('all');
  const [summarySearch, setSummarySearch] = useState('');
  const [teamFilter, setTeamFilter] = useState('all');
  const [projectTasks, setProjectTasks] = useState(() => PROJECT_TASKS.map(normalizeProjectTask));
  const [projectSearch, setProjectSearch] = useState('');
  const [projectStatusFilter, setProjectStatusFilter] = useState('all');
  const [projectFromDate, setProjectFromDate] = useState('');
  const [projectToDate, setProjectToDate] = useState('');
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [selectedProjectTask, setSelectedProjectTask] = useState(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskPriority, setTaskPriority] = useState('Medium');
  const [taskStatus, setTaskStatus] = useState('Pending');
  const [taskDeadline, setTaskDeadline] = useState('');
  const [taskAttachmentName, setTaskAttachmentName] = useState('');
  const [taskAttachmentUri, setTaskAttachmentUri] = useState('');
  const [forwardTlName, setForwardTlName] = useState('');
  const [forwardTlDropdownOpen, setForwardTlDropdownOpen] = useState(false);
  const [projectStatusMenuOpen, setProjectStatusMenuOpen] = useState(false);
  const [teamAssignments, setTeamAssignments] = useState([]);
  const [teamAssignSearch, setTeamAssignSearch] = useState('');
  const [teamTlRosterLoading, setTeamTlRosterLoading] = useState(false);
  const [teamTlRosterError, setTeamTlRosterError] = useState(null);
  const [adminControlTab, setAdminControlTab] = useState('employees');
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminUsersLoading, setAdminUsersLoading] = useState(false);
  const [adminRoleFilter, setAdminRoleFilter] = useState('All');
  const [adminUserSearch, setAdminUserSearch] = useState('');
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedAdminUserId, setSelectedAdminUserId] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [assignablePickList, setAssignablePickList] = useState([]);
  const [newDepartment, setNewDepartment] = useState('');
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
  const [requestStatusMenuOpen, setRequestStatusMenuOpen] = useState(false);
  const [availabilityUsers, setAvailabilityUsers] = useState(AVAILABILITY_USERS);
  const [availabilityRoleFilter, setAvailabilityRoleFilter] = useState('all');
  const [availabilityStatusFilter, setAvailabilityStatusFilter] = useState('all');
  const [availabilitySearch, setAvailabilitySearch] = useState('');
  const [hoveredAvailabilityStatus, setHoveredAvailabilityStatus] = useState(null);
  const [availabilityFromDate, setAvailabilityFromDate] = useState('2026-05-01');
  const [availabilityToDate, setAvailabilityToDate] = useState('2026-05-31');
  const [leaveRequests, setLeaveRequests] = useState(LEAVE_REQUESTS);
  const [manualRequests, setManualRequests] = useState(MANUAL_TIME_REQUESTS);
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

  useEffect(() => {
    if (slug !== 'project-manager' || !token) return;
    if (!isAdminOrHrRole(user?.role)) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await getAssignableUsers(token);
        const rows = normalizeApprovedUsersList(res);
        const names = rows.map((r) => r.name).filter(Boolean);
        if (!cancelled) setAssignablePickList(names);
      } catch {
        if (!cancelled) setAssignablePickList([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, token, user?.role]);

  const loadTeamTlRoster = useCallback(async () => {
    if (!token || !isAdminOrHrRole(user?.role)) {
      setTeamAssignments([]);
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
      setTeamAssignments(buildTeamAssignmentRows(teams, userRows));
    } catch (e) {
      setTeamAssignments([]);
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
  }, [params.filter, params.status, params.tab, slug]);
  useEffect(() => {
    Animated.timing(forwardDropdownAnim, {
      toValue: forwardTlDropdownOpen ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [forwardDropdownAnim, forwardTlDropdownOpen]);

  const tlMembers = useMemo(
    () => [
      { name: 'Ahsan', status: 'Submitted' },
      { name: 'Nida', status: 'Submitted' },
      { name: 'Umair', status: 'Missing' },
      { name: 'Rabia', status: 'Submitted' },
    ],
    []
  );

  const filteredTlMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    let rows = tlMembers;
    if (q) rows = rows.filter((m) => m.name.toLowerCase().includes(q));
    if (memberStatusFilter !== 'all') rows = rows.filter((m) => m.status.toLowerCase() === memberStatusFilter);
    return rows;
  }, [tlMembers, memberSearch, memberStatusFilter]);

  const filteredTlRows = useMemo(() => {
    const q = summarySearch.trim().toLowerCase();
    let rows = TL_ROWS;
    if (q) rows = rows.filter((r) => `${r.team} ${r.lead} ${r.summary}`.toLowerCase().includes(q));
    return rows;
  }, [summarySearch]);

  const visibleProjectTasks = useMemo(() => {
    if (!user?.role) return projectTasks;
    if (isAdminRole(user.role)) return projectTasks;
    if (user.role === 'HR') {
      return projectTasks.filter(
        (task) =>
          task.assignedRole === 'HR' ||
          (task.forwardedBy === user.name && task.assignedRole === 'Team Leader')
      );
    }
    if (user.role === 'Team Leader') {
      return projectTasks.filter((task) => {
        const assigneeText = String(task.assignee || '').toLowerCase();
        // Demo-friendly TL visibility: show explicit TL tasks even if assignee name differs.
        if (task.assignedRole === 'Team Leader' && task.assignedToName === user.name) return true;
        if (task.assignedRole === 'Team Leader') return true;
        if (assigneeText.includes('team leader') || assigneeText.startsWith('tl:')) return true;
        return task.forwardedTeam && String(task.forwardedTeam).trim().length > 0;
      });
    }
    return projectTasks.filter((task) => task.assignedRole === 'Employee');
  }, [projectTasks, user?.name, user?.role]);

  const filteredProjectTasks = useMemo(() => {
    const q = projectSearch.trim().toLowerCase();
    return visibleProjectTasks.filter((task) => {
      if (projectStatusFilter !== 'all' && task.status.toLowerCase() !== projectStatusFilter) return false;
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
    if (normalized === 'in progress') return styles.projectStatusProgress;
    if (normalized === 'review') return styles.projectStatusReview;
    if (normalized === 'submitted') return styles.projectStatusSubmitted;
    if (normalized === 'overdue') return styles.projectStatusOverdue;
    if (normalized === 'completed' || normalized === 'approved') return styles.projectStatusCompleted;
    return styles.projectStatusDefault;
  }, []);
  const hrAssignableUsers = useMemo(() => {
    if (isAdminRole(user?.role) && assignablePickList.length > 0) return assignablePickList;
    return TIMESHEET_USERS.filter((u) => u.role === 'HR').map((u) => u.name);
  }, [user?.role, assignablePickList]);

  const tlForwardPickList = useMemo(() => {
    if (user?.role === 'HR' && assignablePickList.length > 0) {
      return assignablePickList.map((name) => ({ name, team: '' }));
    }
    return TL_OPTIONS;
  }, [user?.role, assignablePickList]);
  const canForwardProjectTask =
    user?.role === 'HR' && selectedProjectTask?.status === 'Pending' && selectedProjectTask?.assignedRole === 'HR';
  const canStartProjectTask =
    user?.role === 'Team Leader' &&
    selectedProjectTask?.assignedRole === 'Team Leader' &&
    selectedProjectTask?.status === 'Pending' &&
    (!selectedProjectTask?.assignedToName || selectedProjectTask?.assignedToName === user?.name);
  const employeeNameByGdcId = useMemo(
    () => Object.fromEntries(TIMESHEET_USERS.map((entry) => [entry.gdcId, entry.name])),
    []
  );
  const filteredTeamAssignments = useMemo(() => {
    const q = teamAssignSearch.trim().toLowerCase();
    return teamAssignments.filter((row) => {
      if (!q) return true;
      return `${row.employee} ${row.email ?? ''} ${row.gdcId} ${row.team} ${row.department ?? ''} ${row.role ?? ''} ${row.tl}`
        .toLowerCase()
        .includes(q);
    });
  }, [teamAssignSearch, teamAssignments]);
  const groupedTeamAssignments = useMemo(() => {
    const byTl = new Map();
    for (const row of filteredTeamAssignments) {
      const key = row.tl || '—';
      if (!byTl.has(key)) byTl.set(key, []);
      byTl.get(key).push(row);
    }
    return [...byTl.entries()]
      .map(([tl, members]) => {
        const sorted = [...members].sort((a, b) => {
          if (a.role === 'Team Leader' && b.role !== 'Team Leader') return -1;
          if (a.role !== 'Team Leader' && b.role === 'Team Leader') return 1;
          return String(a.employee || '').localeCompare(String(b.employee || ''));
        });
        const teamNames = [...new Set(sorted.map((m) => m.team))];
        return { tl, members: sorted, teamNames };
      })
      .filter((g) => g.members.length > 0)
      .sort((a, b) => a.tl.localeCompare(b.tl));
  }, [filteredTeamAssignments]);

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

  const filteredTimesheetUsers = useMemo(() => {
    const q = timesheetSearch.trim().toLowerCase();
    return TIMESHEET_USERS.filter((u) => {
      if (timesheetRoleFilter !== 'all' && u.role !== timesheetRoleFilter) return false;
      if (!q) return true;
      return `${u.name} ${u.gdcId} ${u.team} ${u.role}`.toLowerCase().includes(q);
    });
  }, [timesheetRoleFilter, timesheetSearch]);

  const attendanceRows = useMemo(() => {
    return filteredTimesheetUsers.map((u) => {
      const cells = timesheetDays.map((day) => {
        const log = TIMESHEET_LOGS.find((l) => l.gdcId === u.gdcId && l.date === day);
        return log ? log.status : 'A';
      });
      const counts = cells.reduce(
        (acc, st) => {
          if (st === 'P') acc.present += 1;
          else if (st === 'L') acc.late += 1;
          else acc.absent += 1;
          return acc;
        },
        { present: 0, late: 0, absent: 0 }
      );
      return { ...u, cells, counts };
    });
  }, [filteredTimesheetUsers, timesheetDays]);

  const recordRouteTab = slug === 'clock-records' ? 'clock' : slug === 'manual-records' ? 'manual' : 'clock';
  const providerOptions = ['all', 'Employee', 'HR', 'Team Leader'];
  const providerFilterOptions = user?.role === 'HR' ? ['all', 'Employee', 'Team Leader'] : providerOptions;

  const filteredRecords = useMemo(() => {
    const usersById = new Map(TIMESHEET_USERS.map((u) => [u.gdcId, u]));
    return TIMESHEET_LOGS.filter((rec) => {
      if (recordRouteTab !== rec.source) return false;
      const u = usersById.get(rec.gdcId);
      if (!u) return false;
      if (recordProviderFilter !== 'all' && u.role !== recordProviderFilter) return false;
      if (recordFromDate && rec.date < recordFromDate) return false;
      if (recordToDate && rec.date > recordToDate) return false;
      const q = recordSearch.trim().toLowerCase();
      if (!q) return true;
      return `${u.name} ${u.gdcId} ${u.team} ${rec.id}`.toLowerCase().includes(q);
    }).map((rec) => ({ ...rec, user: usersById.get(rec.gdcId) }));
  }, [recordFromDate, recordProviderFilter, recordRouteTab, recordSearch, recordToDate]);
  const employeeProfile = useMemo(() => {
    if (user?.role !== 'Employee') return null;
    return TIMESHEET_USERS.find((u) => u.role === 'Employee' && u.name === user.name) || TIMESHEET_USERS.find((u) => u.role === 'Employee') || null;
  }, [user?.name, user?.role]);
  const employeeAttendanceLogs = useMemo(() => {
    if (!employeeProfile) return [];
    return TIMESHEET_LOGS.filter((log) => log.gdcId === employeeProfile.gdcId && timesheetDays.includes(log.date)).sort((a, b) => b.date.localeCompare(a.date));
  }, [employeeProfile, timesheetDays]);
  const employeeAttendanceSummary = useMemo(() => {
    const totalHours = employeeAttendanceLogs.reduce((sum, row) => sum + row.hours, 0);
    const overtime = employeeAttendanceLogs.reduce((sum, row) => sum + Math.max(0, row.hours - 8), 0);
    const lateMarks = employeeAttendanceLogs.filter((row) => row.status === 'L').length;
    return { totalHours, overtime, lateMarks };
  }, [employeeAttendanceLogs]);
  const employeeAttendanceEntry = useMemo(() => {
    if (!employeeProfile) return null;
    const cells = timesheetDays.map((day) => {
      const log = TIMESHEET_LOGS.find((l) => l.gdcId === employeeProfile.gdcId && l.date === day);
      return log ? log.status : 'A';
    });
    const counts = cells.reduce(
      (acc, st) => {
        if (st === 'P') acc.present += 1;
        else if (st === 'L') acc.late += 1;
        else acc.absent += 1;
        return acc;
      },
      { present: 0, late: 0, absent: 0 }
    );
    return { ...employeeProfile, cells, counts };
  }, [employeeProfile, timesheetDays]);
  const tlProfile = useMemo(() => {
    if (user?.role !== 'Team Leader') return null;
    return TIMESHEET_USERS.find((u) => u.role === 'Team Leader' && u.name === user.name) || TIMESHEET_USERS.find((u) => u.role === 'Team Leader') || null;
  }, [user?.name, user?.role]);
  const tlTeamMembers = useMemo(() => {
    if (!tlProfile) return [];
    return TIMESHEET_USERS.filter((u) => u.team === tlProfile.team && u.role !== 'Team Leader');
  }, [tlProfile]);
  const tlTeamMemberIds = useMemo(() => new Set(tlTeamMembers.map((m) => m.gdcId)), [tlTeamMembers]);
  const tlMyAttendanceLogs = useMemo(() => {
    if (!tlProfile) return [];
    return TIMESHEET_LOGS.filter((log) => log.gdcId === tlProfile.gdcId && timesheetDays.includes(log.date)).sort((a, b) => b.date.localeCompare(a.date));
  }, [timesheetDays, tlProfile]);
  const tlMyAttendanceSummary = useMemo(() => {
    const totalHours = tlMyAttendanceLogs.reduce((sum, row) => sum + row.hours, 0);
    const overtime = tlMyAttendanceLogs.reduce((sum, row) => sum + Math.max(0, row.hours - 8), 0);
    const lateMarks = tlMyAttendanceLogs.filter((row) => row.status === 'L').length;
    return { totalHours, overtime, lateMarks };
  }, [tlMyAttendanceLogs]);
  const tlMyAttendanceEntry = useMemo(() => {
    if (!tlProfile) return null;
    const cells = timesheetDays.map((day) => {
      const log = TIMESHEET_LOGS.find((l) => l.gdcId === tlProfile.gdcId && l.date === day);
      return log ? log.status : 'A';
    });
    const counts = cells.reduce(
      (acc, st) => {
        if (st === 'P') acc.present += 1;
        else if (st === 'L') acc.late += 1;
        else acc.absent += 1;
        return acc;
      },
      { present: 0, late: 0, absent: 0 }
    );
    return { ...tlProfile, cells, counts };
  }, [timesheetDays, tlProfile]);
  const tlTeamOverviewRows = useMemo(() => {
    const q = tlTeamSearch.trim().toLowerCase();
    return attendanceRows
      .filter((row) => tlTeamMemberIds.has(row.gdcId))
      .filter((row) => (!q ? true : `${row.name} ${row.gdcId}`.toLowerCase().includes(q)));
  }, [attendanceRows, tlTeamMemberIds, tlTeamSearch]);
  const tlTeamRecordRows = useMemo(() => {
    const q = tlRecordSearch.trim().toLowerCase();
    const usersById = new Map(TIMESHEET_USERS.map((u) => [u.gdcId, u]));
    return TIMESHEET_LOGS.filter((log) => tlTeamMemberIds.has(log.gdcId) && timesheetDays.includes(log.date))
      .filter((log) => {
        if (!q) return true;
        const u = usersById.get(log.gdcId);
        return `${u?.name ?? ''} ${u?.gdcId ?? ''} ${u?.team ?? ''}`.toLowerCase().includes(q);
      })
      .map((log) => ({ ...log, user: usersById.get(log.gdcId) }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [timesheetDays, tlRecordSearch, tlTeamMemberIds]);

  const filteredAvailabilityUsers = useMemo(() => {
    const q = availabilitySearch.trim().toLowerCase();
    return availabilityUsers.filter((u) => {
      if (availabilityRoleFilter !== 'all' && u.role !== availabilityRoleFilter) return false;
      if (availabilityStatusFilter !== 'all' && u.status !== availabilityStatusFilter) return false;
      if (!q) return true;
      return `${u.name} ${u.gdcId} ${u.team} ${u.role} ${u.status}`.toLowerCase().includes(q);
    });
  }, [availabilityRoleFilter, availabilitySearch, availabilityStatusFilter, availabilityUsers]);

  const availabilitySummary = useMemo(() => {
    const present = filteredAvailabilityUsers.filter((u) => u.status === 'Available').length;
    const absent = filteredAvailabilityUsers.filter((u) => u.status === 'Unavailable').length;
    const leave = filteredAvailabilityUsers.filter((u) => u.status === 'Leave').length;
    return { total: filteredAvailabilityUsers.length, present, absent, leave };
  }, [filteredAvailabilityUsers]);

  const filteredMyAvailabilityLog = useMemo(
    () => MY_AVAILABILITY_LOG.filter((r) => r.date >= availabilityFromDate && r.date <= availabilityToDate),
    [availabilityFromDate, availabilityToDate]
  );

  const myLeaveRequests = useMemo(() => {
    if (!user) return [];
    return leaveRequests.filter((r) => r.role === user.role);
  }, [leaveRequests, user]);

  const filteredAdminLeaveRequests = useMemo(() => {
    if (leaveStatusFilter === 'All') return leaveRequests;
    return leaveRequests.filter((r) => r.status === leaveStatusFilter);
  }, [leaveRequests, leaveStatusFilter]);

  const filteredMyLeaveRequests = useMemo(() => {
    if (leaveStatusFilter === 'All') return myLeaveRequests;
    return myLeaveRequests.filter((r) => r.status === leaveStatusFilter);
  }, [leaveStatusFilter, myLeaveRequests]);

  const myManualRequests = useMemo(() => {
    if (!user) return [];
    return manualRequests.filter((r) => r.role === user.role);
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

  const submitLeaveRequest = () => {
    if (!leaveFromDate || !leaveToDate) return;
    setLeaveRequests((prev) => [
      {
        id: `LR-${String(prev.length + 1).padStart(3, '0')}`,
        employee: user?.name || 'Employee',
        role: user?.role || 'Employee',
        type: leaveType,
        from: leaveFromDate,
        to: leaveToDate,
        reason: leaveReason || 'No reason',
        status: 'Pending',
      },
      ...prev,
    ]);
    setLeaveModalOpen(false);
    setLeaveType('Leave');
    setLeaveFromDate('');
    setLeaveToDate('');
    setLeaveReason('');
    setLeaveTypeDropdownOpen(false);
  };

  const submitManualRequest = () => {
    if (!manualDate || !manualClockIn || !manualClockOut) return;
    setManualRequests((prev) => [
      {
        id: `MR-${String(prev.length + 1).padStart(3, '0')}`,
        employee: user?.name || 'Employee',
        role: user?.role || 'Employee',
        date: manualDate,
        clockIn: manualClockIn,
        clockOut: manualClockOut,
        breakOut: manualBreakOut,
        reason: manualReason || 'No reason',
        status: 'Pending',
      },
      ...prev,
    ]);
    setManualModalOpen(false);
    setManualDate('');
    setManualClockIn('');
    setManualClockOut('');
    setManualBreakOut('');
    setManualReason('');
  };

  const updateLeaveStatus = (id, status, adminReason = '') => {
    setLeaveRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status, adminReason: adminReason || r.adminReason || '' } : r))
    );
  };

  const updateManualStatus = (id, status, adminReason = '') => {
    setManualRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status, adminReason: adminReason || r.adminReason || '' } : r))
    );
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
      updateManualStatus(rejectTargetId, 'Rejected', reason);
    } else {
      updateLeaveStatus(rejectTargetId, 'Rejected', reason);
    }
    setRejectModalOpen(false);
    setRejectTargetId(null);
    setRejectTargetType('leave');
    setRejectReason('');
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
    const member = adminUsers.find((m) => m.id != null && Number(m.id) === Number(selectedAdminUserId));
    if (!member || !token) return;
    const numericId = Number(member.id);
    if (user?.id != null && Number(user.id) === numericId) {
      Alert.alert('Not allowed', 'You cannot change your own role.');
      return;
    }
    if (member.role === 'Team Leader' && nextRoleDisplay === 'Employee') {
      Alert.alert('Not allowed', 'A team leader cannot be assigned the Employee role.');
      return;
    }
    const apiRole = apiRoleFromDisplay(nextRoleDisplay);
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
            try {
              await rejectUser(token, { userId: Number(member.id) });
              await fetchAdminDirectory();
            } catch (e) {
              const detail = e?.name === 'ApiError' && e?.status ? `${e.message} (HTTP ${e.status})` : e?.message;
              Alert.alert('Reject failed', detail ?? 'Could not reject user');
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
    if (!name || !token) return;
    try {
      await createDepartment(token, name);
      setNewDepartment('');
      await fetchDepartments();
    } catch (e) {
      Alert.alert('Add department', e?.message ?? 'Could not add department');
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
    setTaskPriority('Medium');
    setTaskStatus('Pending');
    setTaskDeadline('');
    setTaskAttachmentName('');
    setTaskAttachmentUri('');
    setForwardTlName('');
    setEditingTaskId(null);
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

  const handleCreateProjectTask = () => {
    const title = taskTitle.trim();
    const assignee = taskAssignee.trim();
    const deadline = taskDeadline.trim();
    if (!title || !assignee || !deadline) return;
    if (editingTaskId) {
      setProjectTasks((prev) =>
        prev.map((task) =>
          task.id === editingTaskId
            ? {
                ...task,
                title,
                description: taskDescription.trim() || 'No details provided.',
                assignee: `HR: ${assignee}`,
                assignedRole: 'HR',
                assignedToName: assignee,
                priority: taskPriority,
                status: taskStatus,
                deadline,
                attachmentName: taskAttachmentName,
                attachmentUri: taskAttachmentUri,
                gdcId: task.gdcId || makeMockGdcId(),
                createdByRole: task.createdByRole || 'Admin',
              }
            : task
        )
      );
    } else {
      setProjectTasks((prev) => [
        {
          id: `PM-${1000 + prev.length + 1}`,
          title,
          description: taskDescription.trim() || 'No details provided.',
          assignee: `HR: ${assignee}`,
          assignedRole: 'HR',
          assignedToName: assignee,
          priority: taskPriority,
          status: taskStatus,
          deadline,
          createdAt: new Date().toISOString().slice(0, 10),
          attachmentName: taskAttachmentName,
          attachmentUri: taskAttachmentUri,
          gdcId: makeMockGdcId(),
          createdByRole: 'Admin',
        },
        ...prev,
      ]);
    }
    setCreateTaskOpen(false);
    resetProjectForm();
  };

  const handleEditProjectTask = (task) => {
    setEditingTaskId(task.id);
    setTaskTitle(task.title);
    setTaskDescription(task.description);
    setTaskAssignee(task.assignedToName || task.assignee || '');
    setTaskPriority(task.priority || 'Medium');
    setTaskStatus(task.status || 'Pending');
    setTaskDeadline(task.deadline);
    setTaskAttachmentName(task.attachmentName || '');
    setTaskAttachmentUri(task.attachmentUri || '');
    setCreateTaskOpen(true);
  };

  const handleDeleteProjectTask = (taskId) => {
    setProjectTasks((prev) => prev.filter((task) => task.id !== taskId));
  };
  const handleForwardProjectToTl = () => {
    if (!selectedProjectTask || !forwardTlName || !canForwardProjectTask) return;
    const selectedTl = TL_OPTIONS.find((entry) => entry.name === forwardTlName);
    setProjectTasks((prev) =>
      prev.map((task) =>
        task.id === selectedProjectTask.id
          ? {
              ...task,
              assignedRole: 'Team Leader',
              assignedToName: forwardTlName,
              assignee: `TL: ${forwardTlName}`,
              forwardedBy: user?.name || 'HR',
              forwardedAt: new Date().toISOString(),
              forwardedTeam: selectedTl?.team || '',
            }
          : task
      )
    );
    setSelectedProjectTask((prev) =>
      prev
        ? {
            ...prev,
            assignedRole: 'Team Leader',
            assignedToName: forwardTlName,
            assignee: `TL: ${forwardTlName}`,
            forwardedBy: user?.name || 'HR',
            forwardedAt: new Date().toISOString(),
            forwardedTeam: selectedTl?.team || '',
          }
        : prev
    );
    setForwardTlName('');
    setForwardTlDropdownOpen(false);
  };
  const handleStartProjectTask = () => {
    if (!selectedProjectTask || !canStartProjectTask) return;
    setProjectTasks((prev) =>
      prev.map((task) =>
        task.id === selectedProjectTask.id
          ? {
              ...task,
              status: 'In Progress',
              startedBy: user?.name || 'Team Leader',
              startedAt: new Date().toISOString(),
            }
          : task
      )
    );
    setSelectedProjectTask((prev) =>
      prev
        ? {
            ...prev,
            status: 'In Progress',
            startedBy: user?.name || 'Team Leader',
            startedAt: new Date().toISOString(),
          }
        : prev
    );
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
        setCreateTaskOpen={setCreateTaskOpen}
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
        forwardTlDropdownOpen={forwardTlDropdownOpen}
        setForwardTlDropdownOpen={setForwardTlDropdownOpen}
        forwardDropdownAnim={forwardDropdownAnim}
        tlForwardOptions={tlForwardPickList}
        handleForwardProjectToTl={handleForwardProjectToTl}
        canStartProjectTask={canStartProjectTask}
        handleStartProjectTask={handleStartProjectTask}
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
          filteredRecords,
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
          updateManualStatus,
          updateLeaveStatus,
          openRejectModal,
          requestStatusMenuOpen,
          setRequestStatusMenuOpen,
          filteredMyManualRequests,
          filteredMyLeaveRequests,
          setManualModalOpen,
          setLeaveModalOpen,
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
        }}
      />
    );
  }

  if (slug === 'team-tl') {
    return (
      <TeamTlSection
        styles={styles}
        teamAssignSearch={teamAssignSearch}
        setTeamAssignSearch={setTeamAssignSearch}
        groupedTeamAssignments={groupedTeamAssignments}
        filteredTeamAssignments={filteredTeamAssignments}
        teamRosterTotal={teamAssignments.length}
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

const styles = routeDetailStyles;
