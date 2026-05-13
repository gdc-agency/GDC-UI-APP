import { displayRoleFromDb } from '@/utils/admin-directory';

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const TEAMS_MGMT_ACCENTS = ['#2563eb', '#f97316', '#0d9488', '#8b5cf6', '#db2777', '#ca8a04'];

/** Avatar / profile image field from DB (Auth may return `profile_image`, app uses `avatar`). */
function avatarUrlFromUserRow(u) {
  if (!u || typeof u !== 'object') return null;
  const raw = u.avatar ?? u.profile_image ?? u.profileImage ?? u.photo ?? u.photo_url ?? u.photoUrl;
  if (raw == null) return null;
  const s = String(raw).trim();
  return s === '' ? null : s;
}

/** Roster summary role for collapsed row (most common member role; matches “Employee” line in reference UI). */
function lineRoleLabelFromMembers(members, leaderRole) {
  if (!Array.isArray(members) || members.length === 0) return leaderRole;
  const counts = {};
  for (const m of members) {
    const r = m.role || 'Employee';
    counts[r] = (counts[r] || 0) + 1;
  }
  let bestRole = leaderRole;
  let bestN = -1;
  for (const [r, n] of Object.entries(counts)) {
    if (n > bestN) {
      bestN = n;
      bestRole = r;
    }
  }
  return bestRole;
}

/**
 * Grouped teams + members for Teams Management expandable cards (GET teams + approved users).
 *
 * @param {Array<Record<string, unknown>>} teams
 * @param {Array<Record<string, unknown>>} userRows
 * @returns {Array<{ id: string; name: string; department: string; leaderName: string; leaderRole: string; leaderAvatarUrl: string | null; accent: string; members: { id: string; name: string; email: string; role: string; avatarUrl: string | null }[] }>}
 */
export function buildTeamsManagementGroups(teams, userRows) {
  const teamList = Array.isArray(teams) ? teams : [];
  const users = Array.isArray(userRows) ? userRows : [];
  const userById = new Map();
  for (const u of users) {
    const id = num(u.id ?? u.user_id);
    if (id != null) userById.set(id, u);
  }

  const out = [];
  let accentIdx = 0;

  for (const team of teamList) {
    const teamId = num(team.id);
    if (teamId == null) continue;

    const leaderId = num(team.leader_id ?? team.leaderId);
    const teamName = team.name != null ? String(team.name).trim() : 'Team';
    const teamDeptRaw = team.department != null ? String(team.department).trim() : '';
    const teamDeptFromTeam = teamDeptRaw !== '' ? teamDeptRaw : null;

    const leaderUser = leaderId != null ? userById.get(leaderId) : null;
    const leaderName =
      leaderUser?.name != null && String(leaderUser.name).trim()
        ? String(leaderUser.name).trim()
        : leaderId != null
          ? `User #${leaderId}`
          : '—';
    const leaderRole = leaderUser ? displayRoleFromDb(leaderUser.role) : 'Team Leader';
    const leaderAvatarUrl = leaderUser ? avatarUrlFromUserRow(leaderUser) : null;

    const roster = users.filter((u) => num(u.team_id ?? u.teamId) === teamId);
    const rosterIds = new Set(roster.map((u) => num(u.id ?? u.user_id)).filter((x) => x != null));

    /** @type {{ id: string; name: string; email: string; role: string; avatarUrl: string | null }[]} */
    const members = [];

    const pushMember = (u, uid) => {
      const deptUser = u.department != null && String(u.department).trim() !== '' ? String(u.department).trim() : null;
      const departmentLabel = teamDeptFromTeam ?? deptUser ?? '—';
      members.push({
        id: String(uid),
        name: u.name != null ? String(u.name) : '—',
        email: u.email != null ? String(u.email) : '',
        role: displayRoleFromDb(u.role),
        avatarUrl: avatarUrlFromUserRow(u),
        department: departmentLabel,
      });
    };

    for (const u of roster) {
      const uid = num(u.id ?? u.user_id);
      if (uid == null) continue;
      pushMember(u, uid);
    }

    if (leaderUser && leaderId != null && !rosterIds.has(leaderId)) {
      pushMember(leaderUser, leaderId);
    }

    members.sort((a, b) => {
      const tlFirst = (r) => (r === 'Team Leader' ? 0 : 1);
      const byRole = tlFirst(a.role) - tlFirst(b.role);
      if (byRole !== 0) return byRole;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });

    const department =
      teamDeptFromTeam ?? (members.find((m) => m.department && m.department !== '—')?.department ?? '—');

    const lineRoleLabel = lineRoleLabelFromMembers(members, leaderRole);

    out.push({
      id: String(teamId),
      name: teamName,
      department,
      leaderName,
      leaderRole,
      leaderAvatarUrl,
      lineRoleLabel,
      accent: TEAMS_MGMT_ACCENTS[accentIdx % TEAMS_MGMT_ACCENTS.length],
      members: members.map(({ id, name, email, role, avatarUrl }) => ({ id, name, email, role, avatarUrl })),
    });
    accentIdx += 1;
  }

  return out.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

/**
 * Build dashboard rows for "Teams by leader" from GET /api/teams/getTeams + approved users.
 *
 * @param {Array<Record<string, unknown>>} teams
 * @param {Array<Record<string, unknown>>} userRows - raw `users` rows (snake_case)
 * @returns {Array<{ id: string; gdcId: string; employee: string; email: string; role: string; team: string; department: string; tl: string }>}
 */
export function buildTeamAssignmentRows(teams, userRows) {
  const teamList = Array.isArray(teams) ? teams : [];
  const users = Array.isArray(userRows) ? userRows : [];
  const userById = new Map();
  for (const u of users) {
    const id = num(u.id ?? u.user_id);
    if (id != null) userById.set(id, u);
  }

  const rows = [];
  for (const team of teamList) {
    const teamId = num(team.id);
    if (teamId == null) continue;

    const leaderId = num(team.leader_id ?? team.leaderId);
    const teamName = team.name != null ? String(team.name).trim() : 'Team';
    const teamDeptRaw = team.department != null ? String(team.department).trim() : '';
    const teamDept = teamDeptRaw !== '' ? teamDeptRaw : null;

    const leaderUser = leaderId != null ? userById.get(leaderId) : null;
    const leaderName =
      leaderUser?.name != null && String(leaderUser.name).trim()
        ? String(leaderUser.name).trim()
        : leaderId != null
          ? `User #${leaderId}`
          : '—';

    const roster = users.filter((u) => num(u.team_id ?? u.teamId) === teamId);
    const rosterIds = new Set(roster.map((u) => num(u.id ?? u.user_id)).filter((x) => x != null));

    const pushRow = (u, uid) => {
      const deptUser = u.department != null && String(u.department).trim() !== '' ? String(u.department).trim() : null;
      const department = teamDept ?? deptUser ?? '—';
      rows.push({
        id: `ta-u${uid}`,
        gdcId: u.gdc_id != null ? String(u.gdc_id) : `ID-${uid}`,
        employee: u.name != null ? String(u.name) : '—',
        email: u.email != null ? String(u.email) : '',
        role: displayRoleFromDb(u.role),
        team: teamName,
        department,
        tl: leaderName,
      });
    };

    for (const u of roster) {
      const uid = num(u.id ?? u.user_id);
      if (uid == null) continue;
      pushRow(u, uid);
    }

    if (leaderUser && leaderId != null && !rosterIds.has(leaderId)) {
      pushRow(leaderUser, leaderId);
    }
  }

  return rows;
}
