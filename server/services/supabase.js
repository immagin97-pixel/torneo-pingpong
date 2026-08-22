import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;

if (supabaseUrl && supabaseServiceRoleKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    console.log('⚡ Conectado a Supabase PostgreSQL en:', supabaseUrl);
  } catch (err) {
    console.error('❌ Error inicializando cliente Supabase:', err);
  }
} else {
  console.log('ℹ️ Variables SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no configuradas aún. Utilizando modo fallback local.');
}

export function isSupabaseConfigured() {
  return supabase !== null;
}

export function getSupabaseClient() {
  return supabase;
}
