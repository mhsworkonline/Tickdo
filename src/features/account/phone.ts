/**
 * Indian mobile numbers → E.164 (+91XXXXXXXXXX). Accepts common ways people type them:
 * "98765 43210", "098765-43210", "+91 98765 43210", "919876543210". Mobiles start with 6–9.
 */
export function normalizeIndianMobile(input: string): string | null {
  const digits = input.replace(/[^\d]/g, '');
  let local = digits;
  if (digits.length === 12 && digits.startsWith('91')) local = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) local = digits.slice(1);
  return /^[6-9]\d{9}$/.test(local) ? `+91${local}` : null;
}

/** "+919876543210" → "+91 98765 43210" for display. */
export function formatIndianMobile(e164: string): string {
  const m = /^\+91(\d{5})(\d{5})$/.exec(e164);
  return m ? `+91 ${m[1]} ${m[2]}` : e164;
}
