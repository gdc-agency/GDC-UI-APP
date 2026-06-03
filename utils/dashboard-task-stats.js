import { isAdminRole, isEmployeeRole } from '@/utils/roles';
import { displayRoleFromApi, mapTaskRowToProjectTask } from '@/utils/task-ui-map';

/**
 * Same visibility as `RouteDetailScreen` project-manager `visibleProjectTasks`.
 * HR uses the full task list like Admin (includes TL-assigned / TL-submitted work).
 *
 * @param {Array<Record<string, unknown>>} mappedTasks - from `mapTaskRowToProjectTask`
 * @param {{ role?: string; id?: string | number } | null | undefined} user
 */
export function filterVisibleProjectTasksForUser(mappedTasks, user) {
  if (!user?.role) return mappedTasks;
  if (isAdminRole(user.role)) return mappedTasks;
  if (user.role === 'HR') {
    return mappedTasks;
  }
  if (user.role === 'Team Leader') return mappedTasks;
  const empUid = parseInt(String(user.id), 10);
  if (!Number.isFinite(empUid)) return mappedTasks;
  return mappedTasks.filter((task) => task.assignedToUserId === empUid);
}

/**
 * Counts for dashboard tiles (labels match project-manager filters).
 *
 * @param {Array<Record<string, unknown>>} visibleTasks
 * @param {string} [todayYmd] - `YYYY-MM-DD` local comparison for overdue (same rule as route screen)
 */
export function countDashboardTaskBuckets(visibleTasks, todayYmd) {
  const today = todayYmd || new Date().toISOString().slice(0, 10);
  let pending = 0;
  let inProgress = 0;
  let review = 0;
  let submitted = 0;
  let approved = 0;
  let overdue = 0;

  for (const t of visibleTasks) {
    const st = String(t.status || '');
    const sl = st.toLowerCase();
    if (sl === 'pending') pending += 1;
    else if (sl.includes('progress')) inProgress += 1;
    else if (sl === 'review') review += 1;
    else if (sl === 'submitted') submitted += 1;
    else if (sl === 'approved') approved += 1;

    const dl = t.deadline != null ? String(t.deadline) : '';
    if (dl && dl < today) {
      if (sl.includes('pending') || sl.includes('progress')) overdue += 1;
    }
  }

  return { pending, inProgress, review, submitted, approved, overdue };
}

/**
 * Team Leader dashboard: count **employees** on roster only (excludes TL / other roles).
 *
 * @param {unknown} rosterRes - GET /api/teams/my-team-roster JSON
 * @returns {number | null}
 */
export function countTeamEmployeesInRoster(rosterRes) {
  if (!rosterRes || typeof rosterRes !== 'object') return null;
  const members = /** @type {{ members?: unknown }} */ (rosterRes).members;
  if (!Array.isArray(members)) return null;
  let n = 0;
  for (const m of members) {
    const r = m && typeof m === 'object' && m.role != null ? m.role : '';
    if (isEmployeeRole(r)) n += 1;
  }
  return n;
}

/**
 * @param {unknown} listRes - raw `listTasks` response (array or wrapped)
 * @param {{ role?: string; id?: string | number } | null | undefined} user
 * @param {string} [todayYmd]
 */
export function buildDashboardTaskSnapshot(listRes, user, todayYmd) {
  const rows = Array.isArray(listRes) ? listRes : [];
  const mapped = rows.map((row) => mapTaskRowToProjectTask(row));
  const visible = filterVisibleProjectTasksForUser(mapped, user);
  return countDashboardTaskBuckets(visible, todayYmd);
}

/**
 * HR home tiles (matches GDC web HR dashboard: team scope).
 *
 * @param {{
 *   user?: { team_name?: string | null; department?: string | null } | null;
 *   tasks?: Array<{ assignedToUserId?: number | null; createdByRole?: string; status?: string }>;
 *   users?: Array<{ id?: number | string; role?: string; team?: string; team_name?: string }>;
 *   leaveRequests?: Array<{ status?: string }>;
 * }} input
 */
function userTeamLabel(u) {
  return String(u?.team_name ?? u?.team ?? u?.department ?? '').trim();
}

export function buildHrDashboardSnapshot({ user, tasks = [], users = [], leaveRequests = [] }) {
  const myTeam = userTeamLabel(user);
  const teamMembers = users.filter((u) => {
    const role = displayRoleFromApi(u.role);
    if (role === 'Pending User' || role === 'Admin') return false;
    if (!myTeam) return role === 'Employee' || role === 'Team Leader';
    return userTeamLabel(u) === myTeam;
  });
  const memberIds = new Set(
    teamMembers.map((u) => Number(u.id)).filter((id) => Number.isFinite(id)),
  );
  const teamTasks = tasks.filter((t) => {
    if (t.createdByRole === 'Team Leader') return false;
    const aid = t.assignedToUserId;
    return aid != null && memberIds.has(aid);
  });
  const pendingLeave = leaveRequests.filter(
    (l) => String(l.status || '').toLowerCase() === 'pending',
  ).length;

  return {
    teamMembers: teamMembers.length,
    teamTasks: teamTasks.length,
    completed: teamTasks.filter((t) => String(t.status || '') === 'Approved').length,
    pendingLeave,
  };
}
