import { apiRequest } from '@/data/api/http';

/**
 * @param {string} token
 */
export async function getTeams(token) {
  return apiRequest('/api/teams/getTeams', { method: 'GET', token });
}

/** Team Leader / Employee: `{ team_name, members }` from Auth service. */
export async function getMyTeamRoster(token) {
  return apiRequest('/api/teams/my-team-roster', { method: 'GET', token });
}

/** Team Leader / Employee: Admin/HR + role-scoped team directory for chat/contact pickers. */
export async function getVisibleDirectory(token) {
  return apiRequest('/api/teams/visible-directory', { method: 'GET', token });
}

/**
 * @param {string} token
 * @param {{ name: string; department?: string; leader_id: number; employee_ids: number[] }} body
 */
export async function createTeam(token, body) {
  return apiRequest('/api/teams/createTeam', { method: 'POST', token, body });
}

/**
 * @param {string} token
 * @param {number|string} teamId
 */
export async function deleteTeam(token, teamId) {
  const id = encodeURIComponent(String(teamId));
  return apiRequest(`/api/teams/deleteTeam/${id}`, { method: 'DELETE', token });
}

/**
 * @param {string} token
 * @param {{ team_id: number; user_id: number }} body
 */
export async function detachMember(token, body) {
  return apiRequest('/api/teams/detach-member', { method: 'POST', token, body });
}

/**
 * @param {string} token
 * @param {{ team_id: number; employee_ids: number[] }} body
 */
export async function addEmployees(token, body) {
  return apiRequest('/api/teams/add-employees', { method: 'POST', token, body });
}

/**
 * @param {string} token
 * @param {{ user_id: number; target_team_id: number }} body
 */
export async function moveMember(token, body) {
  return apiRequest('/api/teams/move-member', { method: 'POST', token, body });
}
