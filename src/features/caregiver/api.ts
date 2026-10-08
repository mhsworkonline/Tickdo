import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';

import { currentSession } from '@/features/account/auth';
import { getSupabase } from '@/features/account/supabase';
import type { SharedDose } from '@/features/caregiver/share';

export type Link = { id: string; caregiverPhone: string; status: 'pending' | 'accepted' | 'revoked' };
export type Invite = { id: string; patientId: string; patientName: string };
export type CaredFor = { linkId: string; patientId: string; patientName: string };
export type RemoteDose = SharedDose & { patient_id: string };

/** Rows are shared only while kept this long; older rows are removed by the patient's phone. */
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

function client() {
  const sb = getSupabase();
  if (!sb) throw new Error('not_configured');
  return sb;
}

// ── Patient side ──────────────────────────────────────────────────────────────

export async function myLink(): Promise<Link | null> {
  const session = await currentSession();
  if (!session) return null;
  const { data } = await client()
    .from('caregiver_links')
    .select('id, caregiver_phone, status')
    .eq('patient_id', session.userId)
    .in('status', ['pending', 'accepted'])
    .maybeSingle();
  return data ? { id: data.id as string, caregiverPhone: data.caregiver_phone as string, status: data.status as Link['status'] } : null;
}

export async function inviteCaregiver(phone: string): Promise<boolean> {
  const session = await currentSession();
  if (!session) return false;
  const { error } = await client().from('caregiver_links').insert({ patient_id: session.userId, caregiver_phone: phone });
  return !error;
}

/** Stops sharing and removes everything shared so far from the server. */
export async function stopSharing(linkId: string): Promise<void> {
  const session = await currentSession();
  if (!session) return;
  await client().from('caregiver_links').update({ status: 'revoked' }).eq('id', linkId);
  await client().from('shared_doses').delete().eq('patient_id', session.userId);
}

/** Uploads the current ±2 day window and prunes old rows. Idempotent; safe to retry offline. */
export async function syncSharedDoses(rows: readonly SharedDose[], now: number): Promise<void> {
  const session = await currentSession();
  if (!session) return;
  const sb = client();
  if (rows.length > 0) {
    await sb.from('shared_doses').upsert(
      rows.map((r) => ({ ...r, patient_id: session.userId, updated_at: new Date(now).toISOString() })),
      { onConflict: 'patient_id,dose_key' },
    );
  }
  await sb
    .from('shared_doses')
    .delete()
    .eq('patient_id', session.userId)
    .lt('scheduled_at', new Date(now - RETENTION_MS).toISOString());
}

export async function clearSharedDoses(): Promise<void> {
  const session = await currentSession();
  if (!session) return;
  await client().from('shared_doses').delete().eq('patient_id', session.userId);
}

// ── Caregiver side ────────────────────────────────────────────────────────────

async function names(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const { data } = await client().from('profiles').select('id, display_name').in('id', ids);
  return new Map((data ?? []).map((p) => [p.id as string, (p.display_name as string) || '']));
}

export async function incomingInvites(): Promise<Invite[]> {
  const session = await currentSession();
  if (!session) return [];
  const { data } = await client().from('caregiver_links').select('id, patient_id').eq('status', 'pending').neq('patient_id', session.userId);
  const rows = data ?? [];
  const n = await names(rows.map((r) => r.patient_id as string));
  return rows.map((r) => ({ id: r.id as string, patientId: r.patient_id as string, patientName: n.get(r.patient_id as string) ?? '' }));
}

export async function respondToInvite(linkId: string, accept: boolean): Promise<boolean> {
  const { error } = await client().rpc('respond_to_invite', { link: linkId, accept });
  if (!error && accept) await registerPushToken();
  return !error;
}

export async function caringFor(): Promise<CaredFor[]> {
  const session = await currentSession();
  if (!session) return [];
  const { data } = await client().from('caregiver_links').select('id, patient_id').eq('caregiver_id', session.userId).eq('status', 'accepted');
  const rows = data ?? [];
  const n = await names(rows.map((r) => r.patient_id as string));
  return rows.map((r) => ({ linkId: r.id as string, patientId: r.patient_id as string, patientName: n.get(r.patient_id as string) ?? '' }));
}

export async function leaveCaregiving(linkId: string): Promise<void> {
  await client().rpc('leave_caregiving', { link: linkId });
}

export async function patientDoses(patientId: string): Promise<RemoteDose[]> {
  const { data } = await client()
    .from('shared_doses')
    .select('patient_id, dose_key, medicine_label, scheduled_at, status, recorded_at')
    .eq('patient_id', patientId)
    .lte('scheduled_at', new Date(Date.now() + 60 * 60 * 1000).toISOString())
    .order('scheduled_at', { ascending: false });
  return (data ?? []) as RemoteDose[];
}

/** Registers this phone for caregiver alerts. Needs EAS project id + FCM credentials (see docs). */
export async function registerPushToken(): Promise<boolean> {
  try {
    const session = await currentSession();
    const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
    if (!session || !projectId) return false;
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return false;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    const { error } = await client().from('push_tokens').upsert({ user_id: session.userId, token });
    return !error;
  } catch {
    return false;
  }
}
