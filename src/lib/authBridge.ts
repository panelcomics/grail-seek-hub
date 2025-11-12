import { supabase } from "@/integrations/supabase/client";
import { externalSupabase } from "@/lib/externalSupabase";

export function initAuthBridge() {
  supabase.auth.getSession().then(({ data }) => {
    if (data.session) externalSupabase.auth.setSession(data.session);
  });
  supabase.auth.onAuthStateChange((_e, session) => {
    if (session) externalSupabase.auth.setSession(session);
    else externalSupabase.auth.signOut();
  });
}
