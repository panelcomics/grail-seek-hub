import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_EXTERNAL_SUPABASE_URL!;
const key = import.meta.env.VITE_EXTERNAL_SUPABASE_ANON_KEY!;

export const externalSupabase = createClient(url, key);
