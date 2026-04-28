import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const url = window.__SUPABASE_URL__ || localStorage.getItem('supabase_url') || '';
const anonKey = window.__SUPABASE_ANON_KEY__ || localStorage.getItem('supabase_anon_key') || '';

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = isSupabaseConfigured ? createClient(url, anonKey) : null;

export function saveSupabaseConfig(nextUrl, nextAnonKey) {
  localStorage.setItem('supabase_url', nextUrl);
  localStorage.setItem('supabase_anon_key', nextAnonKey);
  window.location.reload();
}
