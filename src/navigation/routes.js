/** Lazy-loaded screen modules — used by Expo Router route files in app/ */
export const screens = {
  welcome: () => import('../screens/auth/welcome-screen'),
  login: () => import('../screens/auth/login-screen'),
  home: () => import('../screens/dashboard/home-screen'),
  messages: () => import('../screens/chat/messages-screen'),
  groupInfo: () => import('../screens/chat/group-info-screen'),
  profile: () => import('../screens/profile/profile-screen'),
  notifications: () => import('../screens/notifications/notifications-screen'),
  routeDetail: () => import('../screens/dashboard/route-detail-screen'),
};

export { createLazyScreen } from './lazy-screen';
