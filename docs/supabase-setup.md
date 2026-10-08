# Supabase setup

The server is used **only** for optional accounts and caregiver sharing. Reminders, history, scanning and refill tracking all work without it.

## 1. Create the project

1. Create a Supabase project. Choose region **ap-south-1 (Mumbai)** so data stays in India.
2. Add to `.env` (and to EAS secrets for cloud builds):
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>
   ```
   The anon key is public by design. Row Level Security protects the data.
3. Apply the schema:
   ```sh
   npx supabase link --project-ref <project-ref>
   npx supabase db push
   ```

## 2. Phone sign-in (OTP by SMS)

Authentication → Providers → **Phone**: enable it and connect an SMS provider (Twilio, MessageBird, Vonage or Textlocal).

**India-specific:** commercial SMS in India must be registered on the **DLT** platform (TRAI). That means a registered sender ID (header) and an approved OTP template, for example `Your Tickdo code is {#var#}. Do not share it.` Registration takes a few days. Start early, because OTP sign-in will not deliver messages to Indian numbers until it is approved.

Suggested settings: OTP expiry 5 minutes, and rate limits left on.

## 3. Caregiver overdue alerts

1. **Push credentials:** Android pushes go through Firebase Cloud Messaging. Create a Firebase project, download `google-services.json`, set `android.googleServicesFile` in `app.json`, and upload the FCM V1 key to EAS (`npx eas-cli credentials`). Without this, caregivers can still view the dose history in the app; they just won't get push alerts.
2. **Deploy the function:**
   ```sh
   npx supabase functions deploy notify-overdue --no-verify-jwt
   npx supabase secrets set CRON_SECRET=<long random string>
   ```
3. **Schedule it every 5 minutes.** Database → Extensions: enable `pg_cron` and `pg_net`, then run:
   ```sql
   select cron.schedule('tickdo-notify-overdue', '*/5 * * * *', $$
     select net.http_post(
       url := 'https://<project>.supabase.co/functions/v1/notify-overdue',
       headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>')
     );
   $$);
   ```

## 4. Tests

`npm run test:db` runs the migration and **every RLS policy and RPC** against real Postgres (PGlite, WebAssembly). It uses a stub of Supabase's `auth` schema (`supabase/tests/auth-stub.sql`) and needs no Docker. It is part of `npm run verify`.

## What is stored on the server

| Table | Contents | Who can read |
|---|---|---|
| `profiles` | The display name the user chose | The user, and their accepted caregiver |
| `caregiver_links` | Patient id, the caregiver's phone, status | The patient, and the invited phone number |
| `shared_doses` | Medicine label (for example "Metformin 500 mg"), dose time, taken/skipped/missed/pending, when it was recorded | The patient, and their accepted caregiver (only while sharing is on) |
| `push_tokens` | Expo push token | The owner |

Prescription photos, scan text, stock counts and notes are **never** uploaded. "Delete all my data" calls `delete_my_account()`, which removes every row above plus the auth user. It returns the number of rows left (must be 0), and the app checks that number.
