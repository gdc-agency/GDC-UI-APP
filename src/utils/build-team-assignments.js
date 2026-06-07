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
