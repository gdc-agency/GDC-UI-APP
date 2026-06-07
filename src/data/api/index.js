/**
 * GDC Auth Service — API clients (readable split by domain).
 */
export { deleteUserByHashId, login } from '@/data/api/auth-api';
export { getProfile, updateProfile } from '@/data/api/profile-api';
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
} from '@/data/api/admin-api';
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
} from '@/data/api/notifications-api';
export { getMyTeamRoster, getTeams } from '@/data/api/teams-api';
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
} from '@/data/api/task-api';
export {
  getLeadershipDailyOverview,
  getTeamLeaderDailyBundle,
  listMyEmployeeDailyUpdates,
  upsertHrDailySummary,
  upsertMyEmployeeDailyUpdate,
  upsertTeamLeaderDailySummary,
} from '@/data/api/daily-updates-api';
export { TaskApiError, taskApiRequest } from '@/data/api/task-http';
export {
  createGroupChat,
  listChatMessages,
  listChatThreads,
  markChatRead,
  openDmChat,
  postChatMessage,
} from '@/data/api/chat-api';
export { ChatApiError, chatApiRequest } from '@/data/api/chat-http';
export {
  approveLeaveRequest,
  approveManualTimeRequest,
  createLeaveRequest,
  createManualTimeRequest,
  getAttendance30Days,
  getAttendance7Days,
  getAttendanceSummary,
  getClockHistory,
  getMyTodayStatus,
  getClockRecords,
  getCurrentShift,
  getManualTimesheetRecords,
  getWorkStats,
  listLeaveRequests,
  listManualTimeRequests,
  rejectLeaveRequest,
  rejectManualTimeRequest,
  saveShiftTiming,
} from '@/data/api/attendance-api';
export { AttendanceApiError, attendanceApiRequest } from '@/data/api/attendance-http';
export { apiRequest, ApiError } from '@/data/api/http';
