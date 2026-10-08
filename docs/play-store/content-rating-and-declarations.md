# Content rating, declarations and permissions

## IARC content rating questionnaire

| Item | Answer |
|---|---|
| Category | **Utility, Productivity, Communication, or Other** |
| Violence, fear, sexuality, profanity, gambling | No |
| Controlled substances: does the app depict or encourage illegal drugs, alcohol or tobacco? | **No**. It records prescription medicines the user enters; there is no drug-use content. Mention "prescription medication reminders" in the notes. |
| Do users interact or exchange content? | **Yes, limited.** A user can share dose status with one caregiver they invite by phone number. There is no free-form chat or public content. |
| Does the app share the user's location? | No |
| Digital purchases | Yes (subscription) |
| Unrestricted internet or web browsing | No |

Expected result: **Everyone / 3+** (IARC). Apps with user interaction may show an "Users interact" notice.

## Target audience and content

- **Target age:** 18 and over. Do not select under-13 groups. This keeps the app out of the Families policy.
- **Ads:** "No, my app does not contain ads."

## Health apps declaration (Play Console → App content → Health apps)

- Features: **Medication and treatment management**. Also tick "reminders" if it is offered as a separate option.
- Not a medical device. The app does not diagnose, treat or advise, and it never suggests doses or timings.
- Disclaimer location: onboarding (must be accepted) and Settings → About.
- Health Connect: **not used**.

## Sensitive permissions

| Permission | Why it is needed | Play requirement |
|---|---|---|
| `SCHEDULE_EXACT_ALARM` | Medicine reminders must fire at the exact minute the user set. The user grants it in Settings; the app explains why first. | No declaration form, because the user grants it. Do **not** use `USE_EXACT_ALARM`, which is restricted to alarm-clock and calendar apps. |
| `POST_NOTIFICATIONS` | To show reminders | Runtime permission |
| `RECEIVE_BOOT_COMPLETED` | To re-arm reminders after a restart | None |
| `CAMERA` | Only when the user chooses to photograph a prescription | Runtime permission. The prompt explains the use. |
| `VIBRATE` | Reminder vibration | None |

Explicitly blocked in `app.json`: microphone, storage/media, location, overlay, and the advertising ID. Check the merged manifest (`android/app/src/main/AndroidManifest.xml` after prebuild) before each release.

## Store listing (draft)

**App name:** Tickdo – Medicine Reminder

**Short description (80 characters max):**
Simple medicine reminders, dose history and refill alerts. Works offline.

**Short description, Hindi:**
दवा लेने के आसान रिमाइंडर, खुराक का रिकॉर्ड और दवा खत्म होने की सूचना।

**Full description:**
Tickdo reminds you to take your medicines at exactly the times you choose, and keeps a clear record of every dose.

• Add medicines by typing, or by photographing your prescription. Tickdo reads it on your phone, and you check each medicine before anything is saved.
• Reminders with Taken, Snooze and Skip buttons, right in the notification
• Today's checklist and a day-by-day history of taken, skipped and missed doses
• Get warned before you run out of tablets (Plus)
• Share your doses with a family member, who is alerted if a dose is more than an hour late (Plus)
• Large text, high contrast, English and हिन्दी
• Works fully offline. Your medicines stay on your phone, encrypted.

Tickdo does not replace a doctor or pharmacist. It never suggests or changes doses or timings.

**Graphics needed:** 512×512 icon (`assets/images/icon.png`), 1024×500 feature graphic, phone screenshots of Today, adding a medicine, scan review, History and Settings. Make English and Hindi sets.
