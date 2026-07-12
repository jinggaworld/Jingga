import dotenv from 'dotenv';
import path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Load .env FIRST before reading env vars (ESM hoists imports, so dotenv in index.ts runs too late)
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), 'apps/api/.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] SUPABASE_URL and SUPABASE_ANON_KEY are required. Database features will be unavailable.');
}

// Admin client (full access, uses service role key)
export const supabaseAdmin: SupabaseClient | null =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

// Public client (limited by RLS)
export const supabasePublic: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;
