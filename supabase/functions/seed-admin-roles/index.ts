import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminEmails = Deno.env.get('ADMIN_EMAILS');

    if (!adminEmails) {
      return new Response(
        JSON.stringify({ message: 'No ADMIN_EMAILS configured' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const emails = adminEmails.split(',').map((email) => email.trim());
    const results = [];

    for (const email of emails) {
      // Find user by email
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('username', email)
        .single();

      if (!profiles) {
        results.push({ email, status: 'user_not_found' });
        continue;
      }

      // Check if already has admin role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', profiles.user_id)
        .eq('role', 'admin')
        .single();

      if (existingRole) {
        results.push({ email, status: 'already_admin' });
        continue;
      }

      // Add admin role
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: profiles.user_id,
          role: 'admin',
        });

      if (error) {
        results.push({ email, status: 'error', error: error.message });
      } else {
        results.push({ email, status: 'admin_role_added' });
      }
    }

    console.log('Admin role seeding results:', results);

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in seed-admin-roles:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
