# iOS milestone (after Android is stable)

The same codebase builds for iOS with EAS. **Nothing here blocks Android.** iOS has **not been compiled yet**: building needs macOS or an EAS cloud build with an Apple Developer account. Expect to fix minor native issues on the first build. The Swift half of the custom `tickdo-native` module is written but unverified.

## What is already done in code

| Area | iOS behaviour |
|---|---|
| Config | Bundle id `in.tickdo.app`, camera usage text, time-sensitive notifications entitlement, background fetch/processing modes. Verified with `npx expo config --type introspect`. |
| Notifications | Permission asked during onboarding (Reminder setup step 1). Reminders use `interruptionLevel: timeSensitive`, so they break through Focus. **The 64 pending-notification limit** is respected (`MAX_SCHEDULED_IOS = 56`, rolling 3-day window, re-planned on open, on every action, and by the background task). |
| Exact alarms and battery | Android-only. Those steps are hidden on iOS. |
| OCR | `modules/tickdo-native/ios/TickdoNativeModule.swift` uses the GoogleMLKit TextRecognition (Latin and Devanagari) pods, on-device. |
| Purchases | RevenueCat with App Store. Set `EXPO_PUBLIC_REVENUECAT_IOS_KEY`. |
| Database encryption | SQLCipher (expo-sqlite). Key in the Keychain (`AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`). |

## Apple Developer setup

1. **Enrol in the Apple Developer Program** as an organisation. This needs a D-U-N-S number, which can take 1–2 weeks to obtain. Fee: USD 99 per year.
2. **Create the App ID** `in.tickdo.app` with Push Notifications and **Time Sensitive Notifications** capabilities. EAS can do this automatically.
3. **Create the app record in App Store Connect:** primary category **Medical** (or Health & Fitness), with name, subtitle and privacy policy URL.
4. **Push (caregiver alerts):** create an APNs key and upload it with `npx eas-cli credentials`. Expo's push service then reaches iOS caregivers.
5. **In-app purchases:** create the auto-renewable subscription group "Tickdo Plus" and connect it to RevenueCat with the App Store Connect API key and the in-app purchase key.

## Build

```sh
npx eas-cli build --profile development --platform ios   # dev client on a registered device
npx eas-cli build --profile production --platform ios
npx eas-cli submit --platform ios                          # fill the submit.production.ios values in eas.json
```

Note: GoogleMLKit pods historically do not support the arm64 iOS **simulator**. Test OCR on a physical iPhone.

## App Store Review notes (paste into "Notes for reviewer")

> Tickdo is a medication **reminder** app. Users enter medicines exactly as prescribed (or photograph a prescription; the photo is read on-device and every item must be confirmed manually). The app never calculates, suggests or changes doses or timings (Guideline 1.4.1) and shows a disclaimer that it does not replace a doctor or pharmacist (onboarding + Settings). No account is needed to review the app: tap through onboarding and choose "Not now" at sign-in. Caregiver sharing requires sign-in by SMS. A demo number and fixed code are configured for review: [DEMO PHONE] / [CODE] (configure a Supabase test OTP number). Subscriptions are managed through the App Store.

## App Privacy ("nutrition label")

Mirror `docs/play-store/data-safety.md`:
- **Data Linked to You:** Phone Number (account, optional), Name (display name, optional), Health (dose status, only when caregiver sharing is on), Purchases, Device ID (push token).
- **Data Not Collected:** photos, location, contacts, browsing, diagnostics (no crash SDK).
- **Tracking:** none, so no ATT prompt is needed.

## Export compliance

The app uses **SQLCipher** (non-Apple encryption) to protect user data at rest, plus HTTPS. This usually qualifies for an exemption, but **confirm the answer with counsel** before the first submission. `ITSAppUsesNonExemptEncryption` is deliberately **not** set in `app.json`, so App Store Connect asks on upload.

## Age rating

Answer **"Medical or Treatment Information: Infrequent/Mild"**. The expected rating is about 12+. Confirm against the current questionnaire.

## Device tests before submission

- [ ] Reminders fire with the phone locked and in Focus mode (time-sensitive)
- [ ] Taken, Snooze and Skip from a notification with the app terminated
- [ ] More than 56 upcoming reminders (for example 6 medicines × 4 times a day × 3 days): the earliest are scheduled, and the later ones arrive after re-planning
- [ ] Camera permission prompt text, and scanning on a physical device
- [ ] Dynamic Type at the largest size, and VoiceOver labels
- [ ] Restore purchases
