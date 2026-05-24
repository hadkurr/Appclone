# Browser Profile Manager

A mobile app built with Expo (React Native) that manages multiple browser profiles — each profile is an independent browser with its own fingerprint, user-agent, proxy, and session persistence.

## Features

- **Profile Management**: Create, edit, delete, and duplicate browser profiles (50+ supported)
- **Fingerprint Spoofing**: Each profile gets a unique fingerprint (platform, language, screen, WebGL, canvas noise)
- **Multi Browser Grid**: Run multiple profiles simultaneously in 1x/2x/3x column layouts
- **Master Mirror Mode**: Select a master profile — all actions (scroll, click, input, navigation) are replayed on other profiles in real-time
- **Script Runner**: Execute JavaScript across selected profiles simultaneously
- **Session Persistence**: Each profile stores localStorage/sessionStorage independently via AsyncStorage
- **Dashboard**: Statistics, activity feed, and quick actions

## Tech Stack

- Expo SDK 56+ with New Architecture
- expo-router (file-based routing + tabs)
- react-native-webview (mobile) / iframe fallback (web)
- @react-native-async-storage/async-storage
- TypeScript strict mode
- Dark cyber indigo theme (#6366f1 primary, #0a0a14 background)

## Getting Started

```bash
npm install
npx expo start
```

Scan the QR code with **Expo Go** on your device.

## Project Structure

```
app/
  _layout.tsx              — Root layout (fonts, providers)
  (tabs)/
    _layout.tsx            — Tab bar
    index.tsx              — Dashboard
    profiles.tsx           — Profile list + creation
    sync.tsx               — Mirror & Script Runner config
    settings.tsx           — App settings
  profile/[id].tsx         — Profile detail/edit
  browser/[id].tsx         — Single profile browser
  browser/multi.tsx        — Multi-browser grid + mirror
  session/[id].tsx         — Session history
components/
  CompatWebView.tsx        — WebView (mobile) / iframe (web)
  ErrorBoundary.tsx
context/
  ProfileContext.tsx        — AsyncStorage CRUD for profiles
hooks/
  useColors.ts             — Theme colors
  useFingerprint.ts        — Fingerprint generation + injection JS
  useProfileSession.ts     — Storage bridge per profile
types/
  profile.ts               — TypeScript interfaces
```

## Known Limitations

- HTTP-only cookies use the OS shared cookie jar in Expo Go — full isolation requires a custom dev client
- Mirror mode uses CSS selector matching — may not work perfectly on pages with dynamic class names (Tailwind JIT, CSS modules)
