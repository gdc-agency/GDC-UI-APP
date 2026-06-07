import React, { createContext, useContext, useMemo, useState } from 'react';

const ChatChromeContext = createContext({
  inConversation: false,
  setInConversation: () => {},
});

export function ChatChromeProvider({ children }) {
  const [inConversation, setInConversation] = useState(false);
  const value = useMemo(() => ({ inConversation, setInConversation }), [inConversation]);
  return <ChatChromeContext.Provider value={value}>{children}</ChatChromeContext.Provider>;
}

export function useChatChrome() {
  return useContext(ChatChromeContext);
}
