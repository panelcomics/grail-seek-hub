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
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const baseUrl = 'https://your-domain.com'; // TODO: Replace with actual domain

    // Fetch active listings
    const { data: listings, error: listingsError } = await supabase
      .from('listings')
      .select('id, updated_at')
      .eq('status', 'active')
      .gt('quantity', 0);

    if (listingsError) throw listingsError;

    // Fetch seller profiles with listings
    const { data: sellers, error: sellersError } = await supabase
      .from('profiles')
      .select('username, updated_at')
      .gt('completed_sales_count', 0);

    if (sellersError) throw sellersError;

    // Generate XML sitemap
    let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
    sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Static pages
    const staticPages = [
      { url: '/', priority: '1.0', changefreq: 'daily' },
      { url: '/market', priority: '0.9', changefreq: 'hourly' },
      { url: '/sellers', priority: '0.8', changefreq: 'daily' },
      { url: '/events', priority: '0.7', changefreq: 'weekly' },
      { url: '/help', priority: '0.6', changefreq: 'monthly' },
    ];

    staticPages.forEach(page => {
      sitemap += '  <url>\n';
      sitemap += `    <loc>${baseUrl}${page.url}</loc>\n`;
      sitemap += `    <changefreq>${page.changefreq}</changefreq>\n`;
      sitemap += `    <priority>${page.priority}</priority>\n`;
      sitemap += '  </url>\n';
    });

    // Listing pages
    listings?.forEach(listing => {
      sitemap += '  <url>\n';
      sitemap += `    <loc>${baseUrl}/l/${listing.id}</loc>\n`;
      sitemap += `    <lastmod>${new Date(listing.updated_at).toISOString()}</lastmod>\n`;
      sitemap += '    <changefreq>weekly</changefreq>\n';
      sitemap += '    <priority>0.8</priority>\n';
      sitemap += '  </url>\n';
    });

    // Seller profile pages
    sellers?.forEach(seller => {
      if (seller.username) {
        const slug = seller.username.toLowerCase().replace(/\s+/g, '-');
        sitemap += '  <url>\n';
        sitemap += `    <loc>${baseUrl}/seller/${slug}</loc>\n`;
        sitemap += `    <lastmod>${new Date(seller.updated_at).toISOString()}</lastmod>\n`;
        sitemap += '    <changefreq>weekly</changefreq>\n';
        sitemap += '    <priority>0.7</priority>\n';
        sitemap += '  </url>\n';
      }
    });

    sitemap += '</urlset>';

    console.log(`Generated sitemap with ${(listings?.length || 0) + (sellers?.length || 0) + staticPages.length} URLs`);

    return new Response(sitemap, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml',
      },
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
