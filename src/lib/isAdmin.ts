import { supabase } from "@/integrations/supabase/client";

const ADMIN_EMAILS = [
  "@grailseeker.com",
  "@panelcomics.com"
];

// Hardcoded admin user IDs (add specific IDs if needed)
const ADMIN_USER_IDS: string[] = [];

export async function isAdmin(userId: string): Promise<boolean> {
  try {
    // First check if user has admin role in user_roles table
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (roleData) return true;

    // Check if user ID is in hardcoded list
    if (ADMIN_USER_IDS.includes(userId)) return true;

    // Check email domain
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      for (const domain of ADMIN_EMAILS) {
        if (user.email.endsWith(domain)) {
          return true;
        }
      }
    }

    return false;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}
