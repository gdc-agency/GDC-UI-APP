/**
 * GDC Auth Service — API clients (readable split by domain).
 */
export { deleteUserByHashId, login } from '@/services/api/auth-api';
export { getProfile, updateProfile } from '@/services/api/profile-api';
export {
  approveUser,
  createDepartment,
  deleteDepartment,
  getAllUsers,
  getAssignableUsers,
  getPendingUsersCount,
  getPendingUsersList,
  getWorkforceCount,
  listDepartments,
  rejectUser,
  updateUserRole,
} from '@/services/api/admin-api';
export {
  clearAllNotifications,
  createMyNotification,
  deleteNotification,
  deleteNotificationByEventKey,
  dispatchNotificationToUser,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  relayRealtimeNotificationEvents,
} from '@/services/api/notifications-api';
export { getMyTeamRoster, getTeams } from '@/services/api/teams-api';
export {
  addTaskComment,
  approveTask,
  createTask,
  deleteTask,
  forwardTaskToTeamLeader,
  getOverdueTasksCount,
  getPendingTasksCount,
  getTaskAssignableUsers,
  listTasks,
  sendTaskToReview,
  startTaskWork,
  submitTask,
  updateTask,
} from '@/services/api/task-api';
export {
  getLeadershipDailyOverview,
  getTeamLeaderDailyBundle,
  listMyEmployeeDailyUpdates,
  upsertHrDailySummary,
  upsertMyEmployeeDailyUpdate,
  upsertTeamLeaderDailySummary,
} from '@/services/api/daily-updates-api';
export { TaskApiError, taskApiRequest } from '@/services/api/task-http';
export {
  createGroupChat,
  listChatMessages,
  listChatThreads,
  markChatRead,
  openDmChat,
  postChatMessage,
} from '@/services/api/chat-api';
export { ChatApiError, chatApiRequest } from '@/services/api/chat-http';
export {
  approveLeaveRequest,
  approveManualTimeRequest,
  createLeaveRequest,
  createManualTimeRequest,
  getAttendance30Days,
  getAttendance7Days,
  getAttendanceSummary,
  getClockHistory,
  getClockRecords,
  getCurrentShift,
  getManualTimesheetRecords,
  getWorkStats,
  listLeaveRequests,
  listManualTimeRequests,
  rejectLeaveRequest,
  rejectManualTimeRequest,
  saveShiftTiming,
} from '@/services/api/attendance-api';
export { AttendanceApiError, attendanceApiRequest } from '@/services/api/attendance-http';
export { apiRequest, ApiError } from '@/services/api/http';
