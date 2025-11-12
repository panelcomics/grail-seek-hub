import { createClient } from "@supabase/supabase-js";

// External Supabase for image storage only
const url = import.meta.env.VITE_EXTERNAL_SUPABASE_URL!;
const key = import.meta.env.VITE_EXTERNAL_SUPABASE_ANON_KEY!;

export const externalSupabase = createClient(url, key);
