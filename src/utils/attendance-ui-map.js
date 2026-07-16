import { resolveProfileImageUri } from '@/utils/chat-directory';
import { formatAttendanceDuration } from '@/utils/attendance-export';
import { isAdminRole, isEmployeeRole } from '@/utils/roles';

/** @param {Record<string, unknown>} row */
function avatarUrlFromRow(row) {
  return resolveProfileImageUri(
    row.profile_image ?? row.profileImage ?? row.avatar ?? row.requester_avatar,
  );
}

/** Attendance overview / matrix: admins do not clock in and should not appear in lists. */
export function isExcludedAttendanceOverviewRole(roleRaw) {
  const r = String(roleRaw || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_');
  return r === 'admin' || r === 'pending' || r === 'pending_user';
}

/**
 * @param {Array<{ role?: string }>} users
 */
export function filterAttendanceOverviewUsers(users) {
  return users.filter((u) => !isExcludedAttendanceOverviewRole(u.role));
}

/**
 * Admin / HR attendance scope (matches GDC website `filterUsersForAttendanceViewer`).
 * Admin: HR, Team Leader, Employee (not Admin). HR: Employee + Team Leader only.
 *
 * @param {string | undefined} viewerRole
 * @param {Array<{ role?: string }>} users
 */
export function filterUsersForAttendanceViewer(viewerRole, users) {
  const base = filterAttendanceOverviewUsers(users);
  if (isAdminRole(viewerRole)) return base;
  if (String(viewerRole || '').trim() === 'HR') {
    return base.filter((u) => {
      const r = displayRoleFromApi(u.role);
      return r === 'Employee' || r === 'Team Leader';
    });
  }
  return base;
}

/** Map API role strings to dashboard display labels. */
export function displayRoleFromApi(roleRaw) {
  const r = String(roleRaw || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_');
  if (r === 'admin') return 'Admin';
  if (r === 'hr') return 'HR';
  if (r === 'team_leader' || r === 'teamleader' || r === 'team_lead') return 'Team Leader';
  if (r === 'employee') return 'Employee';
  return typeof roleRaw === 'string' && roleRaw.trim() ? roleRaw.trim() : 'Employee';
}

/** Default log range for My Availability (last 30 days, local calendar). */
export function getDefaultAvailabilityDateRange() {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 29);
  return {
    start: dateOnlyFromTimestamp(start),
    end: dateOnlyFromTimestamp(end),
  };
}

/** Map GET /api/today-status to availability chip status. */
export function mapTodayStatusToAvailabilityStatus(raw) {
  const s = String(raw || '').toUpperCase();
  if (s === 'LEAVE') return 'Leave';
  if (s === 'PRESENT') return 'Available';
  return 'Unavailable';
}

/** Map dashboard filter label to attendance API role query. */
export function apiRoleFromDisplayFilter(filter) {
  if (!filter || filter === 'all') return 'ALL';
  if (filter === 'Employee') return 'employee';
  if (filter === 'Team Leader') return 'team_leader';
  if (filter === 'HR') return 'hr';
  if (filter === 'Admin') return 'admin';
  return 'ALL';
}

/** Map UI leave type label to API enum. */
export function apiLeaveTypeFromUi(type) {
  const t = String(type || '').trim().toUpperCase();
  if (t === 'CASUAL') return 'CASUAL';
  if (t === 'ANNUAL' || t === 'PAID') return 'ANNUAL';
  return 'LEAVE';
}

/** Map API leave type to UI label. */
export function uiLeaveTypeFromApi(type) {
  const t = String(type || '').toUpperCase();
  if (t === 'CASUAL') return 'Casual';
  if (t === 'ANNUAL') return 'Annual';
  return 'Leave';
}

/**
 * Timesheet cell code: P | L | A
 * @param {string} status
 * @param {boolean} [isLate]
 */
export function attendanceStatusToCell(status, isLate = false) {
  const s = String(status || '').toUpperCase();
  if (s === 'LEAVE') return 'LV';
  if (s === 'ABSENT') return 'A';
  if (s === 'PRESENT' || s === 'LATE') return isLate || s === 'LATE' ? 'LT' : 'P';
  return 'A';
}

/**
 * @param {string} isoDate YYYY-MM-DD
 */
export function dateOnlyFromTimestamp(value, isoDate) {
  if (isoDate) return String(isoDate).slice(0, 10);
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * @param {string} value
 */
export function timeLabelFromTimestamp(value) {
  if (!value) return '--';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    const m = String(value).match(/(\d{1,2}):(\d{2})/);
    return m ? `${m[1].padStart(2, '0')}:${m[2]}` : String(value).slice(0, 5);
  }
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`;
}

/**
 * @param {string} ampm e.g. "10:00 AM"
 */
/** @param {string} value HH:MM or HH:MM:SS from API */
export function amPmFromApiTime(value) {
  const m = String(value || '').match(/^(\d{1,2}):(\d{2})/);
  if (!m) return timeLabelFromTimestamp(value);
  let h = Number(m[1]);
  const min = m[2];
  const mer = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${String(h).padStart(2, '0')}:${min} ${mer}`;
}

export function apiTimeFromAmPm(ampm) {
  const m = String(ampm || '').trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return ampm;
  let h = Number(m[1]);
  const min = m[2];
  const mer = m[3].toUpperCase();
  if (mer === 'PM' && h < 12) h += 12;
  if (mer === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${min}:00`;
}

/**
 * @param {Record<string, unknown>} row
 */
export function mapSevenDayUserRow(row) {
  const gdcId = String(row.gdc_id ?? '');
  const attendance = Array.isArray(row.attendance) ? row.attendance : [];
  return {
    gdcId,
    name: String(row.name ?? ''),
    role: displayRoleFromApi(row.role),
    team: String(row.department ?? row.team ?? '—'),
    avatarUrl: avatarUrlFromRow(row),
    dayStatuses: attendance.map((a) => ({
      date: dateOnlyFromTimestamp(a?.date),
      status: String(a?.attendance_status ?? 'ABSENT'),
      isLate: a?.is_late === true,
    })),
  };
}

/**
 * Today tab row from GET attendance summary (live status for current day).
 * @param {Record<string, unknown>} row
 * @param {string} todayIso YYYY-MM-DD
 */
/**
 * Auth `my-team-roster` member → timesheet list row (stable team label for TL roster).
 * @param {Record<string, unknown>} member
 * @param {string | null | undefined} teamName
 */
export function mapRosterMemberToTimesheetUser(member, teamName) {
  const m = member && typeof member === 'object' ? member : {};
  const team = String(teamName || m.department || '').trim() || '—';
  return {
    id: m.id != null ? String(m.id) : undefined,
    gdcId: String(m.gdc_id ?? m.gdcId ?? '').trim(),
    name: String(m.name ?? '').trim(),
    role: displayRoleFromApi(m.role),
    team,
    avatarUrl: avatarUrlFromRow(m),
  };
}

/**
 * @param {unknown} rosterRes - GET /api/teams/my-team-roster
 */
export function employeesFromTeamRoster(rosterRes) {
  if (!rosterRes || typeof rosterRes !== 'object') {
    return { teamName: null, members: [] };
  }
  const teamName =
    rosterRes.team_name != null ? String(rosterRes.team_name).trim() : null;
  const raw = Array.isArray(/** @type {{ members?: unknown }} */ (rosterRes).members)
    ? /** @type {{ members: unknown[] }} */ (rosterRes).members
    : [];
  const members = raw
    .filter((m) => isEmployeeRole(displayRoleFromApi(m && typeof m === 'object' ? m.role : '')))
    .map((m) => mapRosterMemberToTimesheetUser(m, teamName))
    .filter((u) => u.gdcId);
  return { teamName, members };
}

export function mapTodaySummaryUserRow(row, todayIso) {
  return {
    id: row.id != null ? String(row.id) : undefined,
    gdcId: String(row.gdc_id ?? ''),
    name: String(row.name ?? ''),
    role: displayRoleFromApi(row.role),
    team: String(row.department ?? row.team ?? '—'),
    avatarUrl: avatarUrlFromRow(row),
    dayStatuses: [
      {
        date: todayIso,
        status: String(row.attendance_status ?? 'ABSENT'),
        isLate: row.is_late === true,
      },
    ],
  };
}

/**
 * Fill missing avatars from Auth user rows (by gdc_id or numeric id).
 * @param {Array<{ gdcId: string; avatarUrl?: string | null; id?: string | number }>} users
 * @param {Array<Record<string, unknown>>} profileRows
 */
/**
 * Fill missing avatars / names on clock log rows from Auth directory.
 * @param {Array<Record<string, unknown>>} logs
 * @param {Array<Record<string, unknown>>} profileRows
 */
export function enrichTimesheetLogsWithAvatars(logs, profileRows = []) {
  const byGdc = new Map();
  for (const row of profileRows) {
    const gdc = String(row.gdc_id ?? row.gdcId ?? '').trim();
    if (!gdc) continue;
    byGdc.set(gdc, {
      avatarUrl: avatarUrlFromRow(row),
      name: String(row.name ?? ''),
      role: displayRoleFromApi(row.role),
      team: String(row.department ?? row.team ?? '—'),
    });
  }
  return logs.map((log) => {
    const snap = byGdc.get(log.gdcId);
    const avatarUrl = log.avatarUrl || snap?.avatarUrl || null;
    const userName = log.userName || snap?.name || '';
    const userRole = log.userRole || snap?.role || 'Employee';
    const team = log.team || snap?.team || '—';
    return { ...log, avatarUrl, userName, userRole, team };
  });
}

/** Attach `user` blob for {@link ClockRecordCard}. */
export function attachClockLogUser(log, profile) {
  const name = profile?.name || log.userName || '—';
  const role = profile?.role || log.userRole || 'Employee';
  const team = profile?.team || log.team || '—';
  const avatarUrl = log.avatarUrl || profile?.avatarUrl || null;
  return {
    ...log,
    avatarUrl,
    userName: name,
    userRole: role,
    team,
    durationLabel: log.durationLabel || formatAttendanceDuration(log.hours, log.hours),
    user: { name, role, team, avatarUrl },
  };
}

export function enrichTimesheetUserAvatars(users, profileRows = []) {
  const byGdc = new Map();
  const byId = new Map();
  for (const row of profileRows) {
    const url = avatarUrlFromRow(row);
    if (!url) continue;
    const gdc = String(row.gdc_id ?? row.gdcId ?? '').trim();
    if (gdc) byGdc.set(gdc, url);
    const id = row.id ?? row.user_id;
    if (id != null && String(id).trim()) byId.set(String(id), url);
  }
  return users.map((u) => ({
    ...u,
    avatarUrl: u.avatarUrl || byGdc.get(u.gdcId) || (u.id != null ? byId.get(String(u.id)) : null) || null,
  }));
}

/**
 * @param {Record<string, unknown>} row
 */
export function mapThirtyDayUserRow(row) {
  return {
    gdcId: String(row.gdc_id ?? ''),
    name: String(row.name ?? ''),
    role: displayRoleFromApi(row.role),
    team: String(row.department ?? row.team ?? '—'),
    avatarUrl: avatarUrlFromRow(row),
    counts: {
      present: Number(row.on_time) || 0,
      late: Number(row.late) || 0,
      absent: Number(row.absent) || 0,
    },
    leaveDays: Number(row.leave_days ?? row.leave) || 0,
  };
}

/**
 * CRM TeamAvailabilityBoard card status (present / away / leave / offline).
 * @param {Record<string, unknown>} row
 * @returns {'present' | 'away' | 'leave' | 'offline'}
 */
export function deriveAvailabilityCardStatus(row) {
  const att = String(row.attendance_status ?? '').trim().toUpperCase();
  const live = String(row.live_status ?? '').trim().toUpperCase();
  if (att === 'LEAVE') return 'leave';
  if (att === 'ABSENT') return 'offline';
  if (live === 'BREAK') return 'away';
  if (live === 'WORKING') return 'present';
  if (att === 'PRESENT') return 'away';
  return 'offline';
}

/**
 * @param {string | null | undefined} checkIn
 * @param {string | null | undefined} checkOut
 */
export function computeAvailabilityTodayHours(checkIn, checkOut) {
  if (!checkIn) return '—';
  const start = new Date(checkIn).getTime();
  const end = checkOut ? new Date(checkOut).getTime() : Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return '—';
  const hours = (end - start) / 3_600_000;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

/**
 * @param {Record<string, unknown>} row
 */
export function mapSummaryUserToAvailability(row) {
  const statusRaw = String(row.attendance_status ?? '').toUpperCase();
  let status = 'Unavailable';
  let attendanceLabel = 'Absent';
  if (statusRaw === 'LEAVE') {
    status = 'Leave';
    attendanceLabel = 'Leave';
  } else if (statusRaw === 'PRESENT') {
    status = 'Available';
    attendanceLabel = 'Present';
  }
  const live = String(row.live_status ?? '').toUpperCase();
  const cardStatus = deriveAvailabilityCardStatus(row);
  let activityLabel = 'Away';
  if (cardStatus === 'leave') activityLabel = 'Leave';
  else if (cardStatus === 'present') activityLabel = 'Working';
  else if (cardStatus === 'away' && live === 'BREAK') activityLabel = 'On break';
  else if (cardStatus === 'offline') activityLabel = 'Offline';

  const boardLabel =
    cardStatus === 'present'
      ? 'Present'
      : cardStatus === 'away'
        ? 'Away'
        : cardStatus === 'leave'
          ? 'On Leave'
          : 'Offline';

  return {
    id: row.id != null ? String(row.id) : undefined,
    gdcId: String(row.gdc_id ?? ''),
    name: String(row.name ?? ''),
    role: displayRoleFromApi(row.role),
    team: String(row.department ?? '—'),
    jobTitle: String(row.job_title ?? row.designation ?? row.department ?? '—'),
    email: String(row.email ?? ''),
    phone: String(row.phone ?? row.mobile ?? ''),
    avatarUrl: avatarUrlFromRow(row),
    status,
    attendanceLabel: boardLabel,
    activityLabel,
    cardStatus,
    checkIn: row.check_in ? String(row.check_in) : null,
    checkOut: row.check_out ? String(row.check_out) : null,
    checkInLabel: row.check_in ? timeLabelFromTimestamp(row.check_in) : '—',
    checkOutLabel: row.check_out ? timeLabelFromTimestamp(row.check_out) : '—',
    todayHours: computeAvailabilityTodayHours(
      row.check_in ? String(row.check_in) : null,
      row.check_out ? String(row.check_out) : null,
    ),
    liveStatus: live || '—',
    leaveUntil: row.leave_until ? String(row.leave_until) : row.leave_end ? String(row.leave_end) : undefined,
    leaveType: row.leave_type ? String(row.leave_type) : undefined,
    active: cardStatus === 'present' || cardStatus === 'away',
  };
}

/**
 * @param {Record<string, unknown>} row
 * @param {'clock' | 'manual'} source
 */
export function mapRecordRowToTimesheetLog(row, source) {
  const checkIn = row.check_in;
  const date = dateOnlyFromTimestamp(checkIn, row.date);
  const hoursRaw = row.hours ?? row.total_hours;
  let hours = 0;
  let hoursLabel = typeof hoursRaw === 'string' ? hoursRaw.trim() : '';
  if (typeof hoursRaw === 'number') hours = hoursRaw;
  else if (typeof hoursRaw === 'string') {
    const hm = hoursRaw.match(/(\d+(?:\.\d+)?)\s*h/i);
    const mm = hoursRaw.match(/(\d+)\s*m/i);
    if (hm) hours = Number(hm[1]) + (mm ? Number(mm[1]) / 60 : 0);
    else if (mm) hours = Number(mm[1]) / 60;
    else hours = Number.parseFloat(hoursRaw) || 0;
  }
  if (!hours && row.total_minutes != null) {
    hours = Number(row.total_minutes) / 60;
  }
  if (!hours && row.check_in && row.check_out) {
    const a = new Date(row.check_in).getTime();
    const b = new Date(row.check_out).getTime();
    if (!Number.isNaN(a) && !Number.isNaN(b) && b > a) hours = (b - a) / 3600000;
  }
  const durationLabel = formatAttendanceDuration(hours, hoursLabel);
  const statusFlag = String(row.status ?? row.flag ?? '').toUpperCase();
  const isLate = source === 'clock' && (row.is_late === true || statusFlag === 'LATE');
  const manualStatusRaw = source === 'manual' ? String(row.status ?? '').toLowerCase() : '';
  const manualStatus =
    source === 'manual'
      ? manualStatusRaw === 'approved'
        ? 'Approved'
        : manualStatusRaw === 'rejected'
          ? 'Rejected'
          : 'Pending'
      : null;
  return {
    id: String(row.id ?? row.sr ?? `${source}-${row.gdc_id}-${date}`),
    gdcId: String(row.gdc_id ?? ''),
    date,
    checkIn: timeLabelFromTimestamp(checkIn),
    checkOut: row.check_out ? timeLabelFromTimestamp(row.check_out) : '--',
    hours,
    durationLabel,
    status: source === 'manual' ? manualStatus || 'Pending' : attendanceStatusToCell(statusFlag || 'PRESENT', isLate),
    recordStatus: manualStatus,
    source,
    userRole: displayRoleFromApi(row.role),
    userName: String(row.name ?? row.user_name ?? ''),
    department: String(row.department ?? '—'),
    team: String(row.department ?? row.team ?? '—'),
    avatarUrl: avatarUrlFromRow(row),
  };
}

/**
 * @param {Record<string, unknown>} row
 */
export function mapClockHistoryToLog(row) {
  const date = dateOnlyFromTimestamp(row.check_in ?? row.date);
  const isLate = String(row.flag ?? '').toUpperCase() === 'LATE';
  const hours = Number.parseFloat(String(row.hours ?? '0')) || 0;
  return {
    id: String(row.attendance_id ?? `hist-${date}`),
    gdcId: String(row.gdc_id ?? ''),
    date,
    checkIn: timeLabelFromTimestamp(row.check_in),
    checkOut: row.check_out ? timeLabelFromTimestamp(row.check_out) : '--',
    hours,
    durationLabel: formatAttendanceDuration(hours, row.hours),
    status: isLate ? 'L' : 'P',
    source: 'clock',
    avatarUrl: avatarUrlFromRow(row),
    userName: String(row.name ?? row.user_name ?? ''),
    userRole: displayRoleFromApi(row.role),
    team: String(row.department ?? row.team ?? '—'),
  };
}

/**
 * @param {Record<string, unknown>} row
 */
export function mapClockHistoryToAvailabilityLog(row) {
  const date = dateOnlyFromTimestamp(row.check_in ?? row.date);
  const hours = Number.parseFloat(String(row.hours ?? '0')) || 0;
  const hasSession = !!(row.check_in || hours > 0);
  return {
    date,
    in: timeLabelFromTimestamp(row.check_in),
    out: row.check_out ? timeLabelFromTimestamp(row.check_out) : '--',
    breaks: 0,
    hours,
    status: hasSession ? 'Present' : 'Absent',
  };
}

/**
 * Merge 7-day attendance API days with clock history in/out times.
 * @param {Record<string, unknown> | null} userRow
 * @param {Array<Record<string, unknown>>} clockRows
 */
export function buildMyAvailabilityLogFromSevenDays(userRow, clockRows = []) {
  const attendance = Array.isArray(userRow?.attendance) ? userRow.attendance : [];
  const clockByDate = new Map();
  for (const row of clockRows) {
    const date = dateOnlyFromTimestamp(row.check_in ?? row.date);
    if (!date) continue;
    if (!clockByDate.has(date)) clockByDate.set(date, row);
  }
  const rows = attendance.map((day) => {
    const date = dateOnlyFromTimestamp(day?.date);
    const statusRaw = String(day?.attendance_status ?? 'ABSENT').toUpperCase();
    let status = 'Absent';
    if (statusRaw === 'LEAVE') status = 'Leave';
    else if (statusRaw === 'PRESENT') status = 'Present';
    const clock = clockByDate.get(date);
    const hours = clock ? Number.parseFloat(String(clock.hours ?? '0')) || 0 : 0;
    return {
      date,
      in: clock ? timeLabelFromTimestamp(clock.check_in) : '--',
      out: clock?.check_out ? timeLabelFromTimestamp(clock.check_out) : '--',
      breaks: 0,
      hours,
      status,
    };
  });
  rows.sort((a, b) => b.date.localeCompare(a.date));
  return rows;
}

/**
 * @param {Record<string, unknown>} row
 */
export function formatRequestDisplayDate(iso) {
  if (!iso) return '—';
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function leaveDayCount(fromIso, toIso) {
  const a = new Date(`${fromIso}T12:00:00`);
  const b = new Date(`${toIso}T12:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 1;
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86400000) + 1);
}

