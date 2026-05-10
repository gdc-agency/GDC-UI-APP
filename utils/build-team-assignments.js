import { displayRoleFromDb } from '@/utils/admin-directory';

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
