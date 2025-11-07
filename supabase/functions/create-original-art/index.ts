import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validate file content by checking magic bytes
async function validateImageContent(file: File): Promise<{ valid: boolean; detectedType: string | null }> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  
  // Check JPEG magic bytes (FF D8 FF)
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return { valid: true, detectedType: 'image/jpeg' };
  }
  
  // Check PNG magic bytes (89 50 4E 47 0D 0A 1A 0A)
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47 &&
      bytes[4] === 0x0D && bytes[5] === 0x0A && bytes[6] === 0x1A && bytes[7] === 0x0A) {
    return { valid: true, detectedType: 'image/png' };
  }
  
  return { valid: false, detectedType: null };
}

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

    // Parse multipart form data
    const formData = await req.formData();
    const image = formData.get('image') as File;
    const title = formData.get('title') as string;
    const artistName = formData.get('artistName') as string;
    const description = formData.get('description') as string | null;
    const dateCreated = formData.get('dateCreated') as string | null;
    const medium = formData.get('medium') as string | null;
    const dimensions = formData.get('dimensions') as string | null;
    const tagsStr = formData.get('tags') as string | null;
    const forSale = formData.get('forSale') === 'true';
    const price = formData.get('price') ? parseFloat(formData.get('price') as string) : null;
    const provenance = formData.get('provenance') as string | null;
    const visibility = (formData.get('visibility') as string) || 'private';

    // Validation
    if (!image || !title || !artistName) {
      return new Response(JSON.stringify({ error: 'Image, title, and artist name are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (image.size > 10 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'Image must be less than 10MB' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(image.type)) {
      return new Response(JSON.stringify({ error: 'Only JPG and PNG images are allowed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate actual file content matches declared type
    const { valid: isValidImage, detectedType } = await validateImageContent(image);
    if (!isValidImage) {
      console.warn('Invalid file content detected. Claimed type:', image.type);
      return new Response(JSON.stringify({ error: 'File content does not match image format. Only valid JPG and PNG images are allowed.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('File validation passed. Detected type:', detectedType);

    if (forSale && !price) {
      return new Response(JSON.stringify({ error: 'Price is required when item is for sale' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Upload image to storage
    const fileExt = image.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('original-art')
      .upload(filePath, image, {
        contentType: image.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(JSON.stringify({ error: 'Failed to upload image' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('original-art')
      .getPublicUrl(filePath);

    // Parse tags
    const tags = tagsStr ? tagsStr.split(',').map((t: string) => t.trim()).filter(Boolean) : null;

    // Insert record into database
    const { data: artItem, error: dbError } = await supabase
      .from('original_art')
      .insert({
        image_url: publicUrl,
        title,
        artist_name: artistName,
        description,
        date_created: dateCreated,
        medium,
        dimensions,
        tags,
        for_sale: forSale,
        price,
        provenance,
        visibility,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      // Clean up uploaded image
      await supabase.storage.from('original-art').remove([filePath]);
      return new Response(JSON.stringify({ error: 'Failed to create art record' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Original art created successfully:', artItem.id);

    return new Response(JSON.stringify(artItem), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in create-original-art:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
