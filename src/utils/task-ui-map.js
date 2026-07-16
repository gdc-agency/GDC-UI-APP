/** @param {string | null | undefined} raw */
function normalizeDbRole(raw) {
  const r = String(raw || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_');
  if (r === 'teamleader') return 'team_leader';
  return r;
}

/** Map DB / auth role to CRM UI label */
export function displayRoleFromApi(raw) {
  const r = normalizeDbRole(raw);
  if (r === 'admin') return 'Admin';
  if (r === 'hr') return 'HR';
  if (r === 'team_leader') return 'Team Leader';
  if (r === 'employee') return 'Employee';
  return raw ? String(raw) : 'Employee';
}

/** Map task row status to title-case UI label (matches projectStatusTone / filters) */
export function displayStatusFromApi(raw) {
  const s = String(raw || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_');
  if (s === 'pending') return 'Pending';
  if (s === 'in_progress' || s === 'working') return 'In Progress';
  if (s === 'submitted') return 'Submitted';
  if (s === 'review') return 'Review';
  if (s === 'approved') return 'Approved';
  return raw ? String(raw) : 'Pending';
}

/**
 * Admin/HR list/detail display — In Progress → Working.
 * @param {{ status?: string }} task
 * @param {string | null | undefined} viewerRole
 */
export function getManagementTaskDisplayStatus(task, viewerRole) {
  const role = String(viewerRole || '');
  const status = String(task?.status || 'Pending');
  if (role !== 'Admin' && role !== 'HR') return status;
  if (status === 'Submitted' || status === 'Review' || status === 'Approved') return status;
  if (status === 'In Progress') return 'Working';
  if (status === 'Pending') return 'Pending';
  return status;
}

/**
 * @param {Record<string, unknown>} row - task row from Task API (mapRowToClient)
 */
export function mapTaskRowToProjectTask(row) {
  const idNum = Number(row.id);
  const assignedTo = Number(row.assigned_to);
  const createdBy = row.created_by != null ? Number(row.created_by) : null;
  const assignedRole = displayRoleFromApi(row.assigned_role);
  const name = row.assigned_name != null ? String(row.assigned_name) : '';
  const status = displayStatusFromApi(row.status);
  const deadlineRaw = row.deadline;
  let deadline = '';
  if (deadlineRaw) {
    const d = new Date(String(deadlineRaw));
    deadline = Number.isNaN(d.getTime()) ? String(deadlineRaw).slice(0, 10) : d.toISOString().slice(0, 10);
  }

  /** @type {unknown[]} */
  const history = Array.isArray(row.history) ? row.history : [];
  let forwardedBy = '';
  let createdByName = row.creator_name != null ? String(row.creator_name) : '';
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const h = history[i];
    if (!h || typeof h !== 'object') continue;
    if (String(h.action || '').includes('Forward')) {
      const ar = h.actorRole != null ? String(h.actorRole) : '';
      forwardedBy = ar || 'HR';
    }
    if (!createdByName && String(h.action || '').toLowerCase().includes('creat')) {
      createdByName = h.actorName != null ? String(h.actorName) : createdByName;
    }
  }

  /** @type {unknown[]} */
  const comments = Array.isArray(row.comments) ? row.comments : [];

  const assigneeTeam = String(
    row.assigned_team ?? row.assignee_team ?? row.team_name ?? row.team ?? row.forwarded_team ?? '',
  ).trim();

  return {
    id: String(row.id),
    apiNumericId: Number.isFinite(idNum) ? idNum : null,
    title: String(row.title || ''),
    description: row.description != null ? String(row.description) : '',
    comments,
    assignee: `${assignedRole}: ${name || 'Unassigned'}`,
    assignedRole,
    assignedToName: name,
    assignedToUserId: Number.isFinite(assignedTo) ? assignedTo : null,
    assignedByUserId: Number.isFinite(createdBy) ? createdBy : null,
    createdByUserId: Number.isFinite(createdBy) ? createdBy : null,
    createdByName: createdByName || undefined,
    assigneeTeam: assigneeTeam || undefined,
    priority: 'Medium',
    status,
    deadline,
    createdAt: row.created_at != null ? String(row.created_at).slice(0, 10) : '',
    attachmentName: row.attachment_file_name != null ? String(row.attachment_file_name) : '',
    attachmentUri: row.attachment != null ? String(row.attachment) : '',
    createdByRole: displayRoleFromApi(row.creator_role),
    forwardedBy: forwardedBy || undefined,
    forwardedTeam: row.forwarded_team != null ? String(row.forwarded_team) : undefined,
  };
}
