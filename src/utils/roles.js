/** Case-insensitive: session/JWT may use `admin`, `Admin`, etc. */
export function isAdminRole(role) {
  const r = String(role || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_');
  return r === 'admin';
}

export function isHrRole(role) {
  return String(role || '').toLowerCase().trim() === 'hr';
}

export function isAdminOrHrRole(role) {
  return isAdminRole(role) || isHrRole(role);
}

/** Matches Auth roster / dashboard team count (`employee` slug only). */
export function normalizeRoleSlug(role) {
  let x = String(role || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_');
  if (x === 'teamleader') x = 'team_leader';
  return x;
}

export function isEmployeeRole(role) {
  return normalizeRoleSlug(role) === 'employee';
}

export function isTeamLeaderRole(role) {
  return normalizeRoleSlug(role) === 'team_leader';
}

/** Admin, HR, or Team Leader — can create projects/tasks in CRM. */
export function canCreateProjectTask(role) {
  return isAdminRole(role) || isHrRole(role) || isTeamLeaderRole(role);
}
