/**
 * Release gate for the scan path (see docs/accuracy-report.md).
 * Until the accuracy study meets the drug-name error threshold set by the product owner, the scan
 * screens show a prominent "check against your prescription" warning. Manual entry stays the
 * default either way, and the scan path can always be turned off in Settings.
 */
export const SCAN_ACCURACY_GATE_PASSED = false;
