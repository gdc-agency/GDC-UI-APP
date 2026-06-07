import { getApiBaseUrl } from '@/data/constants/api-config';
import { io } from 'socket.io-client';

/** @type {import('socket.io-client').Socket | null} */
let socket = null;

export function getGdcSocket() {
  return socket;
}

/**
 * Connects to Auth service Socket.IO (same host as REST). Chat-Services relays new messages here (`receiveMessage`, `chat.thread.updated`).
 * @param {string} [token] - CRM JWT (reserved for future server-side socket auth)
 * @param {string | number} userId
 */
export function ensureGdcSocketConnected(token, userId) {
  const uid = String(userId ?? '').trim();
  if (!uid) return null;

  const url = getApiBaseUrl();

  if (!socket) {
    socket = io(url, {
      path: '/socket.io',
      transports: ['websocket'],
      auth: token ? { token } : {},
    });
    socket.on('connect', () => {
      socket?.emit('register', { userId: uid });
    });
    // NEW CODE ADDED FOR REAL-TIME MESSAGE RENDERING — re-register after reconnect (production-safe)
    socket.on('reconnect', () => {
      socket?.emit('register', { userId: uid });
    });
  } else {
    socket.auth = token ? { token } : {};
    if (socket.connected) {
      socket.emit('register', { userId: uid });
    } else {
      socket.connect();
    }
  }

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
}

export function disconnectGdcSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
