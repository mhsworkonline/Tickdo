# Tickdo Plus — RevenueCat setup

| | Free | Plus |
|---|---|---|
| Medicines | Up to 3 active | Unlimited |
| Profiles | 1 | 1 (multi-profile is not in v1; schema supports it later) |
| Reminders, history, scanning, refill tracking (days left) | ✓ | ✓ |
| Refill **alerts** (notification and banner when under 3 days) | | ✓ |
| Caregiver sharing | | ✓ |

**Safety rule:** reminders are never locked behind payment. If Plus lapses while the user has more than 3 medicines, every existing reminder keeps working. Only *adding* new medicines is blocked, and caregiver sharing and refill alerts pause.

## Steps

1. **Play Console:** create a subscription product, for example `tickdo_plus` with monthly and yearly base plans. Prices are a business decision; they are not set in code.
2. **RevenueCat:**
   - Create a project and add the Android app (`in.tickdo.app`) with the Play service-account credentials.
   - Create an entitlement with the identifier **`plus`** (it must match `ENTITLEMENT_ID` in `src/features/plus/purchases.ts`).
   - Attach the products to it, and create an Offering marked **current** that contains the packages.
3. Add the public SDK key to `.env` and to EAS secrets: `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_…`. Add `EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_…` later for iOS.
4. **Test:** use Play Console license testers and an internal-testing track build. A purchase made in the app should switch Settings to "Tickdo Plus is active".

**Without a key, the app runs on the free plan**, and the Plus screen says purchases are not set up yet.

## Privacy

RevenueCat receives an anonymous app user id and purchase receipts only. It never receives phone numbers, account ids, or any health data. The current plan is cached in the encrypted local database, so limits work offline.