export function requestStatusTimestamp(req) {
  const raw = req.createdAt || req.statusAt || '';
  const label = formatRequestDisplayDate(String(raw).slice(0, 10));
  if (!label || label === '—') return '';
  if (req.status === 'Approved') return `Approved on ${label}`;
  if (req.status === 'Rejected') return `Rejected on ${label}`;
  return `Requested on ${label}`;
}

/**
 * @param {Array<Record<string, unknown>>} requests
 * @param {Array<Record<string, unknown>>} profileRows
 */
/**
 * My Requests route: only the signed-in user's rows (TL API returns whole team).
 * @param {Array<{ gdcId?: string; employee?: string }>} requests
 * @param {{ gdc_id?: string | null; name?: string | null } | null | undefined} user
 */
export function filterMyOwnRequests(requests, user) {
  if (!user || !Array.isArray(requests)) return [];
  const gdc = user.gdc_id ? String(user.gdc_id).trim() : '';
  if (gdc) {
    const matched = requests.filter((r) => String(r.gdcId ?? '').trim() === gdc);
    if (matched.length > 0 || requests.length === 0) return matched;
  }
  const name = user.name ? String(user.name).trim().toLowerCase() : '';
  if (name) {
    return requests.filter((r) => String(r.employee ?? '').trim().toLowerCase() === name);
  }
  return [];
}

