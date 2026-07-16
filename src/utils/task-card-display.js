/**
 * Project card assignment lines — mirrors GDC-CRM `task-card-display.ts`.
 */

/** @param {string | null | undefined} role */
export function formatRoleAbbrev(role) {
  const r = String(role || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace('teamleader', 'team_leader');
  if (r === 'admin') return 'AD';
  if (r === 'hr') return 'HR';
  if (r === 'team_leader' || r === 'team leader') return 'TL';
  if (r === 'employee') return 'EMP';
  return role ? String(role).slice(0, 3).toUpperCase() : '—';
}

/** e.g. Jawad Jameel → Jawad J */
export function nameToCompactLabel(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  const first = parts[0];
  const lastInitial = parts[parts.length - 1][0]?.toUpperCase() ?? '';
  return lastInitial ? `${first} ${lastInitial}` : first;
}

/**
 * @param {{ name?: string, role?: string } | null | undefined} person
 */
function personWithRole(person) {
  if (!person) return '—';
  const role = formatRoleAbbrev(person.role);
  const name = person.name?.trim();
  if (name) return `${nameToCompactLabel(name)} (${role})`;
  const fullRole = String(person.role || '').trim();
  return fullRole || role || '—';
}

/**
 * @param {Record<string, unknown>} task - mapped project task
 * @param {{ id?: string | number, role?: string, team_name?: string, team?: string } | null} viewer
 * @param {Record<string, { id?: string | number, name?: string, role?: string, team?: string, team_name?: string }> | Map | null} [userById]
 * @returns {{ assignedBy?: string, assignedTo?: string, teamChip?: string }}
 */
export function getTaskCardAssignment(task, viewer, userById = null) {
  if (!viewer) return {};

  const lookup = (id) => {
    if (id == null) return null;
    const key = String(id);
    if (!userById) return null;
    if (userById instanceof Map) return userById.get(key) || null;
    return userById[key] || null;
  };

  const assigneeId = task.assignedToUserId;
  const assignerId = task.createdByUserId ?? task.assignedByUserId;

  const assigneeFromDir = lookup(assigneeId);
  const assignerFromDir = lookup(assignerId);

  const assignee = {
    id: assigneeId,
    name: String(task.assignedToName || assigneeFromDir?.name || '').trim(),
    role: String(task.assignedRole || assigneeFromDir?.role || '').trim(),
    team: String(
      task.assigneeTeam ||
        assigneeFromDir?.team_name ||
        assigneeFromDir?.team ||
        '',
    ).trim(),
  };

  const assigner = {
    id: assignerId,
    name: String(task.createdByName || assignerFromDir?.name || '').trim(),
    role: String(task.createdByRole || assignerFromDir?.role || '').trim(),
  };

  const viewerId = String(viewer.id ?? '');
  const isSelfAssigner = assigner.id != null && String(assigner.id) === viewerId;

  const assignedByText = isSelfAssigner ? undefined : personWithRole(assigner.name || assigner.role ? assigner : null);
  const assignedToText = personWithRole(assignee.name || assignee.role ? assignee : null);

  const role = String(viewer.role || '');
  if (role === 'Employee') {
    return { assignedBy: assignedByText };
  }

  if (role === 'Team Leader') {
    if (assigneeId != null && String(assigneeId) === viewerId) {
      return { assignedBy: assignedByText };
    }
    return { assignedTo: assignedToText };
  }

  if (role === 'Admin' || role === 'HR') {
    return {
      assignedBy: assignedByText,
      assignedTo: assignedToText,
      teamChip: assignee.team || undefined,
    };
  }

  return { assignedBy: assignedByText, assignedTo: assignedToText };
}

/**
 * Admin/HR see "Working" for In Progress — mirrors CRM `getManagementTaskDisplayStatus`.
 * @param {{ status?: string }} task
 * @param {string | null | undefined} viewerRole
 */
export function getManagementDisplayStatus(task, viewerRole) {
  const role = String(viewerRole || '');
  const status = String(task?.status || 'Pending');
  if (role !== 'Admin' && role !== 'HR') return status;
  if (status === 'Submitted' || status === 'Review' || status === 'Approved') return status;
  if (status === 'In Progress' || status.toLowerCase() === 'working') return 'Working';
  if (status === 'Pending') return 'Pending';
  return status;
}

/**
 * Simple task id for cards: task-14
 * @param {string | number | null | undefined} id
 */
export function formatTaskRef(id) {
  const raw = String(id ?? '').replace(/\D/g, '');
  if (!raw) return '';
  const n = String(Number(raw));
  if (!n || n === 'NaN') return `task-${raw}`;
  return `task-${n}`;
}
