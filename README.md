# Tickdo

Medication reminder app for India. Expo (SDK 57) + TypeScript + Expo Router. Android first, iOS second, one codebase.

**Hard rules** (enforced in code review and, where possible, by lint):
- No LLM / generative AI, no paid cloud OCR or vision APIs. ESLint blocks known SDK imports (`eslint.config.js`).
- The app never suggests, calculates or changes a dose or timing.
- Nothing becomes a reminder until the user explicitly confirms it. No "confirm all".
- Health data never goes to analytics or third parties.

## Setup (Windows 11, no Android Studio needed)

1. Install Node 22 LTS (already present).
2. `npm install`
3. `cp .env.example .env` (values are only needed from Deliverable 6 onward).
4. Checks: `npm run verify` (typecheck + lint + tests).

### Getting the app on your Android phone

Tickdo uses native modules (notifications, ML Kit, encrypted SQLite), so it **does not run in Expo Go**.
Builds run in Expo's cloud and produce an `.apk` you install directly.

One-time:
```sh
npx eas-cli@latest login          # your Expo account
npx eas-cli@latest init           # links this folder to an Expo project (writes projectId into app.json)
```

Build an installable APK:
```sh
npm run build:preview-apk         # standalone app, no laptop needed to run it
npm run build:dev-apk             # development client: live-reloads from your laptop
```
When the build finishes (about 10–20 minutes), EAS prints a link and a QR code. Open it on the phone, download the APK, and allow "install unknown apps" when Android asks.

With the **development** APK installed, run `npm start` on the laptop with the phone on the same Wi-Fi network. Then open Tickdo on the phone and pick the server. Code changes appear on the phone straight away. You only need a new APK after adding or changing a native module.

## Folder structure

```
src/
  app/                 Expo Router routes only (screens + layouts)
    onboarding/        language → disclaimer → (optional sign-in, D6)
    (tabs)/            Today, Medicines, Dose log, Settings
  domain/              (D2) pure functions: schedule generation, dose status, refill math,
                       frequency lookup. No React, no I/O. 100% unit tested.
  data/                (D2) expo-sqlite (SQLCipher) schema, migrations, repositories
  features/
    notifications/     (D3) expo-notifications, exact-alarm permission, reboot rescheduling
    scan/              (D5) camera, image checks, ML Kit OCR, deterministic parser + fixtures
    battery/           (D3) OEM battery-restriction detection and guidance
  i18n/                i18next setup; locales/en.json, locales/hi.json (key parity is tested)
  state/               React context for app-wide state
  storage/             SecureStore-backed small preferences (not health data)
  ui/                  Accessible primitives: 48dp targets, font scaling, high contrast
  test-utils/          Jest mocks
supabase/              (D6) migrations, RLS policies, policy tests
```

## Deliverables

| # | Deliverable | Status |
|---|---|---|
| 1 | Scaffold, environment, folder structure | Done |
| 2 | Local DB schema, migrations, pure functions + tests | |
| 3 | Manual add, Today screen, local notifications on device | |
| 4 | Dose log, refill tracking | |
| 5 | Prescription scan (ML Kit), parser, confirmation, accuracy report | |
| 6 | Supabase auth, schema, RLS + tests | |
| 7 | RevenueCat paywall, free-tier limits | |
| 8 | Caregiver sharing | |
| 9 | Play Store readiness | |
| 10 | iOS build and checklist | |
