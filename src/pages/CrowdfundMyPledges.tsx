import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ListingCardSkeleton } from "@/components/ui/listing-card-skeleton";
import { formatDistanceToNow } from "date-fns";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";

interface Pledge {
  id: string;
  amount_cents: number;
  created_at: string;
  status: string;
  campaign_id: string;
  campaigns: {
    title: string;
    slug: string;
    cover_image_url: string | null;
  };
  campaign_rewards: {
    title: string;
  } | null;
}

export default function CrowdfundMyPledges() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadPledges();
  }, [user]);

  const loadPledges = async () => {
    try {
      const { data, error } = await supabase
        .from('campaign_pledges')
        .select(`
          *,
          campaigns(title, slug, cover_image_url),
          campaign_rewards(title)
        `)
        .eq('backer_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPledges(data || []);
    } catch (error) {
      console.error('Error loading pledges:', error);
    } finally {
      setLoading(false);
    }
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
              <BreadcrumbPage>My Pledges</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <h1 className="text-3xl font-bold mb-8">My Pledges</h1>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <ListingCardSkeleton key={i} />
            ))}
          </div>
        ) : pledges.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <p className="text-xl text-muted-foreground">
              You haven't backed any campaigns yet
            </p>
            <Link
              to="/crowdfund"
              className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Explore Campaigns
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {pledges.map((pledge) => (
              <div key={pledge.id} className="bg-card border rounded-lg p-4 flex gap-4">
                <div className="w-24 h-24 rounded overflow-hidden bg-muted flex-shrink-0">
                  {pledge.campaigns.cover_image_url ? (
                    <img
                      src={pledge.campaigns.cover_image_url}
                      alt={pledge.campaigns.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                      No image
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex justify-between items-start">
                    <Link
                      to={`/crowdfund/campaign/${pledge.campaigns.slug}`}
                      className="font-semibold hover:text-primary"
                    >
                      {pledge.campaigns.title}
                    </Link>
                    <Badge variant={pledge.status === 'paid' ? 'default' : 'secondary'}>
                      {pledge.status}
                    </Badge>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Reward: {pledge.campaign_rewards?.title || 'No reward tier'}
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-primary">
                      ${(pledge.amount_cents / 100).toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(pledge.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
