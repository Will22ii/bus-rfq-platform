import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set"
  );
}

// Failed to fetch / AuthRetryableFetchError 발생 시: .env.local의 URL·키 확인, 네트워크·방화벽·CORS 점검
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);
