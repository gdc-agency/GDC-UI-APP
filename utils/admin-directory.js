/** Map DB `users.role` to dashboard labels (matches auth-context / login). */
export function displayRoleFromDb(role) {
  const r = String(role || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_');
  if (r === 'admin') return 'Admin';
  if (r === 'hr') return 'HR';
  if (r === 'team_leader' || r === 'teamleader') return 'Team Leader';
  if (r === 'pending') return 'Pending User';
  return 'Employee';
}

/** Map modal / UI role label to API body (`approve-user`, `update-role`). */
export function apiRoleFromDisplay(display) {
  if (display === 'Team Leader') return 'team_leader';
  if (display === 'HR') return 'hr';
  if (display === 'Employee') return 'employee';
  if (display === 'Admin') return 'admin';
  return 'employee';
}

function rowNumericId(row) {
  const raw = row?.id ?? row?.user_id ?? row?.userId;
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function mapPendingUserRow(row) {
  const id = rowNumericId(row);
  const hashRaw = row.hash_id ?? row.hashId;
  return {
    id: Number.isFinite(id) ? id : null,
    hashId: hashRaw != null && String(hashRaw).trim() ? String(hashRaw).trim() : null,
    gdcId: row.gdc_id != null ? String(row.gdc_id) : `ID-${row.id}`,
    name: row.name ?? '',
    email: row.email ?? '',
    role: displayRoleFromDb(row.role),
    accountStatus: 'Pending',
    team: row.department ?? null,
  };
}

export function mapApprovedUserRow(row) {
  const id = rowNumericId(row);
  const hashRaw = row.hash_id ?? row.hashId;
  return {
    id: Number.isFinite(id) ? id : null,
    hashId: hashRaw != null && String(hashRaw).trim() ? String(hashRaw).trim() : null,
    gdcId: row.gdc_id != null ? String(row.gdc_id) : `ID-${row.id}`,
    name: row.name ?? '',
    email: row.email ?? '',
    role: displayRoleFromDb(row.role),
    accountStatus: 'Active',
    team: row.department ?? null,
  };
}
