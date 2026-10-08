# Medicine list (catalogue)

Tickdo searches a local list of medicines: brand, salt, strength and form. It is used in two places:
- the search box in **Add by typing** (Fuse.js, which suits as-you-type search);
- **prescription scanning** (whole-word edit distance; partial names never match).

## Licensing

The list **must** come from a source whose licence allows commercial use in a mobile app. The product owner supplies it. Do not scrape pharmacy websites or invent entries. Record the source and licence in this file when the list is added.

| Field | Value |
|---|---|
| Source | _to be supplied_ |
| Licence | _to be supplied_ |
| Version and date | _to be supplied_ |

Until the list is supplied, `assets/catalog/medicines.json` is an empty array. Manual entry still works: the user types the name, and it is saved as "not from list". Scanning then recognises nothing, so every line shows as "not recognised".

## Import

Prepare a UTF-8 CSV with a header row `brand,salt,strength,form`. Any column may be empty, but each row needs a brand or a salt. Then run:

```sh
node scripts/import-catalog.js path/to/medicines.csv
```

This writes `assets/catalog/medicines.json` with stable ids, after trimming and removing duplicates. Rebuild the app afterwards. The list is bundled into the app and works offline.

For `form`, use one of `tablet, capsule, syrup, drops, injection, cream, inhaler, other`. Common synonyms such as "tab", "cap", "susp" and "ointment" are mapped automatically.

Size: about 50,000 rows is fine. Matching uses an index by first letter.
