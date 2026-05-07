import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as DocumentPicker from 'expo-document-picker';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardTopbar } from '@/components/dashboard/topbar';
import { BrandColors } from '@/constants/brand';
import { GDC_MODULES } from '@/constants/gdc-modules';
import { useAuth } from '@/context/auth-context';

const TL_ROWS = [
  { team: 'Blue Team', lead: 'Ali Raza', summary: 'Delivery on track, one blocker in API integration.' },
  { team: 'Growth Team', lead: 'Sana Noor', summary: 'Campaign assets delivered, pending legal review.' },
  { team: 'Support Team', lead: 'Awais', summary: 'Ticket SLA improved and escalations reduced.' },
];

const TIMESHEET_USERS = [
  { gdcId: 'GDC-345678-01', name: 'Ali Raza', role: 'Team Leader', team: 'Blue Team' },
  { gdcId: 'GDC-345678-02', name: 'Sana Noor', role: 'HR', team: 'Operations' },
  { gdcId: 'GDC-345678-03', name: 'Ahsan', role: 'Employee', team: 'Support Team' },
  { gdcId: 'GDC-345678-04', name: 'Rabia', role: 'Employee', team: 'Blue Team' },
  { gdcId: 'GDC-345678-05', name: 'Umair', role: 'Employee', team: 'Support Team' },
  { gdcId: 'GDC-345678-06', name: 'Nida', role: 'Employee', team: 'Growth Team' },
];

const TIMESHEET_LOGS = [
  { id: 'CLK-001', gdcId: 'GDC-345678-01', date: '2026-05-05', checkIn: '09:12', checkOut: '18:26', hours: 8.9, status: 'L', source: 'clock' },
  { id: 'CLK-002', gdcId: 'GDC-345678-02', date: '2026-05-05', checkIn: '08:57', checkOut: '18:05', hours: 9.1, status: 'P', source: 'clock' },
  { id: 'CLK-003', gdcId: 'GDC-345678-03', date: '2026-05-04', checkIn: '09:00', checkOut: '17:52', hours: 8.3, status: 'P', source: 'clock' },
  { id: 'CLK-004', gdcId: 'GDC-345678-04', date: '2026-05-03', checkIn: '09:20', checkOut: '18:02', hours: 8.2, status: 'L', source: 'clock' },
  { id: 'CLK-005', gdcId: 'GDC-345678-05', date: '2026-05-01', checkIn: '08:49', checkOut: '17:58', hours: 9.0, status: 'P', source: 'clock' },
  { id: 'MAN-001', gdcId: 'GDC-345678-03', date: '2026-05-02', checkIn: '09:35', checkOut: '18:00', hours: 7.9, status: 'L', source: 'manual' },
  { id: 'MAN-002', gdcId: 'GDC-345678-06', date: '2026-05-05', checkIn: '09:06', checkOut: '18:01', hours: 8.4, status: 'L', source: 'manual' },
];

const AVAILABILITY_USERS = [
  { gdcId: 'GDC-345678-01', name: 'Ali Raza', role: 'Team Leader', team: 'Blue Team', status: 'Available', active: true },
  { gdcId: 'GDC-345678-02', name: 'Sana Noor', role: 'HR', team: 'Operations', status: 'Leave', active: false },
  { gdcId: 'GDC-345678-03', name: 'Ahsan', role: 'Employee', team: 'Support Team', status: 'Unavailable', active: false },
  { gdcId: 'GDC-345678-04', name: 'Rabia', role: 'Employee', team: 'Blue Team', status: 'Available', active: true },
  { gdcId: 'GDC-345678-05', name: 'Umair', role: 'Employee', team: 'Support Team', status: 'Available', active: true },
];

const MY_AVAILABILITY_LOG = [
  { date: '2026-05-05', in: '09:03', out: '18:10', breaks: 1, hours: 8.6, status: 'Present' },
  { date: '2026-05-04', in: '09:18', out: '18:01', breaks: 2, hours: 8.1, status: 'Present' },
  { date: '2026-05-03', in: '--', out: '--', breaks: 0, hours: 0, status: 'Leave' },
  { date: '2026-05-02', in: '--', out: '--', breaks: 0, hours: 0, status: 'Absent' },
];

const LEAVE_REQUESTS = [
  { id: 'LR-001', employee: 'Ahsan', role: 'Employee', type: 'Leave', from: '2026-05-10', to: '2026-05-12', reason: 'Family event', status: 'Pending' },
  { id: 'LR-002', employee: 'Sana Noor', role: 'HR', type: 'Casual', from: '2026-05-15', to: '2026-05-15', reason: 'Personal work', status: 'Approved' },
  { id: 'LR-003', employee: 'Ali Raza', role: 'Team Leader', type: 'Paid', from: '2026-05-20', to: '2026-05-22', reason: 'Annual leave', status: 'Pending' },
];

const MANUAL_TIME_REQUESTS = [
  { id: 'MR-001', employee: 'Ahsan', role: 'Employee', date: '2026-05-02', clockIn: '09:35', clockOut: '18:00', reason: 'Internet outage in morning', status: 'Pending' },
  { id: 'MR-002', employee: 'Sana Noor', role: 'HR', date: '2026-05-01', clockIn: '09:10', clockOut: '18:15', reason: 'Biometric sync missed', status: 'Approved' },
];

const PROJECT_TASKS = [
  {
    id: 'PM-1001',
    gdcId: 'GDC-345678-01',
    title: 'CRM Dashboard KPI Integration',
    description: 'Integrate KPI APIs and validate role-level data visibility.',
    assignee: 'HR Team',
    priority: 'High',
    status: 'Pending',
    deadline: '2026-05-08',
    createdAt: '2026-05-04',
    attachmentName: '',
    attachmentUri: '',
  },
  {
    id: 'PM-1002',
    gdcId: 'GDC-345678-02',
    title: 'Mobile Chat Performance Optimization',
    description: 'Reduce list render lag and optimize message composer interactions.',
    assignee: 'Team Leader',
    priority: 'Medium',
    status: 'In Progress',
    deadline: '2026-05-10',
    createdAt: '2026-05-03',
    attachmentName: '',
    attachmentUri: '',
  },
  {
    id: 'PM-1003',
    gdcId: 'GDC-345678-03',
    title: 'Complaint Box Email Routing',
    description: 'Connect mail action with proper admin subject and metadata.',
    assignee: 'Employee Team',
    priority: 'Low',
    status: 'Review',
    deadline: '2026-05-12',
    createdAt: '2026-05-02',
    attachmentName: '',
    attachmentUri: '',
  },
];

const TL_LEADS = ['Ali Raza', 'Sana Noor', 'Awais'];
/** Full roster per TL — mirrors CRM web: name, role, department, team, email, GDC */
const TEAM_ASSIGNMENTS = [
  {
    id: 'TA-TL-01',
    gdcId: 'GDC-345678-01',
    employee: 'Ali Raza',
    email: 'ali.raza@gdc.com',
    role: 'Team Leader',
    team: 'Blue Team',
    department: 'Engineering',
    tl: 'Ali Raza',
  },
  {
    id: 'TA-02',
    gdcId: 'GDC-345678-04',
    employee: 'Rabia',
    email: 'rabia@gdc.com',
    role: 'Employee',
    team: 'Blue Team',
    department: 'Engineering',
    tl: 'Ali Raza',
  },
  {
    id: 'TA-TL-02',
    gdcId: 'GDC-345678-TL2',
    employee: 'Awais',
    email: 'awais@gdc.com',
    role: 'Team Leader',
    team: 'Support Team',
    department: 'Operations',
    tl: 'Awais',
  },
  {
    id: 'TA-03',
    gdcId: 'GDC-345678-03',
    employee: 'Ahsan',
    email: 'ahsan@gdc.com',
    role: 'Employee',
    team: 'Support Team',
    department: 'Operations',
    tl: 'Awais',
  },
  {
    id: 'TA-05',
    gdcId: 'GDC-345678-05',
    employee: 'Umair',
    email: 'umair@gdc.com',
    role: 'Employee',
    team: 'Support Team',
    department: 'Operations',
    tl: 'Awais',
  },
  {
    id: 'TA-TL-03',
    gdcId: 'GDC-345678-02',
    employee: 'Sana Noor',
    email: 'sana.noor@gdc.com',
    role: 'Team Leader',
    team: 'Growth Team',
    department: 'Marketing',
    tl: 'Sana Noor',
  },
  {
    id: 'TA-04',
    gdcId: 'GDC-345678-06',
    employee: 'Nida',
    email: 'nida@gdc.com',
    role: 'Employee',
    team: 'Growth Team',
    department: 'Marketing',
    tl: 'Sana Noor',
  },
];

const makeMockGdcId = () => {
  const mid = Math.floor(100000 + Math.random() * 900000);
  const end = Math.floor(1 + Math.random() * 99)
    .toString()
    .padStart(2, '0');
  return `GDC-${mid}-${end}`;
};

