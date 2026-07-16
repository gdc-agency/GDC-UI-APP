/**
 * Chat privacy / permission rules — mirrors GDC-CRM `messaging.ts` + `store.ts`.
 */

/** @typedef {'Super Admin' | 'Admin' | 'HR' | 'Team Leader' | 'Employee' | 'Client' | 'Pending User'} CrmRole */

/** @param {string | null | undefined} role */
export function normalizeCrmRole(role) {
  const r = String(role || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace('teamleader', 'team_leader');
  if (r === 'super_admin') return 'Super Admin';
  if (r === 'admin') return 'Admin';
  if (r === 'hr') return 'HR';
  if (r === 'team_leader' || r === 'team leader') return 'Team Leader';
  if (r === 'employee') return 'Employee';
  if (r === 'client') return 'Client';
  if (r === 'pending' || r === 'pending_user' || r === 'pending user') return 'Pending User';
  const trimmed = String(role || '').trim();
  return /** @type {CrmRole} */ (trimmed || 'Employee');
}

/** @param {string | null | undefined} role */
export function isPendingUserRole(role) {
  return normalizeCrmRole(role) === 'Pending User';
}

/**
 * @param {{ id?: string | number, role?: string, roleLabel?: string, status?: string, team?: string, team_name?: string, teamName?: string } | null | undefined} row
 * @returns {{ id: string, role: CrmRole, team?: string } | null}
 */
export function asPermissionUser(row) {
  if (!row) return null;
  const id = row.id != null ? String(row.id).trim() : '';
  if (!id) return null;
  const role = normalizeCrmRole(row.role ?? row.roleLabel ?? row.status);
  const teamRaw = row.team ?? row.team_name ?? row.teamName;
  const team = teamRaw != null && String(teamRaw).trim() ? String(teamRaw).trim() : undefined;
  return { id, role, team };
}

/** @param {{ id?: string | number, role?: string, team_name?: string, team?: string } | null | undefined} authUser */
export function viewerFromAuth(authUser) {
  return asPermissionUser({
    id: authUser?.id,
    role: authUser?.role,
    team: authUser?.team_name ?? authUser?.team,
  });
}

/** @param {CrmRole} from @param {CrmRole} to */
export function canDm(from, to) {
  if (from === 'Pending User' || to === 'Pending User') return false;
  if (from === 'Admin') return to === 'HR' || to === 'Team Leader' || to === 'Employee';
  if (from === 'HR') return to === 'Admin' || to === 'HR' || to === 'Team Leader' || to === 'Employee';
  if (from === 'Team Leader') {
    return to === 'Admin' || to === 'HR' || to === 'Team Leader' || to === 'Employee';
  }
  if (from === 'Employee') return to === 'Admin' || to === 'HR' || to === 'Team Leader';
  return false;
}

/**
 * DM pair check (includes same-team employee → team leader rule).
 * @param {{ role: CrmRole, team?: string } | null} viewer
 * @param {{ role: CrmRole, team?: string } | null} target
 */
export function canDmPair(viewer, target) {
  if (!viewer || !target || viewer.role === 'Pending User' || target.role === 'Pending User') {
    return false;
  }
  if (!canDm(viewer.role, target.role)) return false;

  if (viewer.role === 'Employee') {
    if (target.role === 'Admin' || target.role === 'HR') return true;
    if (target.role === 'Team Leader') {
      const vt = viewer.team?.trim();
      const tt = target.team?.trim();
      return !!vt && !!tt && vt === tt;
    }
    return false;
  }

  return true;
}

/** @param {string | null | undefined} role @returns {'group' | 'hr_group' | 'tl_group' | null} */
export function groupScopeForRole(role) {
  const r = normalizeCrmRole(role);
  if (r === 'Admin') return 'group';
  if (r === 'HR') return 'hr_group';
  if (r === 'Team Leader') return 'tl_group';
  return null;
}

/** @param {string | null | undefined} role */
export function canCreateGroup(role) {
  return groupScopeForRole(role) != null;
}

/** @param {{ role: CrmRole }} user */
export function canAddToHrGroup(user) {
  return (
    user.role === 'Admin' ||
    user.role === 'HR' ||
    user.role === 'Team Leader' ||
    user.role === 'Employee'
  );
}

/** @param {{ role: CrmRole }} user */
export function canAddToTlGroup(user) {
  return (
    user.role === 'Admin' ||
    user.role === 'HR' ||
    user.role === 'Team Leader' ||
    user.role === 'Employee'
  );
}

/** @param {{ role: CrmRole }} user */
export function canAddToGroup(user) {
  return user.role !== 'Pending User';
}

/** @param {'group' | 'hr_group' | 'tl_group'} scope @param {{ role: CrmRole }} user */
export function memberEligibleForGroupScope(scope, user) {
  if (scope === 'hr_group') return canAddToHrGroup(user);
  if (scope === 'tl_group') return canAddToTlGroup(user);
  return canAddToGroup(user);
}

/** @param {'group' | 'hr_group' | 'tl_group' | null | undefined} scope @param {Record<string, unknown>} contact */
export function isEligibleGroupMemberContact(scope, contact) {
  if (!scope) return false;
  const u = asPermissionUser(contact);
  return !!u && memberEligibleForGroupScope(scope, u);
}

/**
 * @param {'group' | 'hr_group' | 'tl_group' | null | undefined} scope
 * @param {Array<Record<string, unknown>>} contacts
 */
export function filterEligibleGroupMemberContacts(scope, contacts) {
  if (!scope) return [];
  return (Array.isArray(contacts) ? contacts : []).filter((c) => isEligibleGroupMemberContact(scope, c));
}

/**
 * @param {Record<string, unknown> | null | undefined} server
 * @returns {import('@/utils/chat-permissions').ChatThreadShape}
 */
export function threadFromServer(server) {
  const kind = String(server?.kind || 'group');
  return {
    kind: kind === 'dm' ? 'dm' : 'group',
    scope: String(server?.scope || (kind === 'dm' ? 'dm' : 'group')),
    memberIds: Array.isArray(server?.memberIds) ? server.memberIds.map(String) : [],
    adminIds: Array.isArray(server?.adminIds) ? server.adminIds.map(String) : [],
    createdById: server?.createdById != null ? String(server.createdById) : undefined,
    privacyLockedInvites: !!server?.privacyLockedInvites,
    adminsOnlyMessages: !!server?.adminsOnlyMessages,
  };
}

/** @param {{ kind?: string, adminIds?: string[], createdById?: string }} thread */
export function groupThreadAdminIds(thread) {
  if (thread.kind !== 'group') return [];
  const fromRow = (thread.adminIds ?? []).map(String).filter(Boolean);
  if (fromRow.length > 0) return [...new Set(fromRow)];
  if (thread.createdById) return [String(thread.createdById)];
  return [];
}

/** @param {{ kind?: string, adminIds?: string[], createdById?: string }} thread @param {{ id: string, role: CrmRole } | null} user */
export function isGroupThreadAdmin(thread, user) {
  if (!user || thread.kind !== 'group') return false;
  if (user.role === 'Admin') return true;
  return groupThreadAdminIds(thread).includes(String(user.id));
}

/** @param {{ kind?: string, scope?: string, adminIds?: string[], createdById?: string }} thread @param {{ id: string, role: CrmRole } | null} user */
export function isGroupMessagingAdmin(thread, user) {
  if (thread.kind !== 'group') return true;
  if (!user) return false;
  return groupThreadAdminIds(thread).includes(String(user.id).trim());
}

/** @param {{ kind?: string, scope?: string, adminIds?: string[], createdById?: string }} thread @param {{ id: string, role: CrmRole } | null} user */
export function canManageGroupSettings(thread, user) {
  if (!user || thread.kind !== 'group') return false;
  if (isGroupThreadAdmin(thread, user)) return true;
  if (thread.scope === 'hr_group') return user.role === 'HR' || user.role === 'Admin';
  if (thread.scope === 'tl_group') {
    return user.role === 'HR' || user.role === 'Admin' || user.role === 'Team Leader';
  }
  return false;
}

/** @param {{ kind?: string, scope?: string, adminIds?: string[], createdById?: string }} thread @param {{ id: string, role: CrmRole } | null} user */
export function canDeleteGroup(thread, user) {
  return canManageGroupSettings(thread, user);
}

/**
 * Who may add people to an existing group thread.
 * @param {{ kind?: string, scope?: string, memberIds?: string[], adminIds?: string[], createdById?: string, privacyLockedInvites?: boolean }} thread
 * @param {{ id: string, role: CrmRole } | null} user
 */
export function canAddMembersToGroupThread(thread, user) {
  if (!user || thread.kind !== 'group' || !thread.memberIds?.includes(String(user.id))) return false;
  const privacy = !!thread.privacyLockedInvites;
  const gAdmin = isGroupThreadAdmin(thread, user);
  const cr = user.role;
  if (cr === 'Admin') return true;
  if (thread.scope === 'hr_group') {
    if (cr === 'HR') return true;
    if (privacy) return gAdmin;
    return gAdmin || thread.createdById === user.id;
  }
  if (thread.scope === 'tl_group') {
    if (cr === 'Team Leader') return true;
    if (privacy) return gAdmin;
    return gAdmin || thread.createdById === user.id;
  }
  if (thread.scope === 'group') {
    if (privacy) return gAdmin;
    return gAdmin || thread.createdById === user.id;
  }
  return gAdmin;
}

/**
 * Validate group creation before API call (mirrors CRM store).
 * @param {{
 *   viewer: { id: string, role: CrmRole } | null,
 *   scope: 'group' | 'hr_group' | 'tl_group' | null | undefined,
 *   memberIds: string[],
 *   resolveUser: (id: string) => { role: CrmRole } | null | undefined,
 *   name?: string,
 * }}
 */
export function validateCreateGroup({ viewer, scope, memberIds, resolveUser, name }) {
  if (!viewer) return { ok: false, error: 'Not signed in' };
  if (isPendingUserRole(viewer.role)) return { ok: false, error: 'Not allowed to create groups' };
  const trimmed = String(name || '').trim();
  if (!trimmed) return { ok: false, error: 'Name required' };
  const ids = Array.isArray(memberIds) ? memberIds.map(String).filter(Boolean) : [];
  if (ids.length < 1) return { ok: false, error: 'Select at least one member for the group' };
  if (!scope) return { ok: false, error: 'Not allowed to create groups' };

  const allIds = [...new Set([viewer.id, ...ids])];

  if (scope === 'group') {
    if (viewer.role !== 'Admin' && viewer.role !== 'HR' && viewer.role !== 'Team Leader') {
      return { ok: false, error: 'Not allowed to create groups' };
    }
    for (const id of allIds) {
      const u = resolveUser(id);
      if (!u || !canAddToGroup(u)) return { ok: false, error: 'Invalid member' };
    }
  } else if (scope === 'hr_group') {
    if (viewer.role !== 'HR' && viewer.role !== 'Admin') {
      return { ok: false, error: 'Only HR or Admin can create HR groups' };
    }
    for (const id of allIds) {
      const u = resolveUser(id);
      if (!u || !canAddToHrGroup(u)) {
        return { ok: false, error: 'Members must be Admin, HR, Team Leader, or Employee' };
      }
    }
  } else if (scope === 'tl_group') {
    if (viewer.role !== 'Team Leader') {
      return { ok: false, error: 'Only Team Leaders can create TL groups' };
    }
    for (const id of allIds) {
      const u = resolveUser(id);
      if (!u || !canAddToTlGroup(u)) {
        return { ok: false, error: 'Members must be HR, Team Leader, or Employee (not Admin)' };
      }
    }
  } else {
    return { ok: false, error: 'Invalid group type' };
  }

  return { ok: true };
}
