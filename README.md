# Browser Profile Manager

A mobile app built with Expo (React Native) for managing multiple independent browser profiles. Each profile has its own fingerprint, user-agent, proxy settings, and session storage — similar to anti-detect browser tools.

## Features

- **Multi-Profile Management**: Create, edit, delete 50+ browser profiles
- **Fingerprint Spoofing**: Each profile gets unique platform, language, screen, WebGL, canvas noise
- **Session Isolation**: localStorage/sessionStorage persisted per-profile via AsyncStorage
- **Multi Browser Grid**: Run multiple profiles simultaneously in 1x/2x/3x column grid
- **Master Mirror Mode**: Actions on master profile replicated to all others in real-time
- **Script Runner**: Execute custom JavaScript across selected profiles simultaneously
- **Dark Cyber Theme**: Indigo-based dark UI with Inter font family

## Tech Stack

- Expo SDK 56 (compatible with Expo Go)
- expo-router (file-based routing + tabs)
- react-native-webview
- @react-native-async-storage/async-storage
- TypeScript strict mode
- @expo-google-fonts/inter
- @expo/vector-icons (Feather)

## Getting Started

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go on your device.

## Project Structure

```
app/
  _layout.tsx           - Root layout (fonts, providers)
  (tabs)/
    _layout.tsx         - Tab navigation
    index.tsx           - Dashboard
    profiles.tsx        - Profile list + create
    sync.tsx            - Script runner + mirror config
    settings.tsx        - App settings
  profile/[id].tsx      - Profile detail/edit
  browser/[id].tsx      - Single profile browser
  browser/multi.tsx     - Multi-browser grid + mirror
  session/[id].tsx      - Session history
components/
  CompatWebView.tsx     - WebView/iframe wrapper
  ErrorBoundary.tsx     - Error boundary
context/
  ProfileContext.tsx    - Profiles CRUD + state
hooks/
  useColors.ts          - Theme colors
  useProfileSession.ts  - Session bridge (JS↔AsyncStorage)
types/
  profile.ts            - TypeScript types
```

## Known Limitations

- HTTP-only cookies use the OS shared cookie jar in Expo Go (no full isolation without custom dev client)
- Mirror mode uses CSS selectors that may not work with dynamic class names (Tailwind JIT, CSS Modules)
