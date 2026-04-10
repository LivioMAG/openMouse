import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { loadSupabaseConfig } from './configLoader.js';

const { url, anonKey } = await loadSupabaseConfig();

export const supabase = createClient(url, anonKey);
