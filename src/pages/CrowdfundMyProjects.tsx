import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ListingCardSkeleton } from "@/components/ui/listing-card-skeleton";
import { Plus, ExternalLink } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Progress } from "@/components/ui/progress";

interface Campaign {
  id: string;
  slug: string;
  title: string;
  status: string;
  funding_goal_cents: number;
  current_pledged_cents: number;
  backers_count: number;
  ends_at: string;
  cover_image_url: string | null;
}

export default function CrowdfundMyProjects() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadCampaigns();
  }, [user]);

  const loadCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('creator_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error loading campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "secondary",
      live: "default",
      successful: "default",
      failed: "destructive",
      cancelled: "outline",
    };
    return (
      <Badge variant={variants[status] || "default"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/crowdfund">Crowdfund</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>My Projects</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">My Campaigns</h1>
          <Button onClick={() => navigate('/crowdfund/launch')}>
            <Plus className="w-4 h-4 mr-2" />
            New Campaign
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <ListingCardSkeleton key={i} />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <p className="text-xl text-muted-foreground">No campaigns yet</p>
            <Button onClick={() => navigate('/crowdfund/launch')}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Campaign
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {campaigns.map((campaign) => {
              const percentFunded = Math.min(
                100,
                (campaign.current_pledged_cents / campaign.funding_goal_cents) * 100
              );
              const daysRemaining = Math.ceil(
                (new Date(campaign.ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
              );

              return (
                <div key={campaign.id} className="bg-card border rounded-lg overflow-hidden">
                  <div className="aspect-video relative bg-muted">
                    {campaign.cover_image_url ? (
                      <img
                        src={campaign.cover_image_url}
                        alt={campaign.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        No cover image
                      </div>
                    )}
                  </div>

                  <div className="p-4 space-y-4">
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-lg line-clamp-1">{campaign.title}</h3>
                      {getStatusBadge(campaign.status)}
                    </div>

                    {campaign.status === 'live' && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-semibold text-primary">
                            ${(campaign.current_pledged_cents / 100).toLocaleString()}
                          </span>
                          <span className="text-muted-foreground">
                            {percentFunded.toFixed(0)}% funded
                          </span>
                        </div>
                        <Progress value={percentFunded} />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{campaign.backers_count} backers</span>
                          <span>
                            {daysRemaining > 0 ? `${daysRemaining} days left` : 'Ended'}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => navigate(`/crowdfund/campaign/${campaign.slug}`)}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View
                      </Button>
                      {/* TODO: Add Edit and Manage Backers buttons */}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
