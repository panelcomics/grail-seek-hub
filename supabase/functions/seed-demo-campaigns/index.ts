import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if demo campaigns already exist
    const { data: existingDemo, error: checkError } = await supabaseClient
      .from('campaigns')
      .select('id')
      .eq('is_demo', true)
      .limit(1);

    if (checkError) throw checkError;

    if (existingDemo && existingDemo.length > 0) {
      return new Response(
        JSON.stringify({ message: 'Demo campaigns already seeded', seeded: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get a profile to use as creator (prefer current user, fallback to any)
    const authHeader = req.headers.get('Authorization');
    let creatorId = null;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabaseClient.auth.getUser(token);
      creatorId = user?.id;
    }

    // Fallback to any existing profile
    if (!creatorId) {
      const { data: profiles } = await supabaseClient
        .from('profiles')
        .select('user_id')
        .limit(1);
      
      if (profiles && profiles.length > 0) {
        creatorId = profiles[0].user_id;
      } else {
        throw new Error('No profiles found in database');
      }
    }

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Campaign 1: GrailSeeker: Temple of the Golden Slab
    const campaign1Id = crypto.randomUUID();
    await supabaseClient.from('campaigns').insert({
      id: campaign1Id,
      creator_id: creatorId,
      slug: 'grailseeker-temple-of-the-golden-slab',
      title: 'GrailSeeker: Temple of the Golden Slab',
      short_tagline: 'A whip-cracking, slab-cracking adventure for comic collectors.',
      category: 'Comic Series',
      funding_goal_cents: 2500000, // $25,000
      current_pledged_cents: 1875000, // $18,750 (75% funded)
      backers_count: 127,
      starts_at: now.toISOString(),
      ends_at: thirtyDaysFromNow.toISOString(),
      status: 'live',
      location: 'San Diego, CA',
      story_markdown: `Join intrepid grail hunter Dr. Evelyn Slab as she races through booby-trapped comic shops and ancient conventions to recover the world's most legendary graded comics before they fall into the wrong hands!

**What You'll Get:**
A 48-page full-color adventure comic that combines the excitement of treasure hunting with the passion of comic collecting. Think Indiana Jones meets your local comic shop!

**The Story:**
When a mysterious map surfaces pointing to the lost Temple of the Golden Slab — rumored to house the world's first CGC-graded comic — Dr. Slab must navigate treacherous dealers, rival collectors, and deadly deadline traps to claim the ultimate grail.

**Why We Need Your Support:**
Your backing will fund:
• Professional artwork by award-winning illustrators
• Premium printing with spot-gloss cover treatment
• Shipping to backers worldwide
• Stretch goals for bonus content!`,
      risks_markdown: `**Production Timeline:**
We've already completed scripts and pencils. With your support, we'll finish inking by Month 2, coloring by Month 3, and printing by Month 4.

**Shipping Challenges:**
International shipping costs have increased. We've budgeted accordingly, but delays are possible. We'll keep you updated every step of the way.`,
      is_demo: true,
    });

    // Rewards for Campaign 1
    await supabaseClient.from('campaign_rewards').insert([
      {
        campaign_id: campaign1Id,
        title: 'Digital Issue #1',
        description: 'PDF copy of Issue #1 plus exclusive digital wallpapers',
        pledge_amount_cents: 1000, // $10
        is_digital: true,
        includes_shipping: false,
        sort_order: 1,
      },
      {
        campaign_id: campaign1Id,
        title: 'Physical Issue #1',
        description: 'Physical copy of Issue #1 plus digital extras',
        pledge_amount_cents: 2500, // $25
        includes_shipping: true,
        sort_order: 2,
      },
      {
        campaign_id: campaign1Id,
        title: 'Grail Hunter Tier',
        description: 'Issue #1 with exclusive foil logo cover + print signed by creator',
        pledge_amount_cents: 6000, // $60
        includes_shipping: true,
        limit_quantity: 100,
        claimed_quantity: 47,
        sort_order: 3,
      },
      {
        campaign_id: campaign1Id,
        title: 'Golden Slab Tier',
        description: 'Limited metal cover edition + your name on the Grail Wall of Fame page',
        pledge_amount_cents: 15000, // $150
        includes_shipping: true,
        limit_quantity: 25,
        claimed_quantity: 12,
        sort_order: 4,
      },
    ]);

    // Stretch goals for Campaign 1
    await supabaseClient.from('campaign_stretch_goals').insert([
      {
        campaign_id: campaign1Id,
        target_amount_cents: 3000000, // $30k
        title: 'Spot-Gloss Upgrade',
        description: 'Enhanced spot-gloss treatment on cover + upgraded paper stock',
        is_unlocked: false,
        sort_order: 1,
      },
      {
        campaign_id: campaign1Id,
        target_amount_cents: 4000000, // $40k
        title: 'Bonus Backup Story',
        description: '8-page "Temple Heist" backup story featuring fan-favorite character',
        is_unlocked: false,
        sort_order: 2,
      },
      {
        campaign_id: campaign1Id,
        target_amount_cents: 5000000, // $50k
        title: 'Deluxe Slipcase',
        description: 'Custom slipcase for all backers at $60+ tier',
        is_unlocked: false,
        sort_order: 3,
      },
    ]);

    // Updates for Campaign 1
    await supabaseClient.from('campaign_updates').insert([
      {
        campaign_id: campaign1Id,
        author_id: creatorId,
        title: 'Behind the Scenes: Character Design',
        body_markdown: 'Check out these early sketches of Dr. Evelyn Slab! We went through dozens of iterations to get her look just right. What do you think?',
        is_public: true,
      },
      {
        campaign_id: campaign1Id,
        author_id: creatorId,
        title: 'Progress Update: 75% Funded!',
        body_markdown: 'WOW! Thank you so much to all 127 backers. We\'re 75% of the way there with 30 days still to go. Next stretch goal unlocks at $30k!',
        is_public: true,
      },
    ]);

    // Comments for Campaign 1
    await supabaseClient.from('campaign_comments').insert([
      {
        campaign_id: campaign1Id,
        author_id: creatorId,
        body: 'This looks amazing! When do you estimate delivery?',
      },
      {
        campaign_id: campaign1Id,
        author_id: creatorId,
        body: 'Love the concept! Will there be international shipping?',
      },
      {
        campaign_id: campaign1Id,
        author_id: creatorId,
        body: 'Just backed at the Grail Hunter tier. Can\'t wait for that foil cover!',
      },
    ]);

    // Campaign 2: Neon Knights
    const campaign2Id = crypto.randomUUID();
    await supabaseClient.from('campaigns').insert({
      id: campaign2Id,
      creator_id: creatorId,
      slug: 'neon-knights-synthwave-vigilantes',
      title: 'Neon Knights #1: Synthwave Vigilantes',
      short_tagline: 'A neon-drenched cyber-noir about DJs by day, vigilantes by night.',
      category: 'Graphic Novels',
      funding_goal_cents: 1800000, // $18,000
      current_pledged_cents: 1260000, // $12,600 (70% funded)
      backers_count: 89,
      starts_at: now.toISOString(),
      ends_at: thirtyDaysFromNow.toISOString(),
      status: 'live',
      location: 'Austin, TX',
      story_markdown: `By day, they spin records. By night, they fight crime.

**The Premise:**
In the neon-soaked streets of Neo-Austin, a crew of underground DJs discovers their music has the power to hack reality itself. When corporate syndicates threaten their community, they must turn their turntables into weapons.

**What Makes This Special:**
• Stunning cyberpunk visuals with hand-painted neon effects
• Original synthwave soundtrack included with digital editions
• A fresh take on the vigilante genre with music at its core

**The Creative Team:**
Written by acclaimed comic scribe Marcus Chen and illustrated by rising star Yuki Tanaka, this is a passion project years in the making.`,
      risks_markdown: `We've finished all scripts and character designs. The main risk is printing timeline — we're working with a trusted printer who has delivered on our previous projects.`,
      is_demo: true,
    });

    // Rewards for Campaign 2
    await supabaseClient.from('campaign_rewards').insert([
      {
        campaign_id: campaign2Id,
        title: 'Digital Edition',
        description: 'Digital graphic novel + soundtrack download',
        pledge_amount_cents: 1200, // $12
        is_digital: true,
        includes_shipping: false,
        sort_order: 1,
      },
      {
        campaign_id: campaign2Id,
        title: 'Softcover Edition',
        description: 'Physical softcover + digital edition + soundtrack',
        pledge_amount_cents: 3000, // $30
        includes_shipping: true,
        sort_order: 2,
      },
      {
        campaign_id: campaign2Id,
        title: 'Deluxe Hardcover',
        description: 'Hardcover with slipcase + all digital rewards + exclusive art print',
        pledge_amount_cents: 6500, // $65
        includes_shipping: true,
        limit_quantity: 50,
        claimed_quantity: 23,
        sort_order: 3,
      },
    ]);

    // Stretch goals for Campaign 2
    await supabaseClient.from('campaign_stretch_goals').insert([
      {
        campaign_id: campaign2Id,
        target_amount_cents: 2500000, // $25k
        title: 'Spot UV Treatment',
        description: 'Spot UV on all neon elements for extra pop',
        is_unlocked: false,
        sort_order: 1,
      },
      {
        campaign_id: campaign2Id,
        target_amount_cents: 3500000, // $35k
        title: 'Bonus Pin-Ups',
        description: '10 additional pin-up pages by guest artists',
        is_unlocked: false,
        sort_order: 2,
      },
    ]);

    // Updates for Campaign 2
    await supabaseClient.from('campaign_updates').insert([
      {
        campaign_id: campaign2Id,
        author_id: creatorId,
        title: 'Soundtrack Preview Available!',
        body_markdown: 'We just uploaded a preview track from the Neon Knights soundtrack. Check your backer updates for the exclusive link!',
        is_public: true,
      },
    ]);

    // Comments for Campaign 2
    await supabaseClient.from('campaign_comments').insert([
      {
        campaign_id: campaign2Id,
        author_id: creatorId,
        body: 'The art looks incredible! Backed for deluxe hardcover.',
      },
      {
        campaign_id: campaign2Id,
        author_id: creatorId,
        body: 'Will the soundtrack be available on streaming platforms?',
      },
    ]);

    // Campaign 3: Shadow of Crescent City
    const campaign3Id = crypto.randomUUID();
    await supabaseClient.from('campaigns').insert({
      id: campaign3Id,
      creator_id: creatorId,
      slug: 'shadow-of-crescent-city',
      title: 'Shadow of Crescent City',
      short_tagline: '13 horror stories set in a haunted New Orleans that never sleeps.',
      category: 'Anthologies',
      funding_goal_cents: 2200000, // $22,000
      current_pledged_cents: 1540000, // $15,400 (70% funded)
      backers_count: 103,
      starts_at: now.toISOString(),
      ends_at: thirtyDaysFromNow.toISOString(),
      status: 'live',
      location: 'New Orleans, LA',
      story_markdown: `13 tales of terror from the most haunted city in America.

**The Anthology:**
Shadow of Crescent City brings together 13 award-winning horror creators to tell spine-chilling stories set in the supernatural underbelly of New Orleans. From voodoo curses to vampire jazz clubs, these tales will haunt you long after you close the book.

**Featured Creators:**
This anthology includes stories by Eisner-nominated writers and artists who specialize in supernatural horror. Each tale is a standalone masterpiece that contributes to an overarching mystery.

**What You Get:**
A 200-page hardcover anthology featuring:
• 13 complete horror stories
• Full-color painted covers and chapter breaks
• Behind-the-scenes creator commentary
• Maps of haunted New Orleans locations`,
      risks_markdown: `With 13 creators involved, coordination is our biggest challenge. We've already completed 9 stories and have the remaining 4 in various stages. We're confident in our delivery timeline but will communicate any delays immediately.`,
      is_demo: true,
    });

    // Rewards for Campaign 3
    await supabaseClient.from('campaign_rewards').insert([
      {
        campaign_id: campaign3Id,
        title: 'Digital Anthology',
        description: 'Complete digital anthology in PDF, ePub, and mobi formats',
        pledge_amount_cents: 1500, // $15
        is_digital: true,
        includes_shipping: false,
        sort_order: 1,
      },
      {
        campaign_id: campaign3Id,
        title: 'Softcover Edition',
        description: 'Physical softcover + digital editions',
        pledge_amount_cents: 3500, // $35
        includes_shipping: true,
        sort_order: 2,
      },
      {
        campaign_id: campaign3Id,
        title: 'Numbered Hardcover',
        description: 'Signed & numbered hardcover limited to 250 copies + all digital rewards',
        pledge_amount_cents: 7500, // $75
        includes_shipping: true,
        limit_quantity: 250,
        claimed_quantity: 87,
        sort_order: 3,
      },
      {
        campaign_id: campaign3Id,
        title: 'Retailer Bundle',
        description: '5 copies of softcover for comic shop owners + digital edition',
        pledge_amount_cents: 12500, // $125
        includes_shipping: true,
        sort_order: 4,
      },
    ]);

    // Stretch goals for Campaign 3
    await supabaseClient.from('campaign_stretch_goals').insert([
      {
        campaign_id: campaign3Id,
        target_amount_cents: 3000000, // $30k
        title: 'Foil Logo Treatment',
        description: 'Metallic foil logo on hardcover edition',
        is_unlocked: false,
        sort_order: 1,
      },
      {
        campaign_id: campaign3Id,
        target_amount_cents: 4000000, // $40k
        title: 'Ribbon Bookmark',
        description: 'Sewn-in ribbon bookmark for hardcover edition',
        is_unlocked: false,
        sort_order: 2,
      },
      {
        campaign_id: campaign3Id,
        target_amount_cents: 5000000, // $50k
        title: 'Bonus 14th Story',
        description: 'Exclusive 14th story by surprise guest creator',
        is_unlocked: false,
        sort_order: 3,
      },
    ]);

    // Updates for Campaign 3
    await supabaseClient.from('campaign_updates').insert([
      {
        campaign_id: campaign3Id,
        author_id: creatorId,
        title: 'Creator Spotlight: Meet the Artists',
        body_markdown: 'Over the next few weeks, we\'ll be introducing each of our 13 talented creators. First up: Sarah Martinez, who brings us "The Last Streetcar."',
        is_public: true,
      },
    ]);

    // Comments for Campaign 3
    await supabaseClient.from('campaign_comments').insert([
      {
        campaign_id: campaign3Id,
        author_id: creatorId,
        body: 'New Orleans horror is my jam! Just backed the numbered hardcover.',
      },
      {
        campaign_id: campaign3Id,
        author_id: creatorId,
        body: 'Will this be available in comic shops after the campaign?',
      },
      {
        campaign_id: campaign3Id,
        author_id: creatorId,
        body: 'The art previews look stunning. Can\'t wait to read these stories!',
      },
    ]);

    console.log('✅ Successfully seeded 3 demo campaigns with all related data');

    return new Response(
      JSON.stringify({ 
        message: 'Demo campaigns seeded successfully', 
        seeded: true,
        campaigns: 3
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error seeding demo campaigns:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
