const lightChatTheme = {
  wallpaper: '#e5e7eb',
  bubbleOut: '#1686f7',
  bubbleIn: '#ffffff',
  bubbleOutText: '#ffffff',
  bubbleInText: '#111b21',
  groupSenderName: '#1e88e5',
  metaMuted: '#667781',
  replyBar: '#1e88e5',
  replyBg: '#f0f7ff',
  composerBar: '#ffffff',
  chromeBg: '#ffffff',
  inputBg: '#ffffff',
  inputPlaceholder: '#8696a0',
  inputIcon: '#8696a0',
  sendBtn: '#1285f7',
  sendBtnDisabled: '#a0c4f5',
  datePillBg: '#ffffff',
  datePillText: '#54656f',
  tickRead: '#53bdeb',
  link: '#027eb5',
  headerBorder: '#e9edef',
  roleBadgeBg: '#eaf2ff',
  roleBadgeText: '#1260c8',
  replyComposerBg: '#f8fbff',
  replyComposerBorder: '#dbe4fb',
  msgTimeOut: 'rgba(255,255,255,0.85)',
};

const darkChatTheme = {
  wallpaper: '#101820',
  bubbleOut: '#2B5295',
  bubbleIn: '#1E2732',
  bubbleOutText: '#ffffff',
  bubbleInText: '#ffffff',
  groupSenderName: '#60a5fa',
  metaMuted: '#8E99A3',
  replyBar: '#60a5fa',
  replyBg: '#151d27',
  composerBar: '#101820',
  chromeBg: '#0d1219',
  inputBg: '#1E2732',
  inputPlaceholder: '#8E99A3',
  inputIcon: '#8E99A3',
  sendBtn: '#2B5295',
  sendBtnDisabled: '#1a3358',
  datePillBg: '#1E2732',
  datePillText: '#8E99A3',
  tickRead: '#60a5fa',
  link: '#60a5fa',
  headerBorder: '#1a2332',
  roleBadgeBg: '#1e3a5f',
  roleBadgeText: '#93c5fd',
  replyComposerBg: '#151d27',
  replyComposerBorder: '#1E2732',
  msgTimeOut: 'rgba(147,197,253,0.88)',
};

/** @deprecated Prefer `useTheme().chatTheme` */
export const ChatTheme = lightChatTheme;

/** @param {boolean} isDark */
export function getChatTheme(isDark) {
  return isDark ? darkChatTheme : lightChatTheme;
}