export function enrichRequestsWithAvatars(requests, profileRows = []) {
  const byName = new Map();
  const byGdc = new Map();
  for (const row of profileRows) {
    const url = avatarUrlFromRow(row);
    if (!url) continue;
    const name = String(row.name ?? '').trim().toLowerCase();
    const gdc = String(row.gdc_id ?? row.gdcId ?? '').trim();
    if (name) byName.set(name, url);
    if (gdc) byGdc.set(gdc, url);
  }
  return requests.map((r) => {
    const key = String(r.employee ?? '').trim().toLowerCase();
    const gdcKey = String(r.gdcId ?? '').trim();
    return {
      ...r,
      avatarUrl:
        r.avatarUrl ||
        (gdcKey && byGdc.get(gdcKey)) ||
        (key && byName.get(key)) ||
        null,
    };
  });
}

/**
 * Fallback avatar for My Requests when attendance row has no requester_avatar.
 * @param {Array<{ gdcId?: string; employee?: string; avatarUrl?: string | null }>} requests
 * @param {{ gdc_id?: string | null; name?: string | null; avatar?: string | null } | null | undefined} user
 */
export function applyViewerAvatarToOwnRequests(requests, user) {
  const url = resolveProfileImageUri(user?.avatar);
  if (!url || !user) return requests;
  const gdc = user.gdc_id ? String(user.gdc_id).trim() : '';
  const name = user.name ? String(user.name).trim().toLowerCase() : '';
  return requests.map((r) => {
    const isOwn =
      (gdc && String(r.gdcId ?? '').trim() === gdc) ||
      (name && String(r.employee ?? '').trim().toLowerCase() === name);
    if (!isOwn) return r;
    return { ...r, avatarUrl: r.avatarUrl || url };
  });
}