export default function RouteDetailScreen() {
  const params = useLocalSearchParams();
  const { id } = params;
  const router = useRouter();
  const { user } = useAuth();
  const slug = Array.isArray(id) ? id[0] : id;
  const route = useMemo(() => GDC_MODULES.find((m) => m.id === slug), [slug]);
  const [dateMode, setDateMode] = useState('today');
  const [employeeUpdate, setEmployeeUpdate] = useState('');
  const [leaderSummary, setLeaderSummary] = useState('');
  const [hrNote, setHrNote] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [memberStatusFilter, setMemberStatusFilter] = useState('all');
  const [summarySearch, setSummarySearch] = useState('');
  const [teamFilter, setTeamFilter] = useState('all');
  const [projectTasks, setProjectTasks] = useState(PROJECT_TASKS);
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
  const [teamAssignments, setTeamAssignments] = useState(TEAM_ASSIGNMENTS);
  const [teamAssignSearch, setTeamAssignSearch] = useState('');
  const [adminControlTab, setAdminControlTab] = useState('employees');
  const [adminUsers, setAdminUsers] = useState(() =>
    TIMESHEET_USERS.map((u) => {
      const email = `${u.name.toLowerCase().replace(/\s+/g, '.')}@gmail.com`;
      return {
        ...u,
        email,
        accountStatus: u.gdcId === 'GDC-345678-03' ? 'Pending' : 'Active',
      };
    })
  );
  const [adminRoleFilter, setAdminRoleFilter] = useState('All');
  const [adminUserSearch, setAdminUserSearch] = useState('');
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedAdminUserId, setSelectedAdminUserId] = useState(null);
  const [departments, setDepartments] = useState(['Frontend Developer', 'MERN Stack', 'SEO', 'Support']);
  const [newDepartment, setNewDepartment] = useState('');
  const [timesheetWindow, setTimesheetWindow] = useState('7d');
  const [timesheetSearch, setTimesheetSearch] = useState('');
  const [timesheetRoleFilter, setTimesheetRoleFilter] = useState('all');
  const [recordProviderFilter, setRecordProviderFilter] = useState('all');
  const [recordSearch, setRecordSearch] = useState('');
  const [recordFromDate, setRecordFromDate] = useState('');
  const [recordToDate, setRecordToDate] = useState('');
  const [availabilityRoleFilter, setAvailabilityRoleFilter] = useState('all');
  const [availabilityStatusFilter, setAvailabilityStatusFilter] = useState('all');
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

  useEffect(() => {
    const tab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
    const filter = Array.isArray(params.filter) ? params.filter[0] : params.filter;
    const status = Array.isArray(params.status) ? params.status[0] : params.status;

    if (slug === 'admin') {
      if (tab) setAdminControlTab(String(tab));
      if (filter) setAdminRoleFilter(String(filter));
    }
    if (slug === 'request-management' && status) {
      setLeaveStatusFilter(String(status));
    }
    if (slug === 'manual-time-requests' && status) {
      setManualStatusFilter(String(status));
    }
  }, [params.filter, params.status, params.tab, slug]);

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
    if (teamFilter !== 'all') rows = rows.filter((r) => r.team === teamFilter);
    if (q) rows = rows.filter((r) => `${r.team} ${r.lead} ${r.summary}`.toLowerCase().includes(q));
    return rows;
  }, [summarySearch, teamFilter]);

  const filteredProjectTasks = useMemo(() => {
    const q = projectSearch.trim().toLowerCase();
    return projectTasks.filter((task) => {
      if (projectStatusFilter !== 'all' && task.status.toLowerCase() !== projectStatusFilter) return false;
      if (projectFromDate && task.deadline < projectFromDate) return false;
      if (projectToDate && task.deadline > projectToDate) return false;
      if (!q) return true;
      const haystack =
        `${task.id} ${task.title} ${task.description} ${task.assignee} ${task.priority} ${task.status} ${task.attachmentName ?? ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [projectFromDate, projectSearch, projectStatusFilter, projectTasks, projectToDate]);
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
    const groups = TL_LEADS.map((lead) => {
      const members = filteredTeamAssignments.filter((row) => row.tl === lead).sort((a, b) => {
        if (a.role === 'Team Leader' && b.role !== 'Team Leader') return -1;
        if (a.role !== 'Team Leader' && b.role === 'Team Leader') return 1;
        return a.employee.localeCompare(b.employee);
      });
      const teamNames = [...new Set(members.map((m) => m.team))];
      return { tl: lead, members, teamNames };
    });
    return groups.filter((group) => group.members.length > 0);
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

  const filteredAvailabilityUsers = useMemo(() => {
    return AVAILABILITY_USERS.filter((u) => {
      if (availabilityRoleFilter !== 'all' && u.role !== availabilityRoleFilter) return false;
      if (availabilityStatusFilter !== 'all' && u.status !== availabilityStatusFilter) return false;
      return true;
    });
  }, [availabilityRoleFilter, availabilityStatusFilter]);

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
        reason: manualReason || 'No reason',
        status: 'Pending',
      },
      ...prev,
    ]);
    setManualModalOpen(false);
    setManualDate('');
    setManualClockIn('');
    setManualClockOut('');
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

  const selectedAdminUser = useMemo(
    () => adminUsers.find((member) => member.gdcId === selectedAdminUserId) ?? null,
    [adminUsers, selectedAdminUserId]
  );

  const openRoleModal = (memberId) => {
    setSelectedAdminUserId(memberId);
    setRoleModalOpen(true);
  };

  const applyAdminRole = (nextRole) => {
    if (!selectedAdminUserId) return;
    setAdminUsers((prev) =>
      prev.map((member) =>
        member.gdcId === selectedAdminUserId ? { ...member, role: nextRole, accountStatus: 'Active' } : member
      )
    );
    setRoleModalOpen(false);
    setSelectedAdminUserId(null);
  };

  const handleAddDepartment = () => {
    const name = newDepartment.trim();
    if (!name) return;
    if (departments.some((d) => d.toLowerCase() === name.toLowerCase())) return;
    setDepartments((prev) => [...prev, name]);
    setNewDepartment('');
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
                assignee,
                priority: taskPriority,
                status: taskStatus,
                deadline,
                attachmentName: taskAttachmentName,
                attachmentUri: taskAttachmentUri,
                gdcId: task.gdcId || makeMockGdcId(),
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
          assignee,
          priority: taskPriority,
          status: taskStatus,
          deadline,
          createdAt: new Date().toISOString().slice(0, 10),
          attachmentName: taskAttachmentName,
          attachmentUri: taskAttachmentUri,
          gdcId: makeMockGdcId(),
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
    setTaskAssignee(task.assignee);
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
  const assignEmployeeToTl = (assignmentId, tlName) => {
    setTeamAssignments((prev) => prev.map((row) => (row.id === assignmentId ? { ...row, tl: tlName } : row)));
  };

  if (slug === 'daily-updates') {
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
                {dateMode === 'today' ? 'Today reporting' : 'Yesterday reporting'} -{' '}
                {new Date().toLocaleDateString()}
              </Text>
            </View>
          </View>

          <View style={styles.dateRow}>
            <Pressable style={[styles.dateChip, dateMode === 'today' && styles.dateChipActive]} onPress={() => setDateMode('today')}>
              <Text style={[styles.dateChipText, dateMode === 'today' && styles.dateChipTextActive]}>Today</Text>
            </Pressable>
            <Pressable
              style={[styles.dateChip, dateMode === 'yesterday' && styles.dateChipActive]}
              onPress={() => setDateMode('yesterday')}>
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
                <View style={styles.chipRow}>
                  {['all', 'Blue Team', 'Growth Team', 'Support Team'].map((t) => (
                    <Pressable key={t} onPress={() => setTeamFilter(t)} style={[styles.filterChip, teamFilter === t && styles.filterChipActive]}>
                      <Text style={[styles.filterChipText, teamFilter === t && styles.filterChipTextActive]}>
                        {t === 'all' ? 'All' : t.replace(' Team', '')}
                      </Text>
                    </Pressable>
                  ))}
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

          {user?.role === 'Admin' ? (
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Admin</Text>
              <Text style={styles.panelSub}>Overview of team lead summaries and HR leadership note.</Text>
              <View style={styles.statsRow}>
                <View style={styles.statPill}>
                  <Text style={styles.statPillLabel}>Teams</Text>
                  <Text style={styles.statPillValue}>3</Text>
                </View>
                <View style={styles.statPill}>
                  <Text style={styles.statPillLabel}>TL Summaries</Text>
                  <Text style={styles.statPillValue}>3</Text>
                </View>
              </View>
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

  if (slug === 'project-manager') {
    const total = filteredProjectTasks.length;
    const pending = filteredProjectTasks.filter((t) => t.status === 'Pending').length;
    const inProgress = filteredProjectTasks.filter((t) => t.status === 'In Progress').length;
    const review = filteredProjectTasks.filter((t) => t.status === 'Review').length;
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
              <Text style={styles.heroSub}>Admin task control with search, date filtering and quick actions.</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statPill}>
              <Text style={styles.statPillLabel}>Total</Text>
              <Text style={styles.statPillValue}>{total}</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statPillLabel}>Pending</Text>
              <Text style={styles.statPillValue}>{pending}</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statPillLabel}>Progress</Text>
              <Text style={styles.statPillValue}>{inProgress}</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statPillLabel}>Review</Text>
              <Text style={styles.statPillValue}>{review}</Text>
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
            <View style={[styles.chipRow, { marginTop: 8 }]}>
              {['all', 'pending', 'in progress', 'review', 'approved', 'completed'].map((status) => (
                <Pressable
                  key={status}
                  onPress={() => setProjectStatusFilter(status)}
                  style={[styles.filterChip, projectStatusFilter === status && styles.filterChipActive]}>
                  <Text style={[styles.filterChipText, projectStatusFilter === status && styles.filterChipTextActive]}>{status}</Text>
                </Pressable>
              ))}
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
            {user?.role === 'Admin' ? (
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
                <Pressable key={task.id} style={styles.projectCard} onPress={() => setSelectedProjectTask(task)}>
                  <View style={styles.projectCardTop}>
                    <Text style={styles.projectId}>{employeeNameByGdcId[task.gdcId] || task.assignee || 'Unassigned'}</Text>
                    <Text style={styles.projectDeadline}>{task.deadline}</Text>
                  </View>
                  <Text style={styles.projectTitle}>{task.title}</Text>
                  <Text style={styles.projectDesc}>{task.description}</Text>
                  <View style={styles.projectMetaRow}>
                    <Text style={styles.projectMetaText}>Assignee: {task.assignee}</Text>
                  </View>
                  {task.attachmentName ? <Text style={styles.projectLinkText}>Attachment: {task.attachmentName}</Text> : null}
                  <View style={styles.projectFooter}>
                    <View style={[styles.filterChip, styles.projectStatusChip]}>
                      <Text style={[styles.filterChipText, { color: '#1e3a8a' }]}>{task.status}</Text>
                    </View>
                    {user?.role === 'Admin' ? (
                      <View style={styles.taskActionRow}>
                        <Pressable
                          onPress={() => handleEditProjectTask(task)}
                          style={styles.editBtn}
                          onPressIn={(e) => e.stopPropagation()}>
                          <MaterialCommunityIcons name="pencil-outline" size={16} color="#fff" />
                        </Pressable>
                        <Pressable
                          onPress={() => handleDeleteProjectTask(task.id)}
                          style={styles.deleteBtn}
                          onPressIn={(e) => e.stopPropagation()}>
                          <MaterialCommunityIcons name="trash-can-outline" size={16} color="#fff" />
                        </Pressable>
                      </View>
                    ) : null}
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
              <TextInput
                value={taskTitle}
                onChangeText={setTaskTitle}
                placeholder="Task title"
                placeholderTextColor="#94a3b8"
                style={styles.input}
              />
              <TextInput
                value={taskAssignee}
                onChangeText={setTaskAssignee}
                placeholder="Assign to (e.g. HR Team)"
                placeholderTextColor="#94a3b8"
                style={styles.input}
              />
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

        <Modal
          visible={Boolean(selectedProjectTask)}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedProjectTask(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCardShell}>
              <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator>
                <View style={styles.modalCard}>
                  <Text style={styles.modalTitle}>Task Details</Text>
                  <Text style={styles.detailTitle}>{selectedProjectTask?.title}</Text>
                  <Text style={styles.detailText}>
                    Employee: {employeeNameByGdcId[selectedProjectTask?.gdcId] || selectedProjectTask?.assignee || 'Unassigned'}
                  </Text>
                  <Text style={styles.detailText}>Status: {selectedProjectTask?.status}</Text>
                  <Text style={styles.detailText}>Deadline: {selectedProjectTask?.deadline}</Text>
                  <Text style={styles.detailText}>Description:</Text>
                  <Text style={styles.detailBody}>{selectedProjectTask?.description}</Text>
                  {selectedProjectTask?.attachmentName ? (
                    <Text style={styles.projectLinkText}>Attachment: {selectedProjectTask.attachmentName}</Text>
                  ) : null}
                  <View style={styles.modalActions}>
                    <Pressable style={styles.cancelBtn} onPress={() => setSelectedProjectTask(null)}>
                      <Text style={styles.cancelBtnText}>Close</Text>
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

  if (slug === 'timesheet' || slug === 'clock-records' || slug === 'manual-records') {
    const isRecordsOnlyRoute = slug === 'clock-records' || slug === 'manual-records';
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <DashboardTopbar />
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <MaterialCommunityIcons name="clock-time-four-outline" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>{isRecordsOnlyRoute ? 'Timesheet Records' : 'Timesheet'}</Text>
            </View>
          </View>

          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Timesheet Sections</Text>
            <View style={styles.chipRow}>
              {[
                ['timesheet', 'Attendance Overview'],
                ['clock-records', 'Clock Record'],
                ['manual-records', 'Manual Record'],
              ].map(([tabId, label]) => (
                <Pressable
                  key={tabId}
                  onPress={() => router.push(`/dashboard/(tabs)/route/${tabId}`)}
                  style={[styles.filterChip, slug === tabId && styles.filterChipActive]}>
                  <Text style={[styles.filterChipText, slug === tabId && styles.filterChipTextActive]}>{label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {!isRecordsOnlyRoute ? (
            <>
            <View style={styles.panel}>
            <Text style={styles.panelTitle}>Attendance Window</Text>
            <View style={styles.chipRow}>
              {[
                ['today', 'Today'],
                ['7d', '7 days'],
                ['30d', '30 days'],
              ].map(([key, label]) => (
                <Pressable
                  key={key}
                  onPress={() => setTimesheetWindow(key)}
                  style={[styles.filterChip, timesheetWindow === key && styles.filterChipActive]}>
                  <Text style={[styles.filterChipText, timesheetWindow === key && styles.filterChipTextActive]}>{label}</Text>
                </Pressable>
              ))}
            </View>
            {user?.role === 'Admin' ? (
              <View style={[styles.chipRow, { marginTop: 8 }]}>
                {['all', 'Team Leader', 'HR', 'Employee'].map((role) => (
                  <Pressable
                    key={role}
                    onPress={() => setTimesheetRoleFilter(role)}
                    style={[styles.filterChip, timesheetRoleFilter === role && styles.filterChipActive]}>
                    <Text style={[styles.filterChipText, timesheetRoleFilter === role && styles.filterChipTextActive]}>
                      {role === 'all' ? 'All Roles' : role}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            <View style={[styles.searchWrap, { marginTop: 10 }]}>
              <MaterialCommunityIcons name="magnify" size={18} color="#94a3b8" />
              <TextInput
                value={timesheetSearch}
                onChangeText={setTimesheetSearch}
                placeholder="Search by name, GDC_ID or team"
                placeholderTextColor="#94a3b8"
                style={styles.searchInput}
              />
            </View>
            <View style={[styles.chipRow, { marginTop: 10 }]}>
              <Text style={styles.legendTitle}>Legend:</Text>
              <View style={[styles.statusCodePill, { backgroundColor: '#dcfce7', borderColor: '#86efac' }]}>
                <Text style={[styles.statusCodeText, { color: '#166534' }]}>P</Text>
              </View>
              <View style={[styles.statusCodePill, { backgroundColor: '#fee2e2', borderColor: '#fca5a5' }]}>
                <Text style={[styles.statusCodeText, { color: '#991b1b' }]}>L</Text>
              </View>
              <View style={[styles.statusCodePill, { backgroundColor: '#e2e8f0', borderColor: '#cbd5e1' }]}>
                <Text style={[styles.statusCodeText, { color: '#334155' }]}>A</Text>
              </View>
            </View>
          </View>

          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Attendance Matrix</Text>
            <Text style={styles.panelSub}>
              {timesheetWindow === 'today' ? 'Today status' : timesheetWindow === '7d' ? 'Last 7 days (P/A/L)' : '30 days summary'}
            </Text>
            {attendanceRows.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No attendance records in selected window.</Text>
              </View>
            ) : timesheetWindow === 'today' ? (
              attendanceRows.map((entry) => (
                <View key={entry.gdcId} style={styles.timesheetCard}>
                  <View style={styles.timesheetTopRow}>
                    <Text style={styles.timesheetName}>{entry.name}</Text>
                    <Text style={styles.timesheetDate}>{entry.role}</Text>
                  </View>
                  <Text style={styles.timesheetId}>{entry.gdcId}</Text>
                  <Text style={styles.timesheetTeam}>{entry.team}</Text>
                  <View style={styles.timesheetStatusRow}>
                    <Text style={styles.timesheetMeta}>Today Status:</Text>
                    <View style={styles.statusCodePill}>
                      <Text style={styles.statusCodeText}>{entry.cells[0]}</Text>
                    </View>
                  </View>
                </View>
              ))
            ) : timesheetWindow === '7d' ? (
              attendanceRows.map((entry) => (
                <View key={entry.gdcId} style={styles.timesheetCard}>
                  <View style={styles.timesheetTopRow}>
                    <Text style={styles.timesheetName}>{entry.name}</Text>
                    <Text style={styles.timesheetDate}>{entry.gdcId}</Text>
                  </View>
                  <Text style={styles.timesheetTeam}>{entry.role} - {entry.team}</Text>
                  <View style={styles.weekCellRow}>
                    {entry.cells.map((cell, idx) => (
                      <View key={`${entry.gdcId}-${timesheetDays[idx]}`} style={styles.weekCell}>
                        <Text style={styles.weekCellDay}>{timesheetDays[idx].slice(8)}</Text>
                        <View style={styles.statusCodePill}>
                          <Text style={styles.statusCodeText}>{cell}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              ))
            ) : (
              attendanceRows.map((entry) => (
                <View key={entry.gdcId} style={styles.timesheetCard}>
                  <View style={styles.timesheetTopRow}>
                    <Text style={styles.timesheetName}>{entry.name}</Text>
                    <Text style={styles.timesheetDate}>{entry.gdcId}</Text>
                  </View>
                  <Text style={styles.timesheetTeam}>{entry.role} - {entry.team}</Text>
                  <View style={styles.timesheetMetaRow}>
                    <Text style={styles.timesheetMeta}>P: {entry.counts.present}</Text>
                    <Text style={[styles.timesheetMeta, styles.timesheetLate]}>L: {entry.counts.late}</Text>
                    <Text style={styles.timesheetMeta}>A: {entry.counts.absent}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
            </>
          ) : null}

          {isRecordsOnlyRoute ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>{recordRouteTab === 'clock' ? 'Clock Record' : 'Manual Record'}</Text>
            <View style={styles.recordFilterGrid}>
              <View style={styles.recordField}>
                <Text style={styles.recordFieldLabel}>Role</Text>
                <View style={styles.recordChipWrap}>
                  {providerOptions.map((role) => (
                    <Pressable
                      key={role}
                      onPress={() => setRecordProviderFilter(role)}
                      style={[styles.filterChip, recordProviderFilter === role && styles.filterChipActive]}>
                      <Text style={[styles.filterChipText, recordProviderFilter === role && styles.filterChipTextActive]}>
                        {role === 'all' ? 'All providers' : role}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.recordField}>
                <Text style={styles.recordFieldLabel}>Unique ID / search</Text>
                <View style={styles.searchWrap}>
                  <MaterialCommunityIcons name="magnify" size={18} color="#94a3b8" />
                  <TextInput
                    value={recordSearch}
                    onChangeText={setRecordSearch}
                    placeholder="GDC-ID search"
                    placeholderTextColor="#94a3b8"
                    style={styles.searchInput}
                  />
                </View>
              </View>

              <View style={styles.dateFilterRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recordFieldLabel}>From</Text>
                  <TextInput
                    value={recordFromDate}
                    onChangeText={setRecordFromDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#94a3b8"
                    style={styles.input}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recordFieldLabel}>To</Text>
                  <TextInput
                    value={recordToDate}
                    onChangeText={setRecordToDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#94a3b8"
                    style={styles.input}
                  />
                </View>
              </View>
            </View>
            <Text style={styles.panelSub}>{filteredRecords.length} records</Text>
            {filteredRecords.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No records found.</Text>
              </View>
            ) : (
              filteredRecords.map((entry) => (
                <View key={entry.id} style={styles.timesheetCard}>
                  <View style={styles.timesheetTopRow}>
                    <Text style={styles.timesheetName}>{entry.user?.name}</Text>
                    <Text style={styles.timesheetDate}>{entry.date}</Text>
                  </View>
                  <Text style={styles.timesheetId}>{entry.gdcId}</Text>
                  <Text style={styles.timesheetTeam}>{entry.user?.role} - {entry.user?.team}</Text>
                  <View style={styles.timesheetClockRow}>
                    <View style={styles.timesheetClockPill}>
                      <Text style={styles.timesheetClockLabel}>IN</Text>
                      <Text style={styles.timesheetClockValue}>{entry.checkIn}</Text>
                    </View>
                    <MaterialCommunityIcons name="arrow-right" size={16} color="#94a3b8" />
                    <View style={styles.timesheetClockPill}>
                      <Text style={styles.timesheetClockLabel}>OUT</Text>
                      <Text style={styles.timesheetClockValue}>{entry.checkOut}</Text>
                    </View>
                  </View>
                  <View style={styles.timesheetMetaRow}>
                    <Text style={styles.timesheetMeta}>Hours: {entry.hours.toFixed(2)}</Text>
                    <Text style={styles.timesheetMeta}>OT: {Math.max(0, entry.hours - 8).toFixed(1)}h</Text>
                    <View style={styles.statusCodePill}>
                      <Text style={styles.statusCodeText}>{entry.status}</Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (slug === 'availability') {
    const isAdminBoard = user?.role === 'Admin';
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <DashboardTopbar />
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <MaterialCommunityIcons name="calendar-clock-outline" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>{isAdminBoard ? 'Team Status Board' : 'My Availability'}</Text>
            </View>
          </View>

          {isAdminBoard ? (
            <>
              <View style={styles.panel}>
                <Text style={styles.panelTitle}>Filters</Text>
                <View style={styles.chipRow}>
                  {['all', 'Employee', 'HR', 'Team Leader'].map((role) => (
                    <Pressable
                      key={role}
                      onPress={() => setAvailabilityRoleFilter(role)}
                      style={[styles.filterChip, availabilityRoleFilter === role && styles.filterChipActive]}>
                      <Text style={[styles.filterChipText, availabilityRoleFilter === role && styles.filterChipTextActive]}>
                        {role === 'all' ? 'All roles' : role}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <View style={[styles.chipRow, { marginTop: 8 }]}>
                  {['all', 'Available', 'Unavailable', 'Leave'].map((st) => (
                    <Pressable
                      key={st}
                      onPress={() => setAvailabilityStatusFilter(st)}
                      style={[styles.filterChip, availabilityStatusFilter === st && styles.filterChipActive]}>
                      <Text style={[styles.filterChipText, availabilityStatusFilter === st && styles.filterChipTextActive]}>
                        {st === 'Available' ? 'Present' : st === 'Unavailable' ? 'Absent' : st}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.panel}>
                <Text style={styles.panelTitle}>People</Text>
                {filteredAvailabilityUsers.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyText}>No people match filters.</Text>
                  </View>
                ) : (
                  filteredAvailabilityUsers.map((member) => (
                    <View key={member.gdcId} style={styles.availabilityCard}>
                      <View style={styles.availabilityTop}>
                        <View style={styles.availabilityAvatar}>
                          <Text style={styles.availabilityAvatarText}>{member.name.slice(0, 1)}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.availabilityName}>{member.name}</Text>
                          <Text style={styles.availabilityMeta}>{member.team} - {member.role}</Text>
                        </View>
                        <View
                          style={[
                            styles.availabilityStatusPill,
                            member.status === 'Available'
                              ? styles.availabilityPresent
                              : member.status === 'Unavailable'
                                ? styles.availabilityAbsent
                                : styles.availabilityLeave,
                          ]}>
                          <Text style={styles.availabilityStatusText}>
                            {member.status === 'Available' ? 'Present' : member.status === 'Unavailable' ? 'Absent' : 'Leave'}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.availabilityBottom}>
                        <Text style={styles.availabilityId}>{member.gdcId}</Text>
                        <Text style={[styles.availabilityActivity, member.active ? styles.timesheetOnTime : styles.timesheetLate]}>
                          {member.active ? 'Working' : 'Away'}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </>
          ) : (
            <>
              <View style={styles.panel}>
                <Text style={styles.panelTitle}>Current Status</Text>
                <View style={styles.chipRow}>
                  {['Present', 'Absent', 'Leave'].map((st) => (
                    <View key={st} style={[styles.filterChip, st === 'Present' && styles.filterChipActive]}>
                      <Text style={[styles.filterChipText, st === 'Present' && styles.filterChipTextActive]}>{st}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.panel}>
                <Text style={styles.panelTitle}>Attendance Log</Text>
                <View style={styles.dateFilterRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recordFieldLabel}>From</Text>
                    <TextInput value={availabilityFromDate} onChangeText={setAvailabilityFromDate} style={styles.input} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recordFieldLabel}>To</Text>
                    <TextInput value={availabilityToDate} onChangeText={setAvailabilityToDate} style={styles.input} />
                  </View>
                </View>
                <View style={{ marginTop: 8 }}>
                  {filteredMyAvailabilityLog.map((row) => (
                    <View key={row.date} style={styles.availabilityLogRow}>
                      <Text style={styles.availabilityLogDate}>{row.date}</Text>
                      <Text style={styles.availabilityLogTime}>
                        {row.in} {'->'} {row.out}
                      </Text>
                      <Text style={styles.availabilityLogTime}>Breaks: {row.breaks}</Text>
                      <Text style={styles.availabilityLogHours}>{row.hours.toFixed(2)}h</Text>
                    </View>
                  ))}
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (slug === 'admin') {
    const adminTabs = [
      {
        id: 'employees',
        title: 'Employees management',
        icon: 'account-group-outline',
        color: '#4f46e5',
        note: 'Create employees, edit profiles, and assign roles.',
      },
      {
        id: 'time',
        title: 'Time control',
        icon: 'timer-outline',
        color: '#f97316',
        note: 'Manage attendance windows, shifts, and overtime rules.',
      },
      {
        id: 'departments',
        title: 'Departments control',
        icon: 'office-building-outline',
        color: '#0d9488',
        note: 'Manage departments, hierarchy, and reporting lines.',
      },
    ];
    const activeAdminTab = adminTabs.find((tab) => tab.id === adminControlTab) ?? adminTabs[0];
    const timeRules = [
      { id: 'tr-1', label: 'Office check-in', value: '09:00 AM' },
      { id: 'tr-2', label: 'Grace period', value: '15 minutes' },
      { id: 'tr-3', label: 'Standard shift', value: '9 hours' },
      { id: 'tr-4', label: 'Overtime start', value: 'After 8.5 hours' },
    ];

    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <DashboardTopbar />
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <MaterialCommunityIcons name="shield-check-outline" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>Admin Control</Text>
            </View>
          </View>

          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Admin Panels</Text>
            <View style={styles.adminGrid}>
              {adminTabs.map((tab) => (
                <Pressable
                  key={tab.id}
                  onPress={() => setAdminControlTab(tab.id)}
                  style={[styles.adminCard, adminControlTab === tab.id && styles.adminCardActive]}>
                  <View style={[styles.adminIconWrap, { backgroundColor: `${tab.color}22` }]}>
                    <MaterialCommunityIcons name={tab.icon} size={20} color={tab.color} />
                  </View>
                  <Text style={styles.adminCardTitle}>{tab.title}</Text>
                  <MaterialCommunityIcons
                    name={adminControlTab === tab.id ? 'check-circle' : 'chevron-right-circle-outline'}
                    size={20}
                    color={adminControlTab === tab.id ? '#2563eb' : '#94a3b8'}
                    style={styles.adminCardStatusIcon}
                  />
                </Pressable>
              ))}
            </View>
          </View>

          {activeAdminTab.id === 'employees' ? (
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Employees Management</Text>
              <View style={styles.adminFilterCard}>
                <View style={styles.chipRow}>
                  {['All', 'Employee', 'Team Leader', 'HR', 'Pending'].map((filter) => (
                    <Pressable
                      key={filter}
                      onPress={() => setAdminRoleFilter(filter)}
                      style={[styles.filterChip, adminRoleFilter === filter && styles.filterChipActive]}>
                      <Text style={[styles.filterChipText, adminRoleFilter === filter && styles.filterChipTextActive]}>{filter}</Text>
                    </Pressable>
                  ))}
                </View>
                <View style={[styles.searchWrap, { marginTop: 10 }]}>
                  <MaterialCommunityIcons name="identifier" size={16} color="#94a3b8" />
                  <TextInput
                    value={adminUserSearch}
                    onChangeText={setAdminUserSearch}
                    placeholder="Search by name or GDC ID..."
                    placeholderTextColor="#94a3b8"
                    style={styles.searchInput}
                  />
                </View>
                <Text style={styles.panelSub}>
                  Showing {filteredAdminUsers.length} user{filteredAdminUsers.length !== 1 ? 's' : ''} · {adminRoleFilter} filter
                </Text>
              </View>
              <Text style={styles.adminSectionTitle}>User Directory</Text>
              {filteredAdminUsers.map((member) => (
                <View key={member.gdcId} style={styles.adminUserCard}>
                  <View style={styles.adminUserTop}>
                    <View style={styles.adminMemberAvatar}>
                      <Text style={styles.adminMemberAvatarText}>{member.name.slice(0, 1)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.adminMemberName}>{member.name}</Text>
                      <Text style={styles.adminMemberEmail}>{member.email}</Text>
                    </View>
                  </View>
                  <View style={styles.adminTagRow}>
                    <View style={styles.adminTagPill}>
                      <Text style={styles.adminTagText}>{member.role}</Text>
                    </View>
                    <View
                      style={[
                        styles.adminTagPill,
                        member.accountStatus === 'Pending' ? styles.adminTagPending : styles.adminTagActive,
                      ]}>
                      <Text
                        style={[
                          styles.adminTagText,
                          member.accountStatus === 'Pending' ? styles.adminTagPendingText : styles.adminTagActiveText,
                        ]}>
                        {member.accountStatus}
                      </Text>
                    </View>
                    <View style={[styles.adminTagPill, styles.adminTagId]}>
                      <Text style={styles.adminTagIdText}>{member.gdcId}</Text>
                    </View>
                  </View>
                  <Text style={styles.adminMemberMeta}>{member.team || 'No team assigned'}</Text>
                  {member.accountStatus === 'Pending' ? <Text style={styles.adminAwaitingText}>Awaiting approval</Text> : null}
                  <View style={styles.adminActionRow}>
                    <Pressable style={styles.adminPromoteBtn} onPress={() => openRoleModal(member.gdcId)}>
                      <MaterialCommunityIcons name="account-arrow-up-outline" size={14} color="#fff" />
                      <Text style={styles.adminPromoteText}>Promote / Role</Text>
                    </Pressable>
                    <Pressable
                      style={styles.adminDeleteBtn}
                      onPress={() =>
                        setAdminUsers((prev) => prev.filter((row) => row.gdcId !== member.gdcId))
                      }>
                      <MaterialCommunityIcons name="trash-can-outline" size={15} color="#ef4444" />
                    </Pressable>
                  </View>
                </View>
              ))}
              {filteredAdminUsers.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>No employees found for this filter.</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {activeAdminTab.id === 'time' ? (
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Time Control</Text>
              <View style={styles.timeHeroCard}>
                <View style={styles.timeHeroIconWrap}>
                  <MaterialCommunityIcons name="timer-sand" size={20} color="#f97316" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.timeHeroTitle}>Company office shift by date</Text>
                </View>
              </View>
              <View style={styles.timeFormRow}>
                <View style={styles.timeField}>
                  <Text style={styles.timeFieldLabel}>Date</Text>
                  <View style={styles.timeInputWrap}>
                    <TextInput
                      value={shiftDate}
                      onChangeText={setShiftDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#94a3b8"
                      style={styles.timeInput}
                    />
                    <Pressable onPress={openShiftDatePicker}>
                      <MaterialCommunityIcons name="calendar-blank-outline" size={16} color="#94a3b8" />
                    </Pressable>
                  </View>
                </View>
              </View>
              <View style={styles.timeFormRow}>
                <View style={styles.timeFieldHalf}>
                  <Text style={styles.timeFieldLabel}>Office start</Text>
                  <View style={styles.timeInputWrap}>
                    <TextInput
                      value={shiftStart}
                      onChangeText={setShiftStart}
                      placeholder="10:00 AM"
                      placeholderTextColor="#94a3b8"
                      style={styles.timeInput}
                    />
                    <Pressable onPress={() => openShiftTimePicker('start')}>
                      <MaterialCommunityIcons name="clock-outline" size={16} color="#94a3b8" />
                    </Pressable>
                  </View>
                </View>
                <View style={styles.timeFieldHalf}>
                  <Text style={styles.timeFieldLabel}>Office end</Text>
                  <View style={styles.timeInputWrap}>
                    <TextInput
                      value={shiftEnd}
                      onChangeText={setShiftEnd}
                      placeholder="07:00 PM"
                      placeholderTextColor="#94a3b8"
                      style={styles.timeInput}
                    />
                    <Pressable onPress={() => openShiftTimePicker('end')}>
                      <MaterialCommunityIcons name="clock-time-eight-outline" size={16} color="#94a3b8" />
                    </Pressable>
                  </View>
                </View>
              </View>
              <View style={styles.timeSaveRow}>
                <Pressable style={styles.timeSaveBtn}>
                  <Text style={styles.timeSaveText}>Save shift timing</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {activeAdminTab.id === 'departments' ? (
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Departments control</Text>
              <Text style={styles.panelSub}>Manage the departments shown in forms and filters.</Text>

              <View style={styles.deptAddCard}>
                <Text style={styles.deptSectionLabel}>Add department</Text>
                <View style={styles.deptAddRow}>
                  <View style={styles.deptInputWrap}>
                    <TextInput
                      value={newDepartment}
                      onChangeText={setNewDepartment}
                      placeholder="e.g. Graphic Design"
                      placeholderTextColor="#94a3b8"
                      style={styles.deptInput}
                    />
                  </View>
                  <Pressable style={styles.deptAddBtn} onPress={handleAddDepartment}>
                    <MaterialCommunityIcons name="plus" size={16} color="#fff" />
                    <Text style={styles.deptAddText}>Add</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.deptListHeader}>
                <Text style={styles.deptSectionLabel}>Current departments</Text>
                <Text style={styles.deptTotalText}>{departments.length} total</Text>
              </View>
              {departments.map((dept) => (
                <View key={dept} style={styles.deptRow}>
                  <Text style={styles.deptName}>{dept}</Text>
                  <Pressable
                    style={styles.deptRemoveBtn}
                    onPress={() => setDepartments((prev) => prev.filter((name) => name !== dept))}>
                    <MaterialCommunityIcons name="trash-can-outline" size={15} color="#ef4444" />
                    <Text style={styles.deptRemoveText}>Remove</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}
        </ScrollView>
        <Modal
          visible={roleModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setRoleModalOpen(false);
            setSelectedAdminUserId(null);
          }}>
          <View style={styles.modalOverlay}>
            <View style={styles.adminRoleModal}>
              <View style={styles.adminRoleModalHead}>
                <View style={styles.adminRoleModalIcon}>
                  <MaterialCommunityIcons name="shield-account-outline" size={22} color="#2563eb" />
                </View>
                <Pressable
                  onPress={() => {
                    setRoleModalOpen(false);
                    setSelectedAdminUserId(null);
                  }}>
                  <MaterialCommunityIcons name="close" size={20} color="#94a3b8" />
                </Pressable>
              </View>
              <Text style={styles.adminRoleTitle}>Promote or change role</Text>
              <Text style={styles.adminRoleUserName}>{selectedAdminUser?.name ?? 'Employee'}</Text>
              <Text style={styles.adminRoleUserId}>{selectedAdminUser?.gdcId ?? ''}</Text>
              <View style={{ marginTop: 10, gap: 8 }}>
                {['Employee', 'Team Leader', 'HR'].map((roleOption) => (
                  <Pressable key={roleOption} style={styles.adminRoleOption} onPress={() => applyAdminRole(roleOption)}>
                    <Text style={styles.adminRoleOptionText}>{roleOption}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  if (slug === 'request-management' || slug === 'manual-time-requests') {
    const isAdminReviewer = user?.role === 'Admin';
    const isManualTab = slug === 'manual-time-requests';
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <DashboardTopbar />
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <MaterialCommunityIcons name="clipboard-check-outline" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>Request Management</Text>
            </View>
          </View>

          <View style={styles.panel}>
            <View style={styles.chipRow}>
              <Pressable
                onPress={() => router.push('/dashboard/(tabs)/route/request-management')}
                style={[styles.filterChip, !isManualTab && styles.filterChipActive]}>
                <Text style={[styles.filterChipText, !isManualTab && styles.filterChipTextActive]}>Leave Requests</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push('/dashboard/(tabs)/route/manual-time-requests')}
                style={[styles.filterChip, isManualTab && styles.filterChipActive]}>
                <Text style={[styles.filterChipText, isManualTab && styles.filterChipTextActive]}>Manual Time Requests</Text>
              </Pressable>
            </View>
          </View>

          {isAdminReviewer ? (
            <View style={styles.panel}>
              <View style={styles.requestHeaderRow}>
                <Text style={styles.panelTitle}>
                  {isManualTab ? 'Manual Time Requests' : 'Leave Requests'}
                </Text>
              </View>
              <View style={[styles.chipRow, { marginBottom: 8 }]}>
                {['All', 'Pending', 'Approved', 'Rejected'].map((st) => (
                  <Pressable
                    key={st}
                    onPress={() => (isManualTab ? setManualStatusFilter(st) : setLeaveStatusFilter(st))}
                    style={[styles.filterChip, (isManualTab ? manualStatusFilter : leaveStatusFilter) === st && styles.filterChipActive]}>
                    <Text style={[styles.filterChipText, (isManualTab ? manualStatusFilter : leaveStatusFilter) === st && styles.filterChipTextActive]}>
                      {st}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.panelSub}>
                {isManualTab ? 'View manual time requests by status.' : 'Approve or reject employee/TL/HR leave requests.'}
              </Text>
              {(isManualTab
                ? (manualStatusFilter === 'All' ? manualRequests : manualRequests.filter((r) => r.status === manualStatusFilter))
                : filteredAdminLeaveRequests
              ).map((req) => (
                <View key={req.id} style={styles.requestCard}>
                  <View style={styles.requestTopRow}>
                    <Text style={styles.requestName}>{req.employee}</Text>
                    <Text style={styles.requestDate}>
                      {isManualTab ? req.date : `${req.from} -> ${req.to}`}
                    </Text>
                  </View>
                  <Text style={styles.requestMeta}>{req.role} - {isManualTab ? 'Manual Time' : req.type}</Text>
                  {isManualTab ? (
                    <Text style={styles.requestMeta}>
                      {req.clockIn} {'->'} {req.clockOut}
                    </Text>
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
                        <Pressable
                          style={styles.requestApproveBtn}
                          onPress={() => (isManualTab ? updateManualStatus(req.id, 'Approved') : updateLeaveStatus(req.id, 'Approved'))}>
                          <Text style={styles.requestBtnText}>Approve</Text>
                        </Pressable>
                        <Pressable style={styles.requestRejectBtn} onPress={() => openRejectModal(req.id, isManualTab ? 'manual' : 'leave')}>
                          <Text style={styles.requestBtnText}>Reject</Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <>
              <View style={styles.panel}>
                <View style={styles.requestHeaderRow}>
                  <Text style={styles.panelTitle}>{isManualTab ? 'My Manual Time Requests' : 'My Leave Requests'}</Text>
                </View>
                <View style={[styles.chipRow, { marginBottom: 8 }]}>
                  {['All', 'Pending', 'Approved', 'Rejected'].map((st) => (
                    <Pressable
                      key={st}
                      onPress={() => (isManualTab ? setManualStatusFilter(st) : setLeaveStatusFilter(st))}
                      style={[styles.filterChip, (isManualTab ? manualStatusFilter : leaveStatusFilter) === st && styles.filterChipActive]}>
                      <Text style={[styles.filterChipText, (isManualTab ? manualStatusFilter : leaveStatusFilter) === st && styles.filterChipTextActive]}>
                        {st}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={styles.panelSub}>
                  {isManualTab ? 'Create and track manual time requests.' : 'Create and track your leave request status.'}
                </Text>
                <Pressable style={styles.actionBtn} onPress={() => (isManualTab ? setManualModalOpen(true) : setLeaveModalOpen(true))}>
                  <Text style={styles.actionBtnText}>{isManualTab ? 'Request Manual Time' : 'Apply for Leave'}</Text>
                </Pressable>
              </View>

              <View style={styles.panel}>
                {(isManualTab ? filteredMyManualRequests : filteredMyLeaveRequests).length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyText}>{isManualTab ? 'No manual requests yet.' : 'No leave requests yet.'}</Text>
                  </View>
                ) : (
                  (isManualTab ? filteredMyManualRequests : filteredMyLeaveRequests).map((req) => (
                    <View key={req.id} style={styles.requestCard}>
                      <View style={styles.requestTopRow}>
                        <Text style={styles.requestName}>{isManualTab ? 'Manual Time' : req.type}</Text>
                        <Text style={styles.requestDate}>{isManualTab ? req.date : `${req.from} -> ${req.to}`}</Text>
                      </View>
                      {isManualTab ? (
                        <Text style={styles.requestMeta}>
                          {req.clockIn} {'->'} {req.clockOut}
                        </Text>
                      ) : null}
                      <Text style={styles.requestReason}>{req.reason}</Text>
                      {req.status === 'Rejected' && req.adminReason ? (
                        <View style={styles.rejectReasonBox}>
                          <Text style={styles.rejectReasonTitle}>Admin feedback</Text>
                          <Text style={styles.rejectReasonText}>{req.adminReason}</Text>
                        </View>
                      ) : null}
                      <View style={styles.requestFooter}>
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
                      <TextInput value={leaveFromDate} onChangeText={setLeaveFromDate} placeholder="YYYY-MM-DD" placeholderTextColor="#94a3b8" style={styles.input} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recordFieldLabel}>To</Text>
                      <TextInput value={leaveToDate} onChangeText={setLeaveToDate} placeholder="YYYY-MM-DD" placeholderTextColor="#94a3b8" style={styles.input} />
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
                      <TextInput value={manualDate} onChangeText={setManualDate} placeholder="YYYY-MM-DD" placeholderTextColor="#94a3b8" style={styles.input} />
                    </View>
                  </View>
                  <View style={styles.dateFilterRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recordFieldLabel}>Clock In</Text>
                      <TextInput value={manualClockIn} onChangeText={setManualClockIn} placeholder="09:00" placeholderTextColor="#94a3b8" style={styles.input} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recordFieldLabel}>Clock Out</Text>
                      <TextInput value={manualClockOut} onChangeText={setManualClockOut} placeholder="18:00" placeholderTextColor="#94a3b8" style={styles.input} />
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
                      <Text style={styles.actionBtnText}>Submit Manual Request</Text>
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
                    <Pressable
                      style={[styles.modalPrimaryBtn, !rejectReason.trim() && styles.modalPrimaryBtnDisabled]}
                      onPress={submitRejectRequest}
                      disabled={!rejectReason.trim()}>
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

  if (slug === 'team-tl') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <DashboardTopbar />
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <MaterialCommunityIcons name="account-switch-outline" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>Team Assign to TL</Text>
            </View>
          </View>

          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Search</Text>
            <View style={styles.searchWrap}>
              <MaterialCommunityIcons name="magnify" size={18} color="#94a3b8" />
              <TextInput
                value={teamAssignSearch}
                onChangeText={setTeamAssignSearch}
                placeholder="Name, email, GDC-ID, team, department, role or TL."
                placeholderTextColor="#94a3b8"
                style={styles.searchInput}
              />
            </View>
          </View>

          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Teams by leader</Text>
            <Text style={styles.panelSub}>
              {groupedTeamAssignments.length} team{groupedTeamAssignments.length !== 1 ? 's' : ''} · {filteredTeamAssignments.length}{' '}
              people
            </Text>
            {filteredTeamAssignments.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No people match your search.</Text>
              </View>
            ) : (
              groupedTeamAssignments.map((group) => (
                <View key={group.tl} style={styles.tlGroupCard}>
                  <View style={styles.tlGroupBanner}>
                    <View style={styles.tlGroupBannerIcon}>
                      <MaterialCommunityIcons name="account-supervisor-circle" size={22} color="#1d4ed8" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.tlGroupLabel}>Team lead</Text>
                      <Text style={styles.tlGroupName}>{group.tl}</Text>
                      <View style={styles.tlTeamChips}>
                        {group.teamNames.map((t) => (
                          <View key={t} style={styles.tlTeamChip}>
                            <MaterialCommunityIcons name="account-group-outline" size={14} color="#2563eb" />
                            <Text style={styles.tlTeamChipText}>{t}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                    <View style={styles.tlGroupCountPill}>
                      <Text style={styles.tlGroupCountNum}>{group.members.length}</Text>
                      <Text style={styles.tlGroupCountLbl}>people</Text>
                    </View>
                  </View>

                  <Text style={styles.taRosterTitle}>Roster</Text>
                  {group.members.map((row) => (
                    <View key={row.id} style={styles.taMemberCard}>
                      <View style={styles.taMemberTop}>
                        <View style={styles.taAvatar}>
                          <Text style={styles.taAvatarText}>{row.employee.slice(0, 1).toUpperCase()}</Text>
                        </View>
                        <View style={styles.taMemberInfo}>
                          <Text style={styles.taMemberName}>{row.employee}</Text>
                        </View>
                        <View style={[styles.taRolePill, row.role === 'Team Leader' ? styles.taRolePillLead : styles.taRolePillEmp]}>
                          <Text style={[styles.taRolePillText, row.role === 'Team Leader' ? styles.taRolePillTextLead : styles.taRolePillTextEmp]}>
                            {row.role ?? 'Employee'}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.taDetailGrid}>
                        <View style={styles.taDetailCell}>
                          <Text style={styles.taDetailLabel}>Team</Text>
                          <Text style={styles.taDetailValue}>{row.team}</Text>
                        </View>
                        <View style={styles.taDetailCell}>
                          <Text style={styles.taDetailLabel}>Department</Text>
                          <View style={styles.taDeptRow}>
                            <MaterialCommunityIcons name="office-building-outline" size={16} color="#0d9488" />
                            <Text style={styles.taDetailValue}>{row.department ?? '—'}</Text>
                          </View>
                        </View>
                        <View style={styles.taDetailCellFull}>
                          <Text style={styles.taDetailLabel}>GDC ID</Text>
                          <Text style={styles.taDetailValueMono}>{row.gdcId}</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BrandColors.pageBg },
  scroll: { paddingHorizontal: 18, paddingBottom: 124 },
  hero: {
    backgroundColor: '#0b4da6',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  heroIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { color: '#fff', fontSize: 19, fontWeight: '800' },
  heroSub: { color: '#dbeafe', fontSize: 12, marginTop: 2 },
  dateRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  dateChip: {
    borderWidth: 1,
    borderColor: '#dbe4fb',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  dateChipActive: { backgroundColor: '#dbeafe', borderColor: '#93c5fd' },
  dateChipText: { fontSize: 12, color: BrandColors.textMuted, fontWeight: '700' },
  dateChipTextActive: { color: '#1e3a8a' },
  panel: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dbe4fb',
    padding: 14,
  },
  panelTitle: { fontSize: 17, fontWeight: '800', color: BrandColors.text },
  panelSub: { marginTop: 3, marginBottom: 10, fontSize: 12, color: BrandColors.textMuted, lineHeight: 18 },
  adminGrid: { gap: 10 },
  adminCard: {
    borderWidth: 1,
    borderColor: '#dbe4fb',
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  adminFilterCard: {
    borderWidth: 1,
    borderColor: '#dbe4fb',
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    padding: 10,
    marginTop: 8,
  },
  adminSectionTitle: { marginTop: 12, marginBottom: 2, fontSize: 17, fontWeight: '800', color: '#0f172a' },
  adminUserCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    backgroundColor: '#ffffff',
    padding: 12,
    marginTop: 8,
    borderTopWidth: 3,
    borderTopColor: '#6366f1',
  },
  adminUserTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  adminMemberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminMemberAvatarText: { fontSize: 16, fontWeight: '800', color: '#1d4ed8' },
  adminMemberName: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  adminMemberEmail: { marginTop: 1, fontSize: 12, fontWeight: '600', color: '#64748b' },
  adminMemberMeta: { marginTop: 8, fontSize: 12, fontWeight: '700', color: '#64748b' },
  adminAwaitingText: { marginTop: 4, fontSize: 12, color: '#4338ca', fontWeight: '700' },
  adminTagRow: { marginTop: 9, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  adminTagPill: {
    borderWidth: 1,
    borderColor: '#dbe4fb',
    borderRadius: 999,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  adminTagText: { fontSize: 10, color: '#475569', fontWeight: '800', textTransform: 'uppercase' },
  adminTagPending: { backgroundColor: '#eef2ff', borderColor: '#c7d2fe' },
  adminTagPendingText: { color: '#4338ca' },
  adminTagActive: { backgroundColor: '#dcfce7', borderColor: '#bbf7d0' },
  adminTagActiveText: { color: '#166534' },
  adminTagId: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  adminTagIdText: { fontSize: 10, color: '#1d4ed8', fontWeight: '800' },
  adminActionRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  adminPromoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  adminPromoteText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  adminDeleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fff1f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminRuleRow: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  adminRuleLabel: { fontSize: 13, color: '#334155', fontWeight: '700' },
  adminRuleValue: { fontSize: 13, color: '#0f172a', fontWeight: '800' },
  adminTimeSummary: { flexDirection: 'row', gap: 8, marginTop: 10 },
  adminTimeBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    paddingVertical: 10,
    alignItems: 'center',
  },
  adminTimeBoxLabel: { fontSize: 11, color: '#1e3a8a', fontWeight: '700' },
  adminTimeBoxValue: { marginTop: 3, fontSize: 17, color: '#1e3a8a', fontWeight: '900' },
  adminDeptCard: {
    borderWidth: 1,
    borderColor: '#dbe4fb',
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    padding: 12,
    marginTop: 8,
  },
  adminDeptTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  adminDeptName: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  adminDeptLeads: { fontSize: 12, fontWeight: '700', color: '#0d9488' },
  adminDeptCount: { marginTop: 6, fontSize: 13, fontWeight: '700', color: '#475569' },
  deptAddCard: {
    borderWidth: 1,
    borderColor: '#dbe4fb',
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    padding: 12,
    marginTop: 8,
  },
  deptSectionLabel: { fontSize: 11, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6 },
  deptAddRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  deptInputWrap: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#dbe4fb',
    borderRadius: 999,
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
  },
  deptInput: { paddingVertical: 8, fontSize: 13, color: BrandColors.text },
  deptAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: '#4f46e5',
  },
  deptAddText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  deptListHeader: {
    marginTop: 14,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deptTotalText: { fontSize: 11, fontWeight: '800', color: '#64748b', textTransform: 'uppercase' },
  deptRow: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deptName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  deptRemoveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#fef2f2',
  },
  deptRemoveText: { fontSize: 11, fontWeight: '800', color: '#b91c1c' },
  timeHeroCard: {
    borderRadius: 16,
    backgroundColor: '#f5f3ff',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    marginBottom: 10,
  },
  timeHeroIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeHeroTitle: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  timeFormRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  timeField: { flex: 1 },
  timeFieldHalf: { flex: 1 },
  timeFieldLabel: { fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 4 },
  timeInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dbe4fb',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
  },
  timeInput: {
    flex: 1,
    paddingVertical: 8,
    paddingRight: 8,
    fontSize: 13,
    color: BrandColors.text,
  },
  timeSaveRow: { marginTop: 12, alignItems: 'center' },
  timeSaveBtn: {
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: '#4f46e5',
  },
  timeSaveText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  adminRoleModal: {
    width: '88%',
    maxWidth: 360,
    borderRadius: 22,
    backgroundColor: '#fff',
    padding: 16,
  },
  adminRoleModalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  adminRoleModalIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminRoleTitle: { marginTop: 10, fontSize: 22, fontWeight: '800', color: '#0f172a' },
  adminRoleUserName: { marginTop: 6, fontSize: 16, color: '#1e293b', fontWeight: '700' },
  adminRoleUserId: { marginTop: 3, fontSize: 12, color: '#64748b', fontWeight: '700' },
  adminRoleOption: {
    borderWidth: 1,
    borderColor: '#dbe4fb',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  adminRoleOptionText: { fontSize: 14, color: '#1e293b', fontWeight: '800' },
  adminCardStatusIcon: { marginLeft: 4 },
  adminCardActive: { borderColor: '#93c5fd', backgroundColor: '#eef6ff' },
  adminIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminCardTitle: { fontSize: 15, color: '#1e293b', fontWeight: '800', lineHeight: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#dbe4fb',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    color: BrandColors.text,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  textArea: { minHeight: 150 },
  textAreaSm: { minHeight: 110 },
  actionBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    borderRadius: 10,
    backgroundColor: BrandColors.primaryMid,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  filterRow: { marginBottom: 10, gap: 8 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dbe4fb',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
  },
  searchInput: {
    flex: 1,
    color: BrandColors.text,
    fontSize: 13,
    paddingVertical: 9,
    paddingHorizontal: 8,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  filterChip: {
    borderWidth: 1,
    borderColor: '#dbe4fb',
    borderRadius: 999,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  filterChipActive: { backgroundColor: '#dbeafe', borderColor: '#93c5fd' },
  filterChipText: { fontSize: 11, color: '#64748b', fontWeight: '700', textTransform: 'capitalize' },
  filterChipTextActive: { color: '#1e3a8a' },
  rowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginBottom: 6,
  },
  rowName: { fontSize: 13, fontWeight: '600', color: BrandColors.text },
  rowStatus: { fontSize: 12, fontWeight: '700', color: '#4f46e5' },
  tlCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    padding: 10,
    marginBottom: 8,
  },
  tlTeam: { fontSize: 13, fontWeight: '800', color: BrandColors.text },
  tlLead: { fontSize: 11, color: BrandColors.textMuted, marginTop: 2 },
  tlBody: { fontSize: 12, color: '#334155', marginTop: 5, lineHeight: 18 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  statPill: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#dbe4fb',
    borderRadius: 12,
    paddingVertical: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
  },
  statPillLabel: { fontSize: 11, color: '#1e3a8a', fontWeight: '700' },
  statPillValue: { marginTop: 3, fontSize: 16, color: '#1e3a8a', fontWeight: '800' },
  hrNoteBox: {
    borderWidth: 1,
    borderColor: '#c4b5fd',
    borderRadius: 12,
    backgroundColor: '#f5f3ff',
    padding: 12,
    marginTop: 4,
  },
  hrNoteTitle: { fontSize: 12, color: '#6d28d9', fontWeight: '800' },
  hrNoteText: { fontSize: 12, color: '#4c1d95', marginTop: 5, lineHeight: 18 },
  dateFilterRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  dateInput: { flex: 1 },
  projectCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    padding: 12,
    marginBottom: 8,
  },
  projectCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  projectId: { fontSize: 11, fontWeight: '800', color: '#1e3a8a' },
  projectDeadline: { fontSize: 11, fontWeight: '700', color: '#475569' },
  projectTitle: { marginTop: 6, fontSize: 14, fontWeight: '800', color: BrandColors.text },
  projectDesc: { marginTop: 4, fontSize: 12, color: '#334155', lineHeight: 18 },
  projectMetaRow: { marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  projectMetaText: { fontSize: 11, color: BrandColors.textMuted, fontWeight: '700' },
  projectFooter: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  projectStatusChip: { backgroundColor: '#dbeafe', borderColor: '#93c5fd' },
  deleteBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#dc2626',
  },
  deleteBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  emptyBox: {
    borderWidth: 1,
    borderColor: '#dbe4fb',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    paddingVertical: 18,
    alignItems: 'center',
  },
  emptyText: { color: '#64748b', fontSize: 12, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
  },
  modalCardShell: {
    maxHeight: '86%',
    width: '100%',
    maxWidth: 560,
  },
  modalScroll: {
    maxHeight: '100%',
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dbe4fb',
    padding: 14,
    gap: 8,
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: BrandColors.text, marginBottom: 4 },
  modalActions: { marginTop: 6, flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  cancelBtn: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    flex: 1,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  cancelBtnText: { color: '#334155', fontSize: 13, fontWeight: '700' },
  modalPrimaryBtn: {
    marginTop: 0,
    borderRadius: 10,
    backgroundColor: BrandColors.primaryMid,
    flex: 1,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentField: {
    marginTop: 2,
    borderWidth: 1,
    borderColor: '#dbe4fb',
    borderRadius: 12,
    padding: 10,
    backgroundColor: '#f8fafc',
  },
  attachmentLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  attachmentPicker: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  attachmentBtn: {
    borderRadius: 8,
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  attachmentBtnText: { color: '#1d4ed8', fontSize: 12, fontWeight: '700' },
  attachmentFileText: { flex: 1, fontSize: 12, color: '#475569', fontWeight: '600' },
  detailTitle: { fontSize: 18, fontWeight: '800', color: BrandColors.text, marginBottom: 6 },
  detailText: { fontSize: 13, color: '#334155', marginTop: 3, fontWeight: '600' },
  detailBody: { fontSize: 13, color: '#475569', marginTop: 6, lineHeight: 20 },
  projectLinkText: { marginTop: 4, fontSize: 11, color: '#2563eb', fontWeight: '600' },
  taskActionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  requestApproveBtn: {
    borderRadius: 10,
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  requestRejectBtn: {
    borderRadius: 10,
    backgroundColor: '#dc2626',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  requestBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  assignCard: {
    borderWidth: 1,
    borderColor: '#dbe4fb',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    padding: 12,
    marginBottom: 8,
  },
  tlGroupCard: {
    borderWidth: 1,
    borderColor: '#dbe4fb',
    borderRadius: 16,
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 14,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  tlGroupBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    marginBottom: 10,
  },
  tlGroupBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tlGroupLabel: { fontSize: 11, color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  tlGroupName: { fontSize: 17, fontWeight: '800', color: '#0f172a', marginTop: 2 },
  tlTeamChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  tlTeamChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tlTeamChipText: { fontSize: 12, fontWeight: '700', color: '#1d4ed8' },
  tlGroupCountPill: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 52,
  },
  tlGroupCountNum: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  tlGroupCountLbl: { fontSize: 10, color: '#64748b', fontWeight: '700' },
  taRosterTitle: { fontSize: 12, color: '#64748b', fontWeight: '800', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  taMemberCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    padding: 12,
    marginBottom: 10,
  },
  taMemberTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  taAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  taAvatarText: { fontSize: 18, fontWeight: '800', color: '#1d4ed8' },
  taMemberInfo: { flex: 1, minWidth: 0 },
  taMemberName: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  taRolePill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, maxWidth: '40%', flexShrink: 0, marginTop: 2 },
  taRolePillLead: { backgroundColor: '#e0e7ff' },
  taRolePillEmp: { backgroundColor: '#d1fae5' },
  taRolePillText: { fontSize: 11, fontWeight: '800' },
  taRolePillTextLead: { color: '#4338ca' },
  taRolePillTextEmp: { color: '#047857' },
  taDetailGrid: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  taDetailCell: { width: '47%', flexGrow: 1, minWidth: 130 },
  taDetailCellFull: { width: '100%', marginTop: 2 },
  taDetailLabel: { fontSize: 11, color: '#64748b', fontWeight: '700' },
  taDetailValue: { fontSize: 14, color: '#1e293b', fontWeight: '700', marginTop: 2 },
  taDetailValueMono: { fontSize: 13, color: '#1d4ed8', fontWeight: '700', marginTop: 2 },
  taDeptRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  assignHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  assignName: { fontSize: 14, fontWeight: '800', color: BrandColors.text },
  assignId: { fontSize: 11, color: '#1d4ed8', fontWeight: '700' },
  assignMeta: { marginTop: 4, fontSize: 12, color: '#475569', fontWeight: '600' },
  assignTlRow: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  editBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#2563eb',
  },
  modalPreview: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#dbe4fb',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    padding: 10,
    gap: 6,
  },
  modalPreviewTitle: { fontSize: 12, fontWeight: '800', color: BrandColors.text },
  modalPreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  modalPreviewTask: { fontSize: 12, fontWeight: '700', color: BrandColors.text },
  modalPreviewSub: { fontSize: 11, color: '#64748b', marginTop: 2 },
  modalPreviewEdit: { fontSize: 11, fontWeight: '800', color: '#2563eb' },
  timesheetCard: {
    borderWidth: 1,
    borderColor: '#dbe4fb',
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    padding: 12,
    marginBottom: 8,
  },
  timesheetTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timesheetName: { fontSize: 14, fontWeight: '800', color: BrandColors.text },
  timesheetDate: { fontSize: 11, color: '#64748b', fontWeight: '700' },
  timesheetId: { marginTop: 4, fontSize: 11, color: '#1d4ed8', fontWeight: '700' },
  timesheetTeam: { marginTop: 2, fontSize: 11, color: BrandColors.textMuted, fontWeight: '700' },
  timesheetClockRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timesheetClockPill: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    paddingVertical: 8,
    alignItems: 'center',
  },
  timesheetClockLabel: { fontSize: 10, color: '#1d4ed8', fontWeight: '800' },
  timesheetClockValue: { marginTop: 2, fontSize: 13, color: '#1e293b', fontWeight: '800' },
  timesheetMetaRow: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  timesheetMeta: { fontSize: 11, color: '#334155', fontWeight: '700' },
  timesheetLate: { color: '#dc2626' },
  timesheetOnTime: { color: '#16a34a' },
  timesheetStatusRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  legendTitle: { fontSize: 11, color: '#64748b', fontWeight: '800', alignSelf: 'center' },
  statusCodePill: {
    minWidth: 28,
    height: 28,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCodeText: { fontSize: 11, color: '#1e3a8a', fontWeight: '800' },
  weekCellRow: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  weekCell: { alignItems: 'center', gap: 4, flex: 1 },
  weekCellDay: { fontSize: 10, color: '#64748b', fontWeight: '700' },
  recordFilterGrid: { gap: 10, marginBottom: 10 },
  recordField: { gap: 6 },
  recordFieldLabel: { fontSize: 12, color: '#64748b', fontWeight: '700' },
  recordChipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  availabilityCard: {
    borderWidth: 1,
    borderColor: '#dbe4fb',
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    padding: 12,
    marginBottom: 8,
  },
  availabilityTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  availabilityAvatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  availabilityAvatarText: { color: '#1d4ed8', fontSize: 16, fontWeight: '800' },
  availabilityName: { fontSize: 14, fontWeight: '800', color: BrandColors.text },
  availabilityMeta: { marginTop: 2, fontSize: 11, color: BrandColors.textMuted, fontWeight: '700' },
  availabilityStatusPill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  availabilityPresent: { borderColor: '#86efac', backgroundColor: '#dcfce7' },
  availabilityAbsent: { borderColor: '#fcd34d', backgroundColor: '#fef3c7' },
  availabilityLeave: { borderColor: '#fda4af', backgroundColor: '#ffe4e6' },
  availabilityStatusText: { fontSize: 11, color: '#334155', fontWeight: '800' },
  availabilityBottom: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  availabilityId: { fontSize: 11, color: '#1d4ed8', fontWeight: '700' },
  availabilityActivity: { fontSize: 11, fontWeight: '800' },
  availabilityLogRow: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6,
  },
  availabilityLogDate: { fontSize: 12, color: '#0f172a', fontWeight: '800' },
  availabilityLogTime: { marginTop: 2, fontSize: 11, color: '#475569', fontWeight: '700' },
  availabilityLogHours: { marginTop: 3, fontSize: 11, color: '#1e40af', fontWeight: '800' },
  requestCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    padding: 12,
    marginBottom: 8,
  },
  requestHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  leaveTypeWrap: { position: 'relative', zIndex: 5 },
  leaveTypeTrigger: {
    borderWidth: 1,
    borderColor: '#dbe4fb',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leaveTypeTriggerText: { fontSize: 13, color: '#1e293b', fontWeight: '700' },
  leaveTypeMenu: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  leaveTypeOption: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  leaveTypeOptionActive: { backgroundColor: '#2563eb' },
  leaveTypeOptionText: { fontSize: 13, color: '#0f172a', fontWeight: '600' },
  leaveTypeOptionTextActive: { color: '#fff', fontWeight: '700' },
  requestTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  requestName: { fontSize: 14, fontWeight: '800', color: BrandColors.text },
  requestDate: { fontSize: 11, fontWeight: '700', color: '#475569' },
  requestMeta: { marginTop: 4, fontSize: 11, color: '#64748b', fontWeight: '700' },
  requestReason: { marginTop: 6, fontSize: 12, color: '#334155' },
  rejectReasonBox: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
    backgroundColor: '#fef2f2',
    padding: 10,
  },
  rejectReasonTitle: { fontSize: 11, color: '#b91c1c', fontWeight: '800', textTransform: 'uppercase' },
  rejectReasonText: { marginTop: 4, fontSize: 12, color: '#7f1d1d', lineHeight: 18 },
  requestFooter: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  approvedChip: { backgroundColor: '#dcfce7', borderColor: '#86efac' },
  approvedChipText: { color: '#166534' },
  rejectedChip: { backgroundColor: '#fee2e2', borderColor: '#fca5a5' },
  rejectedChipText: { color: '#991b1b' },
  modalPrimaryBtnDisabled: { opacity: 0.55 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#dbe4fb',
    padding: 18,
  },
  title: { fontSize: 24, fontWeight: '800', color: BrandColors.text },
  sub: { marginTop: 6, fontSize: 14, color: BrandColors.textMuted, lineHeight: 22, marginBottom: 14 },
  box: {
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 14,
    backgroundColor: '#eff6ff',
    padding: 14,
  },
  boxTitle: { fontSize: 14, fontWeight: '800', color: '#1e3a8a' },
  boxText: { marginTop: 6, fontSize: 13, lineHeight: 19, color: '#334155' },
});
