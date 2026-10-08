# Android release checklist (Google Play)

## Blocking items the product owner must supply

- [ ] **Licensed medicine list** imported (`docs/catalog.md`)
- [ ] **Accuracy study** of at least 100 prescriptions run, and a drug-name error threshold set (`docs/accuracy-report.md`)
- [ ] **Privacy policy** finalised (placeholders filled in, legal review), hosted, and `EXPO_PUBLIC_PRIVACY_POLICY_URL` set
- [ ] **Hindi copy** reviewed by a native speaker, especially the disclaimer and the battery steps
- [ ] **Package name** confirmed. It is currently `in.tickdo.app`, and it cannot change after the first upload.
- [ ] Supabase project, SMS provider with **DLT registration**, Firebase (FCM) for caregiver push (`docs/supabase-setup.md`)
- [ ] RevenueCat project and Play subscription products (`docs/revenuecat-setup.md`)

## Physical device testing (spec requirement)

On at least one **Xiaomi or Realme** phone, plus one Samsung or Vivo if available. The emulator was used during development.

- [ ] Reminder fires on time with the screen off for 2+ hours (battery optimisation on, then off)
- [ ] Taken, Snooze and Skip from the notification with the app swiped away
- [ ] Reboot the phone: Diagnostics shows the same scheduled count, and the next reminder fires
- [ ] Battery guidance opens the right OEM screens
- [ ] Scan: a printed and a handwritten prescription, in good and poor light
- [ ] Largest system font size: no clipped text and all buttons reachable
- [ ] TalkBack: every control has a label

## Build and submit

```sh
npm run verify                                   # typecheck, lint, unit tests, RLS tests
npx eas-cli build --profile production --platform android
npx eas-cli submit --platform android            # needs a Play service-account key
```

- [ ] First upload to **Internal testing**, then Closed testing. New personal developer accounts need **12 testers for 14 days** before production access.
- [ ] Play App Signing enabled (EAS manages the upload key)
- [ ] App content: privacy policy URL, Data safety (`data-safety.md`), content rating, target audience 18+, Health apps declaration, ads "No", **government apps "No"**, financial features "No"
- [ ] Store listing in English and Hindi, screenshots, feature graphic
- [ ] Release notes

## App size

The debug APK is about 130 MB and the release universal APK about 86 MB, mostly from the bundled ML Kit Latin and Devanagari models plus SQLCipher. Play delivers per-architecture splits from the AAB, so expect roughly 30–40 MB on a device. To shrink further, switch the Devanagari model to the Play-services (downloaded on demand) variant in `modules/tickdo-native/android/build.gradle`.