export function mapLeaveRowToUi(row) {
  const status = String(row.status ?? 'PENDING');
  const cap = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  const from = dateOnlyFromTimestamp(row.start_date);
  const to = dateOnlyFromTimestamp(row.end_date);
  return {
    id: String(row.id ?? ''),
    employee: String(row.requester_name ?? row.employee ?? ''),
    role: displayRoleFromApi(row.role_snapshot ?? row.requester_role ?? row.role ?? ''),
    team: String(row.department ?? row.team ?? '—'),
    gdcId: String(row.gdc_id ?? ''),
    type: uiLeaveTypeFromApi(row.leave_type),
    from,
    to,
    reason: String(row.reason ?? ''),
    status: cap === 'Pending' ? 'Pending' : cap === 'Approved' ? 'Approved' : cap === 'Rejected' ? 'Rejected' : cap,
    adminReason: String(row.rejection_reason ?? ''),
    avatarUrl: avatarUrlFromRow(row),
    dayCount: leaveDayCount(from, to),
    createdAt: row.created_at ?? null,
    statusAt: dateOnlyFromTimestamp(row.created_at),
  };
}

/**
 * @param {Record<string, unknown>} row
 */
export function mapManualRowToUi(row) {
  const status = String(row.status ?? 'PENDING');
  const cap = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  const date = dateOnlyFromTimestamp(row.date);
  return {
    id: String(row.id ?? ''),
    employee: String(row.requester_name ?? row.employee ?? ''),
    role: displayRoleFromApi(row.role ?? row.role_snapshot ?? row.requester_role ?? ''),
    team: String(row.user_department ?? row.department ?? row.team ?? '—'),
    gdcId: String(row.user_gdc_id ?? row.gdc_id ?? ''),
    date,
    clockIn: timeLabelFromTimestamp(row.check_in),
    clockOut: row.check_out ? timeLabelFromTimestamp(row.check_out) : '--',
    breakOut: row.break_out ? timeLabelFromTimestamp(row.break_out) : '',
    reason: String(row.reason ?? ''),
    status: cap === 'Pending' ? 'Pending' : cap === 'Approved' ? 'Approved' : cap === 'Rejected' ? 'Rejected' : cap,
    adminReason: String(row.rejection_reason ?? ''),
    avatarUrl: avatarUrlFromRow(row),
    createdAt: row.created_at ?? null,
    statusAt: dateOnlyFromTimestamp(row.created_at),
  };
}

