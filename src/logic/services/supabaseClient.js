import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

let supabaseClient = null;
let configSource = null;

export async function initSupabaseClient() {
  if (supabaseClient) return supabaseClient;

  const response = await fetch('./config/supabase.json', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Konfigurationsdatei konnte nicht geladen werden (${response.status}).`);
  }

  const config = await response.json();
  const url = config?.envKeys?.url?.trim();
  const anonKey = config?.envKeys?.anonKey?.trim();

  if (!url || !anonKey) {
    throw new Error('In config/supabase.json fehlen envKeys.url oder envKeys.anonKey.');
  }

  supabaseClient = createClient(url, anonKey);
  configSource = 'config/supabase.json';
  return supabaseClient;
}

export function getSupabaseClient() {
  if (!supabaseClient) {
    throw new Error('Supabase Client ist noch nicht initialisiert.');
  }
  return supabaseClient;
}

export function getSupabaseConfigSource() {
  return configSource;
}
