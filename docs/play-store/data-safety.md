# Google Play — Data safety form answers

These answers reflect the code as built (see `docs/supabase-setup.md` for the server tables). Re-check them whenever a feature changes.

## Overview questions

| Question | Answer |
|---|---|
| Does your app collect or share any of the required user data types? | **Yes**. Only when the user creates an optional account or buys a subscription. Core reminders collect nothing off the device. |
| Is all of the user data collected by your app encrypted in transit? | **Yes** (HTTPS/TLS to Supabase, RevenueCat and Expo push) |
| Do you provide a way for users to request that their data is deleted? | **Yes**, in the app: Settings → Delete all my data, which deletes server data and verifies it. Also list the web/email method from the privacy policy. |

## Data types

"Collected" in Play's sense means the data leaves the device. Data that stays on the phone is not declared.

| Data type (Play category) | Collected | Shared | Optional | Purposes | Notes |
|---|---|---|---|---|---|
| Personal info → **Phone number** | Yes | No | Yes (account is optional) | Account management | OTP sign-in. The SMS provider is a service provider, so this is not "sharing". |
| Personal info → **Name** | Yes | No | Yes | App functionality | The display name the user chose. It is shown to their invited caregiver; user-initiated transfers are exempt from "sharing". |
| Health and fitness → **Health info** | Yes | No | Yes (caregiver sharing only) | App functionality | Medicine label, dose time and status, sent only while caregiver sharing is on; kept at most 7 days. |
| App activity → **Other actions** | No | | | | Dose history stays on the device unless shared as above. |
| Photos and videos → **Photos** | **No** | | | | Prescription photos are processed on-device and never uploaded. |
| Device or other IDs | Yes | No | Yes | App functionality | Expo push token (caregiver alerts) and RevenueCat anonymous app user id. |
| Financial info → **Purchase history** | Yes | No | Yes | App functionality | RevenueCat entitlement check. Google Play handles payment. |
| App info and performance → **Crash logs** | No | | | | No crash SDK. Google Play's Android vitals are collected by Google, not by the app. |
| Location, contacts, messages, calendar, files, audio, web history | No | | | | |

For each collected type, answer **"Data is not processed ephemerally"** where applicable. For "Is this data required or optional?" answer **Optional**.

## Security practices

- Data encrypted in transit: **Yes**
- Users can request deletion: **Yes**
- Committed to the Play Families Policy: **No** (app not designed for children)
- Independent security review: **No** (consider MASA validation later)
