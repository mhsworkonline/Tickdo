# Prescription scan — accuracy report

**Status: NOT YET MEASURED.** The scan path ships behind a prominent "Check against your prescription" warning (`SCAN_ACCURACY_GATE_PASSED = false` in `src/features/scan/config.ts`). Users can turn scanning off in Settings, and manual entry is always available.

## What is required before release (from the product spec)

- At least **100 real prescriptions** from **different clinics**, including **handwritten** ones.
- Report these numbers:

| Metric | Definition used by the harness | Result |
|---|---|---|
| Drug-name error rate on presented items (most important) | Candidates shown to the user whose name is not on the paper ÷ all candidates | _pending_ |
| Strength error rate | Strengths read that disagree with the paper ÷ strengths read (for correctly named items) | _pending_ |
| Frequency error rate | Frequencies read that disagree with the paper ÷ frequencies read (for correctly named items) | _pending_ |
| Share of items needing edit or removal | Candidates with a wrong name, or a missing or wrong strength or frequency ÷ all candidates | _pending_ |
| Share of prescriptions where OCR returned nothing usable | `nothingUsable` cases ÷ prescriptions | _pending_ |
| (extra) Medicines on paper not offered | Paper items with no candidate ÷ paper items. These are added manually. | _pending_ |

**Release threshold for the drug-name error rate:** _to be set by the product owner._
If the result misses the threshold: release with the warning on (the current state) and keep manual entry as the default. Do not hide the scan path.

"Unclear" or missing values do not count as errors. The parser never guesses, so they always force the user to enter that field manually. They are counted under "needing edit".

## How to run the study

1. **Build the study app.** Run `npx eas-cli build --profile study --platform android`. Study builds set `EXPO_PUBLIC_ACCURACY_STUDY=1`, which adds an "Export OCR for accuracy study" button to the scan review screen. Production builds never include it.
2. **Get consent.** For each prescription, get written consent from the patient for use in the study. Remove names and phone numbers from the paper before photographing it where possible.
3. **Scan and export.** Scan in the study app, tap **Export OCR**, and save the file as `accuracy-data/<case-id>/ocr.json`. The `accuracy-data/` folder is git-ignored; never commit real prescriptions.
4. **Label the case.** Next to the export, write `truth.json`, filled in by a pharmacist from the paper:
   ```json
   { "handwritten": true, "clinic": "anonymised clinic id",
     "medicines": [ { "name": "Paracetamol", "strength": "500 mg", "frequency": "twice_daily" } ] }
   ```
   `frequency` must be one of: `once_daily`, `twice_daily`, `three_times_daily`, `four_times_daily`, `bedtime`, `as_needed`, or `null` if it is not stated.
5. **Run the harness.** Use the same licensed medicine list that ships in the app:
   ```sh
   ACCURACY_DATA=./accuracy-data ACCURACY_CATALOG=./assets/catalog/medicines.json npx jest accuracy
   ```
   It prints the metrics and writes `accuracy-data/report.json` with per-case details.
6. **Record the result.** Fill in the table above. If the gate passes, set `SCAN_ACCURACY_GATE_PASSED = true`.

## Field counts (after release)

Every finished scan stores **counts only** (no text) on the phone: candidates, confirmed as read, confirmed after edits, and removed (`scans` table). They never leave the device. They are there for support sessions and for the user's own Diagnostics.

## Known limitations

- **Devanagari (Hindi):** ML Kit's Devanagari model runs on-device, and Hindi lines are shown to the user as "not recognised" with the raw text. Hindi instructions (for example "सुबह-शाम") are **not** parsed into frequencies. Medicine names on Indian prescriptions are almost always in Latin script, so name matching is unaffected.
- **OD ambiguity:** in ophthalmology, "OD" can mean "right eye". The fixed table maps OD to once daily, as the spec requires. The source text is always shown so the user can catch this. Consider a rule that marks OD as unclear when the form is eye drops; this needs product sign-off.
- **OCR digit confusion** ("5OO mg") is never corrected. The strength is simply left empty.
- **Matching threshold:** `MATCH_THRESHOLD = 0.2` (edit-distance ratio) in `src/features/scan/parser.ts`. Partial names such as "Amlo" never match, so truncated brand names fall through to manual entry. Tune the threshold only with study data. A looser threshold raises the drug-name error rate.
- **Photo quality thresholds** (`DARK_MEAN`, `BLUR_VARIANCE` in `src/features/scan/quality.ts`) are starting values. Calibrate them on the study photos.
