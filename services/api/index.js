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
export { getTeams } from '@/services/api/teams-api';
export { apiRequest, ApiError } from '@/services/api/http';
