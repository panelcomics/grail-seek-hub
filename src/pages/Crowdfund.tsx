import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ListingCardSkeleton } from "@/components/ui/listing-card-skeleton";
import { TrendingUp, Clock, Sparkles } from "lucide-react";
import { LazyCarousel } from "@/components/LazyCarousel";
import { CampaignCard } from "@/components/crowdfund/CampaignCard";
import { HeroSection } from "@/components/crowdfund/HeroSection";
import { CategoryChips } from "@/components/crowdfund/CategoryChips";
import { EmptyState } from "@/components/crowdfund/EmptyState";
import { useAuth } from "@/contexts/AuthContext";

interface Campaign {
  id: string;
  slug: string;
  title: string;
  short_tagline: string;
  cover_image_url: string | null;
  category: string;
  funding_goal_cents: number;
  current_pledged_cents: number;
  backers_count: number;
  ends_at: string;
  creator_id: string;
  is_demo?: boolean;
  profiles?: {
    username: string;
    avatar_url?: string;
  };
}

export default function Crowdfund() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [featuredCampaigns, setFeaturedCampaigns] = useState<Campaign[]>([]);
  const [endingSoonCampaigns, setEndingSoonCampaigns] = useState<Campaign[]>([]);
  const [recentCampaigns, setRecentCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    seedDemoCampaignsIfNeeded();
    loadCampaigns();
  }, []);

  const seedDemoCampaignsIfNeeded = async () => {
    try {
      // Check if any campaigns exist
      const { count } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true });

      // Only seed if no campaigns exist
      if (count === 0) {
        console.log('[CROWDFUND] No campaigns found, seeding demo campaigns...');
        const { data, error } = await supabase.functions.invoke('seed-demo-campaigns');
        
        if (error) {
          console.error('[CROWDFUND] Error seeding demo campaigns:', error);
        } else {
          console.log('[CROWDFUND] Demo campaigns seeded:', data);
        }
      }
    } catch (error) {
      console.error('[CROWDFUND] Error checking/seeding campaigns:', error);
    }
  };

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      
      // Featured campaigns (highest funded)
      const { data: featuredRaw } = await supabase
        .from('campaigns')
        .select('*')
        .eq('status', 'live')
        .order('current_pledged_cents', { ascending: false })
        .limit(12);

      // Ending soon
      const { data: endingSoonRaw } = await supabase
        .from('campaigns')
        .select('*')
        .eq('status', 'live')
        .order('ends_at', { ascending: true })
        .limit(12);

      // Recently launched
      const { data: recentRaw } = await supabase
        .from('campaigns')
        .select('*')
        .eq('status', 'live')
        .order('created_at', { ascending: false })
        .limit(12);

      // Fetch creator profiles for all campaigns
      const allCreatorIds = [
        ...(featuredRaw || []),
        ...(endingSoonRaw || []),
        ...(recentRaw || [])
      ].map(c => c.creator_id);

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', [...new Set(allCreatorIds)]);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const enrichCampaign = (campaign: any) => ({
        ...campaign,
        profiles: profileMap.get(campaign.creator_id)
      });

      setFeaturedCampaigns((featuredRaw || []).map(enrichCampaign));
      setEndingSoonCampaigns((endingSoonRaw || []).map(enrichCampaign));
      setRecentCampaigns((recentRaw || []).map(enrichCampaign));
    } catch (error) {
      console.error('Error loading campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterByCategory = (campaigns: Campaign[]) => {
    if (selectedCategory === "all") return campaigns;
    return campaigns.filter(c => c.category === selectedCategory);
  };

  const filteredFeatured = filterByCategory(featuredCampaigns);
  const filteredEndingSoon = filterByCategory(endingSoonCampaigns);
  const filteredRecent = filterByCategory(recentCampaigns);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <HeroSection />

      {/* Category Chips */}
      <CategoryChips 
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />

      {/* Campaigns Section */}
      <section id="campaigns" className="max-w-7xl mx-auto px-4 py-16 space-y-16">
        {/* Featured Campaigns */}
        <LazyCarousel>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-7 h-7 text-primary" />
                <h2 className="text-3xl font-bold">Featured Campaigns</h2>
              </div>
            </div>
            
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <ListingCardSkeleton key={i} />
                ))}
              </div>
            ) : filteredFeatured.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredFeatured.map((campaign) => (
                  <CampaignCard key={campaign.id} campaign={campaign} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon="trending"
                title="No featured campaigns"
                description={selectedCategory === "all" 
                  ? "Check back soon for new featured campaigns!"
                  : `No ${selectedCategory} campaigns featured right now. Try another category!`
                }
              />
            )}
          </div>
        </LazyCarousel>

        {/* Ending Soon */}
        <LazyCarousel>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="w-7 h-7 text-primary" />
                <h2 className="text-3xl font-bold">Ending Soon</h2>
              </div>
            </div>
            
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <ListingCardSkeleton key={i} />
                ))}
              </div>
            ) : filteredEndingSoon.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEndingSoon.map((campaign) => (
                  <CampaignCard key={campaign.id} campaign={campaign} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon="trending"
                title="No campaigns ending soon"
                description={selectedCategory === "all"
                  ? "All current campaigns have plenty of time left!"
                  : `No ${selectedCategory} campaigns ending soon.`
                }
              />
            )}
          </div>
        </LazyCarousel>

        {/* Recently Launched */}
        <LazyCarousel>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="w-7 h-7 text-primary" />
                <h2 className="text-3xl font-bold">Recently Launched</h2>
              </div>
            </div>
            
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <ListingCardSkeleton key={i} />
                ))}
              </div>
            ) : filteredRecent.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredRecent.map((campaign) => (
                  <CampaignCard key={campaign.id} campaign={campaign} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No recent campaigns"
                description={selectedCategory === "all"
                  ? "Be the first to launch a project and bring your comic vision to life!"
                  : `No ${selectedCategory} campaigns launched recently.`
                }
                actionLabel={user ? "Launch Your Project" : "Sign Up to Launch"}
                onAction={() => {
                  if (!user) {
                    navigate('/auth');
                  } else {
                    navigate('/crowdfund/launch');
                  }
                }}
              />
            )}
          </div>
        </LazyCarousel>
      </section>
    </div>
  );
}
