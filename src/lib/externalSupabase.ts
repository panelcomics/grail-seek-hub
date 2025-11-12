import { createClient } from "@supabase/supabase-js";

// External Supabase for image storage only
const EXTERNAL_SUPABASE_URL = "https://yufspcdvwcbpmnzcspns.supabase.co";
const EXTERNAL_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1ZnNwY2Rrd2NicG5temNzcG5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0ODI1NTUsImV4cCI6MjA3ODA1ODU1NX0.HUnpBXiQjsWBJkZF8MjWqita5qTKSkUqbfsfOGbbSfw";

export const externalSupabase = createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_ANON_KEY);
