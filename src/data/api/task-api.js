import { taskApiRequest } from '@/data/api/task-http';

/**
 * @param {unknown} data
 * @returns {Array<Record<string, unknown>>}
 */
function extractTaskRows(data) {
  if (Array.isArray(data)) return /** @type {Array<Record<string, unknown>>} */ (data);
  if (!data || typeof data !== 'object') return [];
  const d = /** @type {{ data?: unknown; tasks?: unknown }} */ (data);
  if (Array.isArray(d.data)) return /** @type {Array<Record<string, unknown>>} */ (d.data);
  if (Array.isArray(d.tasks)) return /** @type {Array<Record<string, unknown>>} */ (d.tasks);
  return [];
}

/**
 * @param {unknown} data
 * @returns {Array<Record<string, unknown>>}
 */
function extractAssignableRows(data) {
  if (Array.isArray(data)) return /** @type {Array<Record<string, unknown>>} */ (data);
  if (!data || typeof data !== 'object') return [];
  const d = /** @type {{ data?: unknown; users?: unknown }} */ (data);
  if (Array.isArray(d.data)) return /** @type {Array<Record<string, unknown>>} */ (d.data);
  if (Array.isArray(d.users)) return /** @type {Array<Record<string, unknown>>} */ (d.users);
  return [];
}

/**
 * @param {string} token
 * @param {{ status?: string; q?: string; from?: string; to?: string }} [query]
 */
export async function listTasks(token, query = {}) {
  const params = new URLSearchParams();
  if (query.status) params.set('status', query.status);
  if (query.q) params.set('q', query.q);
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  const qs = params.toString();
  const path = `/api/getTasks${qs ? `?${qs}` : ''}`;
  const res = await taskApiRequest(path, { token });
  return extractTaskRows(res);
}

/** Assignable users for current JWT role (admin → HR, HR → team leaders, etc.) */
export async function getTaskAssignableUsers(token) {
  const res = await taskApiRequest('/api/assignable-users', { token });
  return extractAssignableRows(res);
}

/**
 * @param {string} token
 * @param {{ title: string; assigned_to: number; deadline?: string; description?: string; attachmentUri?: string; attachmentName?: string }} payload
 */
export async function createTask(token, payload) {
  const fd = new FormData();
  fd.append('title', payload.title);
  fd.append('assigned_to', String(payload.assigned_to));
  if (payload.deadline) fd.append('deadline', payload.deadline);
  if (payload.description) fd.append('description', payload.description);
  if (payload.attachmentUri) {
    const name = payload.attachmentName || 'attachment';
    fd.append('attachment', {
      uri: payload.attachmentUri,
      name,
      type: guessMimeType(name),
    });
  }
  return taskApiRequest('/api/createTask', { method: 'POST', token, body: fd, isFormData: true });
}

/**
 * @param {string} token
 * @param {number} taskId
 * @param {{ title?: string; assigned_to?: number; deadline?: string; description?: string; attachmentUri?: string; attachmentName?: string }} fields
 */
export async function updateTask(token, taskId, fields) {
  const fd = new FormData();
  if (fields.title != null) fd.append('title', fields.title);
  if (fields.assigned_to != null) fd.append('assigned_to', String(fields.assigned_to));
  if (fields.deadline != null) fd.append('deadline', fields.deadline);
  if (fields.description != null) fd.append('description', fields.description);
  if (fields.attachmentUri) {
    const name = fields.attachmentName || 'attachment';
    fd.append('attachment', {
      uri: fields.attachmentUri,
      name,
      type: guessMimeType(name),
    });
  }
  return taskApiRequest(`/api/updateTask/${taskId}`, { method: 'PUT', token, body: fd, isFormData: true });
}

/** @param {string} token @param {number} taskId */
export async function deleteTask(token, taskId) {
  return taskApiRequest(`/api/deleteTasks/${taskId}`, { method: 'DELETE', token });
}

/** @param {string} token @param {number} taskId @param {number} teamLeaderId */
export async function forwardTaskToTeamLeader(token, taskId, teamLeaderId) {
  return taskApiRequest(`/api/tasks/${taskId}/forward-to-tl`, {
    method: 'POST',
    token,
    body: { team_leader_id: teamLeaderId },
  });
}

/** @param {string} token @param {number} taskId */
export async function startTaskWork(token, taskId) {
  return taskApiRequest(`/api/tasks/${taskId}/start-work`, { method: 'POST', token, body: {} });
}

/**
 * @param {string} token
 * @param {number} taskId
 * @param {string} submissionNote
 */
export async function submitTask(token, taskId, submissionNote) {
  return taskApiRequest(`/api/tasks/${taskId}/submit`, {
    method: 'POST',
    token,
    body: { submission_note: submissionNote },
  });
}

/** @param {string} token @param {number} taskId */
export async function sendTaskToReview(token, taskId) {
  return taskApiRequest(`/api/tasks/${taskId}/send-review`, { method: 'POST', token, body: {} });
}

/** @param {string} token @param {number} taskId */
export async function approveTask(token, taskId) {
  return taskApiRequest(`/api/tasks/${taskId}/approve`, { method: 'POST', token, body: {} });
}

/**
 * @param {string} token
 * @param {number} taskId
 * @param {string} text
 */
export async function addTaskComment(token, taskId, text) {
  return taskApiRequest(`/api/tasks/${taskId}/comments`, {
    method: 'POST',
    token,
    body: { comment: text },
  });
}

/** @param {string} token @returns {Promise<number>} */
export async function getPendingTasksCount(token) {
  const res = await taskApiRequest('/api/pendingTasksCount', { token });
  const n = res && typeof res === 'object' && 'pendingTasks' in res ? Number(res.pendingTasks) : NaN;
  return Number.isFinite(n) ? n : 0;
}

/** @param {string} token @returns {Promise<number>} */
export async function getOverdueTasksCount(token) {
  const res = await taskApiRequest('/api/overdueTasksCount', { token });
  const n = res && typeof res === 'object' && 'overdueTasks' in res ? Number(res.overdueTasks) : NaN;
  return Number.isFinite(n) ? n : 0;
}

/** @param {string} fileName */
function guessMimeType(fileName) {
  const n = String(fileName || '').toLowerCase();
  if (n.endsWith('.pdf')) return 'application/pdf';
  if (n.endsWith('.png')) return 'image/png';
  if (n.endsWith('.jpg') || n.endsWith('.jpeg')) return 'image/jpeg';
  if (n.endsWith('.gif')) return 'image/gif';
  if (n.endsWith('.webp')) return 'image/webp';
  if (n.endsWith('.doc')) return 'application/msword';
  if (n.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  return 'application/octet-stream';
}
