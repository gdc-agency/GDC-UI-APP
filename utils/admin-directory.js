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

/** Ladder: Employee → Team Leader → HR (promote / same level only; no demotions). */
const PROMOTION_RANK = {
  Employee: 0,
  'Team Leader': 1,
  HR: 2,
  Admin: 3,
};

const PROMOTION_PICK_ORDER = ['Employee', 'Team Leader', 'HR'];

/** Role labels shown in admin "Promote / Role" modal for the given member role. */
export function displayRoleOptionsForPromotion(currentDisplay) {
  if (!currentDisplay || currentDisplay === 'Pending User') return [...PROMOTION_PICK_ORDER];
  if (currentDisplay === 'Admin') return ['Admin'];
  const cur = PROMOTION_RANK[currentDisplay];
  if (cur === undefined) return [...PROMOTION_PICK_ORDER];
  return PROMOTION_PICK_ORDER.filter((label) => PROMOTION_RANK[label] >= cur);
}

export function isRolePromotionAllowed(currentDisplay, nextDisplay) {
  return displayRoleOptionsForPromotion(currentDisplay).includes(nextDisplay);
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
