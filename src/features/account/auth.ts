import { registerServerDeletion, type ServerDeletion } from '@/features/account/delete-all';
import { getSupabase, resetSupabase } from '@/features/account/supabase';

export type Session = { userId: string; phone: string } | null;

export type AuthError = 'not_configured' | 'invalid_code' | 'offline' | 'unknown';

function classify(message: string | undefined): AuthError {
  const m = (message ?? '').toLowerCase();
  if (m.includes('token') || m.includes('otp') || m.includes('expired') || m.includes('invalid')) return 'invalid_code';
  if (m.includes('network') || m.includes('fetch')) return 'offline';
  return 'unknown';
}

export async function currentSession(): Promise<Session> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  const user = data.session?.user;
  return user ? { userId: user.id, phone: user.phone ? `+${user.phone.replace(/^\+/, '')}` : '' } : null;
}

/** Sends a one-time code by SMS. `phone` must already be normalised (+91…). */
export async function sendCode(phone: string): Promise<AuthError | null> {
  const sb = getSupabase();
  if (!sb) return 'not_configured';
  try {
    const { error } = await sb.auth.signInWithOtp({ phone });
    return error ? classify(error.message) : null;
  } catch {
    return 'offline';
  }
}

export async function verifyCode(phone: string, code: string, displayName: string): Promise<AuthError | null> {
  const sb = getSupabase();
  if (!sb) return 'not_configured';
  try {
    const { data, error } = await sb.auth.verifyOtp({ phone, token: code.trim(), type: 'sms' });
    if (error || !data.user) return classify(error?.message);
    // Profile holds only the display name the user chose; upsert is idempotent.
    await sb.from('profiles').upsert({ id: data.user.id, display_name: displayName.slice(0, 60) });
    return null;
  } catch {
    return 'offline';
  }
}

export async function signOut(): Promise<void> {
  const sb = getSupabase();
  await sb?.auth.signOut().catch(() => undefined);
  resetSupabase();
}

/** Deletes everything on the server for this user and checks nothing remains. */
async function deleteServerAccount(): Promise<ServerDeletion> {
  const sb = getSupabase();
  if (!sb) return 'skipped';
  const { data } = await sb.auth.getSession();
  if (!data.session) return 'skipped';
  const { data: remaining, error } = await sb.rpc('delete_my_account');
  if (error || remaining !== 0) return 'failed';
  await signOut();
  return 'done';
}

registerServerDeletion(deleteServerAccount);
