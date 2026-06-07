# GDC Mobile App

Expo Router + React Native (JavaScript) CRM app for Global Digital Care.

## Structure

```
app/                 Expo Router routes (unchanged URLs)
assets/images/       Static images
src/
  components/        Reusable UI (chat, dashboard, ui)
  context/           React context providers
  data/              Constants + API + realtime
  hooks/             Custom hooks
  navigation/        Lazy loading + route map
  screens/           Screen components (auth, chat, dashboard…)
  theme/             Colors, animations, module styles
  utils/             Helpers
```

## Commands

```bash
npm install
npm start
npm run build:mobile
npm run generate:icons
```
