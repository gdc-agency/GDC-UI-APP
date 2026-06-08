import { displayRoleFromDb } from '@/utils/admin-directory';
import { resolveProfileImageUri } from '@/utils/chat-directory';

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
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
        avatarUrl: resolveProfileImageUri(u.profile_image ?? u.profileImage ?? u.avatar),
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

/**
 * @param {Array<{ tl?: string; team?: string; employee?: string; role?: string }>} rows
 */
export function filterTeamAssignmentRows(rows, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((r) =>
    `${r.employee} ${r.email} ${r.gdcId} ${r.team} ${r.department} ${r.role} ${r.tl}`
      .toLowerCase()
      .includes(q),
  );
}

/**
 * @param {ReturnType<typeof buildTeamAssignmentRows>} rows
 * @returns {Array<{ tl: string; teamNames: string[]; members: typeof rows }>}
 */
export function groupTeamAssignmentsByLeader(rows) {
  const byTl = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const tl = String(row.tl || '—').trim() || '—';
    let group = byTl.get(tl);
    if (!group) {
      group = { tl, teamNames: [], members: [] };
      byTl.set(tl, group);
    }
    const team = String(row.team || '').trim();
    if (team && !group.teamNames.includes(team)) group.teamNames.push(team);
    group.members.push(row);
  }
  for (const group of byTl.values()) {
    group.teamNames.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    group.members.sort((a, b) => {
      const tlFirst = (r) => (r === 'Team Leader' ? 0 : 1);
      const byRole = tlFirst(a.role) - tlFirst(b.role);
      if (byRole !== 0) return byRole;
      return String(a.employee || '').localeCompare(String(b.employee || ''), undefined, {
        sensitivity: 'base',
      });
    });
    const leadMember =
      group.members.find((m) => m.role === 'Team Leader' && m.employee === group.tl) ||
      group.members.find((m) => m.employee === group.tl);
    group.leaderAvatarUrl = leadMember?.avatarUrl || null;
  }
  return [...byTl.values()].sort((a, b) => a.tl.localeCompare(b.tl, undefined, { sensitivity: 'base' }));
}

function userNumericId(u) {
  return num(u?.id ?? u?.user_id);
}

function userTeamId(u) {
  return num(u?.team_id ?? u?.teamId);
}

/**
 * @param {Array<Record<string, unknown>>} userRows
 */
export function getUnassignedEmployees(userRows) {
  const users = Array.isArray(userRows) ? userRows : [];
  return users
    .filter((u) => {
      const role = displayRoleFromDb(u.role);
      return role === 'Employee' && userTeamId(u) == null;
    })
    .map((u) => {
      const uid = userNumericId(u);
      return {
        id: uid,
        name: u.name != null ? String(u.name) : '—',
        email: u.email != null ? String(u.email) : '',
        department: u.department != null ? String(u.department) : '',
        gdcId: u.gdc_id != null ? String(u.gdc_id) : '',
        avatarUrl: resolveProfileImageUri(u.profile_image ?? u.profileImage ?? u.avatar),
      };
    })
    .filter((u) => u.id != null)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

/**
 * @param {Array<Record<string, unknown>>} userRows
 */
export function getUnassignedTeamLeaders(userRows) {
  const users = Array.isArray(userRows) ? userRows : [];
  return users
    .filter((u) => displayRoleFromDb(u.role) === 'Team Leader' && userTeamId(u) == null)
    .map((u) => {
      const uid = userNumericId(u);
      return {
        id: uid,
        name: u.name != null ? String(u.name) : '—',
        email: u.email != null ? String(u.email) : '',
        avatarUrl: resolveProfileImageUri(u.profile_image ?? u.profileImage ?? u.avatar),
      };
    })
    .filter((u) => u.id != null)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

/**
 * Team-centric cards for list + detail UI.
 *
 * @param {Array<Record<string, unknown>>} teams
 * @param {Array<Record<string, unknown>>} userRows
 */
export function buildTeamCards(teams, userRows) {
  const teamList = Array.isArray(teams) ? teams : [];
  const users = Array.isArray(userRows) ? userRows : [];
  const userById = new Map();
  for (const u of users) {
    const id = userNumericId(u);
    if (id != null) userById.set(id, u);
  }

  const cards = [];
  for (const team of teamList) {
    const teamId = num(team.id);
    if (teamId == null) continue;

    const teamName = team.name != null ? String(team.name).trim() : 'Team';
    const teamDeptRaw = team.department != null ? String(team.department).trim() : '';
    const department = teamDeptRaw !== '' ? teamDeptRaw : null;
    const leaderId = num(team.leader_id ?? team.leaderId);
    const leaderUser = leaderId != null ? userById.get(leaderId) : null;
    const leaderName =
      leaderUser?.name != null && String(leaderUser.name).trim()
        ? String(leaderUser.name).trim()
        : leaderId != null
          ? `User #${leaderId}`
          : '—';

    const roster = users.filter((u) => userTeamId(u) === teamId);
    const memberIds = new Set(roster.map((u) => userNumericId(u)).filter((x) => x != null));

    const mapMember = (u, uid, isLeader = false) => {
      const deptUser = u.department != null && String(u.department).trim() !== '' ? String(u.department).trim() : null;
      return {
        id: uid,
        name: u.name != null ? String(u.name) : '—',
        email: u.email != null ? String(u.email) : '',
        role: displayRoleFromDb(u.role),
        department: department ?? deptUser ?? '—',
        gdcId: u.gdc_id != null ? String(u.gdc_id) : `ID-${uid}`,
        avatarUrl: resolveProfileImageUri(u.profile_image ?? u.profileImage ?? u.avatar),
        isLeader,
      };
    };

    const members = [];
    for (const u of roster) {
      const uid = userNumericId(u);
      if (uid == null) continue;
      members.push(mapMember(u, uid, uid === leaderId));
    }
    if (leaderUser && leaderId != null && !memberIds.has(leaderId)) {
      members.unshift(mapMember(leaderUser, leaderId, true));
    }

    members.sort((a, b) => {
      if (a.isLeader !== b.isLeader) return a.isLeader ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });

    cards.push({
      id: teamId,
      name: teamName,
      department,
      leaderId,
      leaderName,
      leaderEmail: leaderUser?.email != null ? String(leaderUser.email) : '',
      leaderAvatarUrl: leaderUser
        ? resolveProfileImageUri(leaderUser.profile_image ?? leaderUser.profileImage ?? leaderUser.avatar)
        : null,
      members,
      memberCount: members.length,
    });
  }

  return cards.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}
