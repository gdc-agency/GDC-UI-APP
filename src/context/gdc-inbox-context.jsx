import React, { createContext, useContext } from 'react';

import { useAuth } from '@/context/auth-context';
import { useGdcChatInbox } from '@/hooks/useGdcChatInbox';

const GdcInboxContext = createContext(/** @type {ReturnType<typeof useGdcChatInbox> | null} */ (null));

/**
 * Single inbox + socket instance for the whole dashboard (tab badges stay live off the messages screen).
 */
export function GdcInboxProvider({ children }) {
  const { token, user } = useAuth();
  const inbox = useGdcChatInbox({ token, user });
  return <GdcInboxContext.Provider value={inbox}>{children}</GdcInboxContext.Provider>;
}

export function useGdcInbox() {
  const ctx = useContext(GdcInboxContext);
  if (!ctx) {
    throw new Error('useGdcInbox must be used within GdcInboxProvider');
  }
  return ctx;
}