/**
 * Build attendance matrix rows for UI from users + optional day statuses.
 * @param {Array<{ gdcId: string; name: string; role: string; team: string; dayStatuses?: Array<{ date: string; status: string }>; counts?: { present: number; late: number; absent: number } }>} users
 * @param {string[]} timesheetDays
 * @param {Array<{ gdcId: string; date: string; status: string }>} [logs]
 */
export function buildAttendanceRows(users, timesheetDays, logs = []) {
  const logByKey = new Map(logs.map((l) => [`${l.gdcId}|${l.date}`, l.status]));
  return users.map((u) => {
    if (u.counts && !u.dayStatuses?.length) {
      return { ...u, cells: [], counts: u.counts };
    }
    const statusByDate = new Map((u.dayStatuses || []).map((d) => [d.date, d]));
    const cells = timesheetDays.map((day) => {
      const fromLog = logByKey.get(`${u.gdcId}|${day}`);
      if (fromLog) return fromLog;
      const dayEntry = statusByDate.get(day);
      if (!dayEntry) return 'A';
      const status = typeof dayEntry === 'string' ? dayEntry : dayEntry.status;
      const isLate = typeof dayEntry === 'object' && dayEntry.isLate === true;
      return attendanceStatusToCell(status, isLate);
    });
    const counts = cells.reduce(
      (acc, st) => {
        if (st === 'P') acc.present += 1;
        else if (st === 'LT') acc.late += 1;
        else if (st === 'A') acc.absent += 1;
        return acc;
      },
      { present: 0, late: 0, absent: 0 },
    );
    return { ...u, cells, counts: u.counts || counts };
  });
}
