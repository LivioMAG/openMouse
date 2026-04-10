import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = window.__SUPABASE_URL__;
const supabaseAnonKey = window.__SUPABASE_ANON_KEY__;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase-Konfiguration fehlt. Bitte window.__SUPABASE_URL__ und window.__SUPABASE_ANON_KEY__ setzen.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
