import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ListingCardSkeleton } from "@/components/ui/listing-card-skeleton";
import { Rocket, TrendingUp, Clock, CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { LazyCarousel } from "@/components/LazyCarousel";

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
  profiles?: {
    username: string;
  };
}

const CampaignCard = ({ campaign }: { campaign: Campaign }) => {
  const navigate = useNavigate();
  const percentFunded = Math.min(
    100,
    (campaign.current_pledged_cents / campaign.funding_goal_cents) * 100
  );
  
  const daysRemaining = Math.ceil(
    (new Date(campaign.ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div
      onClick={() => navigate(`/crowdfund/campaign/${campaign.slug}`)}
      className="group cursor-pointer bg-card border rounded-lg overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
    >
      <div className="aspect-video relative overflow-hidden bg-muted">
        {campaign.cover_image_url ? (
          <img
            src={campaign.cover_image_url}
            alt={campaign.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Rocket className="w-12 h-12 text-muted-foreground" />
          </div>
        )}
      </div>
      
      <div className="p-4 space-y-3">
        <div className="space-y-1">
          <h3 className="font-bold text-lg line-clamp-2 group-hover:text-primary transition-colors">
            {campaign.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-1">
            by {campaign.profiles?.username || 'Anonymous'}
          </p>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2">
          {campaign.short_tagline}
        </p>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-semibold text-primary">
              ${(campaign.current_pledged_cents / 100).toLocaleString()}
            </span>
            <span className="text-muted-foreground">
              {percentFunded.toFixed(0)}% of ${(campaign.funding_goal_cents / 100).toLocaleString()}
            </span>
          </div>
          
          <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-500"
              style={{ width: `${percentFunded}%` }}
            />
          </div>
          
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{campaign.backers_count} backers</span>
            <span>{daysRemaining > 0 ? `${daysRemaining} days left` : 'Ended'}</span>
          </div>
        </div>

        <div className="pt-2">
          <span className="inline-block px-2 py-1 text-xs rounded-full bg-secondary text-secondary-foreground">
            {campaign.category}
          </span>
        </div>
      </div>
    </div>
  );
};

export default function Crowdfund() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [featuredCampaigns, setFeaturedCampaigns] = useState<Campaign[]>([]);
  const [endingSoonCampaigns, setEndingSoonCampaigns] = useState<Campaign[]>([]);
  const [recentCampaigns, setRecentCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      
      // Featured campaigns (highest funded)
      const { data: featuredRaw } = await supabase
        .from('campaigns')
        .select('*')
        .eq('status', 'live')
        .order('current_pledged_cents', { ascending: false })
        .limit(8);

      // Ending soon
      const { data: endingSoonRaw } = await supabase
        .from('campaigns')
        .select('*')
        .eq('status', 'live')
        .order('ends_at', { ascending: true })
        .limit(8);

      // Recently launched
      const { data: recentRaw } = await supabase
        .from('campaigns')
        .select('*')
        .eq('status', 'live')
        .order('created_at', { ascending: false })
        .limit(8);

      // Fetch creator profiles for all campaigns
      const allCreatorIds = [
        ...(featuredRaw || []),
        ...(endingSoonRaw || []),
        ...(recentRaw || [])
      ].map(c => c.creator_id);

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username')
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

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-20 px-4">
        <div className="max-w-6xl mx-auto text-center space-y-6">
          <h1 className="text-4xl md:text-6xl font-bold">
            Fund Your Next Comic Grail
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Support independent comic creators and bring epic stories to life
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button
              size="lg"
              onClick={() => {
                const element = document.getElementById('campaigns');
                element?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Explore Campaigns
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                if (!user) {
                  navigate('/auth');
                  return;
                }
                navigate('/crowdfund/launch');
              }}
            >
              <Rocket className="w-4 h-4 mr-2" />
              Launch a Project
            </Button>
          </div>
        </div>
      </section>

      {/* Campaigns Section */}
      <section id="campaigns" className="max-w-7xl mx-auto px-4 py-12 space-y-12">
        {/* Featured Campaigns */}
        <LazyCarousel>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold">Featured Campaigns</h2>
            </div>
            
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <ListingCardSkeleton key={i} />
                ))}
              </div>
            ) : featuredCampaigns.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {featuredCampaigns.map((campaign) => (
                  <CampaignCard key={campaign.id} campaign={campaign} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No featured campaigns yet
              </div>
            )}
          </div>
        </LazyCarousel>

        {/* Ending Soon */}
        <LazyCarousel>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold">Ending Soon</h2>
            </div>
            
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <ListingCardSkeleton key={i} />
                ))}
              </div>
            ) : endingSoonCampaigns.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {endingSoonCampaigns.map((campaign) => (
                  <CampaignCard key={campaign.id} campaign={campaign} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No campaigns ending soon
              </div>
            )}
          </div>
        </LazyCarousel>

        {/* Recently Launched */}
        <LazyCarousel>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold">Recently Launched</h2>
            </div>
            
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <ListingCardSkeleton key={i} />
                ))}
              </div>
            ) : recentCampaigns.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {recentCampaigns.map((campaign) => (
                  <CampaignCard key={campaign.id} campaign={campaign} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No recent campaigns
              </div>
            )}
          </div>
        </LazyCarousel>
      </section>
    </div>
  );
}
