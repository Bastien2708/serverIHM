import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL as string;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY as string;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

if ( !supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey ) {
  throw new Error('Supabase URL, Anon Key, and Service Role Key must be provided in environment variables.');
}

const options = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, options);
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, options);
