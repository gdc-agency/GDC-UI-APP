import { isAdminRole } from '@/utils/roles';
import { mapTaskRowToProjectTask } from '@/utils/task-ui-map';

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
    const r = String(m && typeof m === 'object' && m.role != null ? m.role : '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_');
    if (r === 'employee') n += 1;
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
