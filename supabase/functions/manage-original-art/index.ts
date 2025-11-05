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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user is admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user has admin role
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roles) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const artId = pathParts[pathParts.length - 1];

    // GET /manage-original-art - List all items
    if (req.method === 'GET' && !artId) {
      const visibility = url.searchParams.get('visibility');
      const search = url.searchParams.get('search');
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const offset = parseInt(url.searchParams.get('offset') || '0');

      let query = supabase
        .from('original_art')
        .select('*', { count: 'exact' })
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (visibility) {
        query = query.eq('visibility', visibility);
      }

      if (search) {
        query = query.or(`title.ilike.%${search}%,artist_name.ilike.%${search}%`);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('List error:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch art items' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ items: data, count }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /manage-original-art/:id - Get single item
    if (req.method === 'GET' && artId) {
      const { data, error } = await supabase
        .from('original_art')
        .select('*')
        .eq('id', artId)
        .single();

      if (error) {
        console.error('Get error:', error);
        return new Response(JSON.stringify({ error: 'Art item not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PATCH /manage-original-art/:id - Update item
    if (req.method === 'PATCH' && artId) {
      const body = await req.json();
      
      // Validation
      if (body.for_sale && !body.price) {
        return new Response(JSON.stringify({ error: 'Price is required when item is for sale' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Parse tags if provided as string
      if (body.tags && typeof body.tags === 'string') {
        body.tags = body.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
      }

      const { data, error } = await supabase
        .from('original_art')
        .update(body)
        .eq('id', artId)
        .select()
        .single();

      if (error) {
        console.error('Update error:', error);
        return new Response(JSON.stringify({ error: 'Failed to update art item' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('Original art updated:', artId);

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // DELETE /manage-original-art/:id - Delete item
    if (req.method === 'DELETE' && artId) {
      // Get item to find image URL
      const { data: artItem, error: fetchError } = await supabase
        .from('original_art')
        .select('image_url')
        .eq('id', artId)
        .single();

      if (fetchError || !artItem) {
        return new Response(JSON.stringify({ error: 'Art item not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Delete from database
      const { error: deleteError } = await supabase
        .from('original_art')
        .delete()
        .eq('id', artId);

      if (deleteError) {
        console.error('Delete error:', deleteError);
        return new Response(JSON.stringify({ error: 'Failed to delete art item' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Extract file path from URL and delete from storage
      try {
        const urlParts = artItem.image_url.split('/original-art/');
        if (urlParts.length > 1) {
          const filePath = urlParts[1];
          await supabase.storage.from('original-art').remove([filePath]);
        }
      } catch (storageError) {
        console.error('Storage cleanup error:', storageError);
        // Continue even if storage cleanup fails
      }

      console.log('Original art deleted:', artId);

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in manage-original-art:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
