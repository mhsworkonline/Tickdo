# Tickdo

A medicine reminder app for India. Built with Expo (SDK 57), TypeScript and Expo Router; one codebase covers Android first and iOS second.

**Hard rules** (enforced in code and tests):
- No LLM or generative AI, and no paid cloud OCR. ESLint blocks those SDK imports. Prescription reading uses on-device Google ML Kit plus deterministic rules.
- The app never suggests, calculates or changes a dose or timing. Reminder times are never pre-filled.
- Nothing becomes a reminder until the user explicitly confirms it. There is no "confirm all".
- Scanned items show the text read from the photo next to the interpreted values.
- Health data is encrypted at rest (SQLCipher). Photos are deleted on confirm or after 7 days. Nothing goes to analytics.

## Run it

```sh
npm install
node runonemulator.js        # standalone app on the Android emulator: tap the icon, no server needed
node runonemulator.js --dev  # development app with live reload (keep the terminal open)
npm run verify               # typecheck + lint + 205 unit tests + 25 RLS tests
```

On a real phone without Android Studio: `npm run build:preview-apk` (EAS cloud build). It prints a link to an installable APK.

## Status

| # | Deliverable | Status |
|---|---|---|
| 1 | Scaffold, environment, folder structure | Done |
| 2 | Encrypted SQLite schema, migrations, pure functions + tests | Done |
| 3 | Manual add, Today screen, local notifications | Done. Verified on the Android 15 emulator: exact alarm, Taken from the notification, reboot re-arm. **Physical Xiaomi/Realme test still to do.** |
| 4 | Dose history, refill tracking | Done |
| 5 | Prescription scan (ML Kit), parser, confirmation | Done. **Accuracy study not yet run** (needs 100 real prescriptions); see `docs/accuracy-report.md`. |
| 6 | Supabase auth, schema, RLS + tests | Done (code and tests). **Needs your Supabase project and SMS (DLT) setup.** |
| 7 | RevenueCat paywall, free-tier limits | Done (code). **Needs RevenueCat and Play products.** |
| 8 | Caregiver sharing | Done (code). **Needs Supabase, plus FCM for push alerts.** |
| 9 | Play Store readiness | Docs and icons done. Placeholders need filling (see the release checklist). |
| 10 | iOS build readiness and checklist | Config and docs done. **Not compiled yet** (needs EAS and an Apple account). |

## Docs

- `docs/play-store/release-checklist.md`: everything left before release, in one list
- `docs/accuracy-report.md`: how to run the scan accuracy study (gate)
- `docs/catalog.md`: importing the licensed medicine list
- `docs/supabase-setup.md`, `docs/revenuecat-setup.md`
- `docs/play-store/`: privacy policy, Data safety answers, content rating, declarations, listing
- `docs/ios/checklist.md`

## Structure

```
src/app/              Expo Router screens (onboarding, tabs, medicine, scan, settings, caregiver)
src/domain/           Pure logic: IST time, schedules, dose status, history, refill, frequency table
src/data/             SQLCipher database, migrations, repositories (tested against real SQLite)
src/features/
  notifications/      Reminder plan (pure) and scheduling, Taken/Snooze/Skip handling
  scan/               Photo quality checks, OCR pipeline, deterministic parser, accuracy harness
  catalog/            Medicine list search (Fuse.js) and OCR matching (edit distance)
  setup/              Exact-alarm and battery guidance (Xiaomi, Realme, Vivo, Samsung)
  account/ caregiver/ plus/   Supabase auth, sharing, RevenueCat
src/services/         App services, background tasks (headless notification actions, maintenance)
src/i18n/             English and Hindi (key parity and usage are tested)
src/ui/               Design system: high contrast, 48dp+ targets, system font scaling
modules/tickdo-native Custom Expo module: ML Kit OCR, exact-alarm and battery status, OEM settings
supabase/             Migration with RLS, policy tests (PGlite), notify-overdue Edge Function
```
