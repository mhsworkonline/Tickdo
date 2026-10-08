import 'react-native-url-polyfill/auto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { openDatabase } from '@/data/database';

/**
 * Supabase is optional: it is only used for accounts and caregiver sharing. When the project
 * URL/key are not configured, every account feature reports "not set up" and the rest of the
 * app works normally.
 *
 * The auth session is stored in Tickdo's encrypted SQLite database, not in plain storage.
 */
const URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isServerConfigured = URL.length > 0 && ANON_KEY.length > 0;

const encryptedStorage = {
  async getItem(key: string) {
    const { repos } = await openDatabase();
    return repos.kv.get(`auth.${key}`);
  },
  async setItem(key: string, value: string) {
    const { repos } = await openDatabase();
    await repos.kv.set(`auth.${key}`, value);
  },
  async removeItem(key: string) {
    const { repos } = await openDatabase();
    await repos.kv.remove(`auth.${key}`);
  },
};

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isServerConfigured) return null;
  if (!client) {
    client = createClient(URL, ANON_KEY, {
      auth: { storage: encryptedStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    });
  }
  return client;
}

/** Forget the in-memory client (after sign-out or delete-all). */
export function resetSupabase() {
  client = null;
}
