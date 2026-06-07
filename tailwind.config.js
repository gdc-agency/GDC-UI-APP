/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './src/**/*.{js,jsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        page: 'var(--color-page)',
        surface: 'var(--color-surface)',
        card: 'var(--color-card)',
        'surface-muted': 'var(--color-surface-muted)',
        text: {
          DEFAULT: 'var(--color-text)',
          muted: 'var(--color-text-muted)',
          secondary: 'var(--color-text-secondary)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          light: 'var(--color-border-light)',
          strong: 'var(--color-border-strong)',
        },
        input: {
          bg: 'var(--color-input-bg)',
          underline: 'var(--color-input-underline)',
          placeholder: 'var(--color-input-placeholder)',
        },
        primary: {
          DEFAULT: 'var(--color-primary)',
          mid: 'var(--color-primary-mid)',
          light: 'var(--color-primary-light)',
        },
        splash: {
          top: 'var(--color-splash-top)',
          mid: 'var(--color-splash-mid)',
          bottom: 'var(--color-splash-bottom)',
        },
        info: {
          bg: 'var(--color-info-bg)',
          text: 'var(--color-info-text)',
        },
        danger: {
          bg: 'var(--color-danger-bg)',
          border: 'var(--color-danger-border)',
          text: 'var(--color-danger-text)',
        },
        skeleton: {
          base: 'var(--color-skeleton-base)',
          highlight: 'var(--color-skeleton-highlight)',
        },
        chat: {
          wallpaper: 'var(--chat-wallpaper)',
          'bubble-out': 'var(--chat-bubble-out)',
          'bubble-in': 'var(--chat-bubble-in)',
          'bubble-out-text': 'var(--chat-bubble-out-text)',
          'bubble-in-text': 'var(--chat-bubble-in-text)',
          muted: 'var(--chat-meta-muted)',
          chrome: 'var(--chat-chrome-bg)',
          'header-border': 'var(--chat-header-border)',
          composer: 'var(--chat-composer-bar)',
          input: 'var(--chat-input-bg)',
          send: 'var(--chat-send-btn)',
          'send-disabled': 'var(--chat-send-btn-disabled)',
          'date-pill': 'var(--chat-date-pill-bg)',
          'date-pill-text': 'var(--chat-date-pill-text)',
          'role-badge-bg': 'var(--chat-role-badge-bg)',
          'role-badge-text': 'var(--chat-role-badge-text)',
          'reply-bg': 'var(--chat-reply-bg)',
          'reply-bar': 'var(--chat-reply-bar)',
          'reply-composer-bg': 'var(--chat-reply-composer-bg)',
          'reply-composer-border': 'var(--chat-reply-composer-border)',
          'msg-time-out': 'var(--chat-msg-time-out)',
          'group-sender': 'var(--chat-group-sender)',
        },
      },
      borderRadius: {
        card: '12px',
        pill: '999px',
      },
    },
  },
  plugins: [],
};
