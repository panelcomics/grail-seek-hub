// Crowdfunding creator dashboard — additive, progress-first
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CampaignStatusCard } from "@/components/crowdfund/CampaignStatusCard";
import { ActivitySnapshotCard } from "@/components/crowdfund/ActivitySnapshotCard";
import { NextActionCard } from "@/components/crowdfund/NextActionCard";
import { RecentUpdatesPreview } from "@/components/crowdfund/RecentUpdatesPreview";
import { LaunchTipsPanel } from "@/components/crowdfund/LaunchTipsPanel";
import { PostUpdateModal } from "@/components/crowdfund/PostUpdateModal";

interface Campaign {
  id: string;
  title: string;
  slug: string;
  status: string;
  ends_at: string;
  backers_count: number;
  current_pledged_cents: number;
  created_at: string;
}

interface Update {
  id: string;
  title: string;
  body_markdown: string;
  created_at: string;
}

export default function CreatorDashboard() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [recentPledgesCount, setRecentPledgesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false);

  useEffect(() => {
    if (slug && user) {
      loadCampaignData();
    }
  }, [slug, user]);

  const loadCampaignData = async () => {
    try {
      setLoading(true);

      // Load campaign
      const { data: campaignData, error: campaignError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("slug", slug)
        .single();

      if (campaignError) throw campaignError;

      // Verify ownership
      if (campaignData.creator_id !== user?.id) {
        toast.error("You don't have access to this campaign");
        navigate("/crowdfund/my-projects");
        return;
      }

      setCampaign(campaignData);

      // Load updates
      const { data: updatesData } = await supabase
        .from("campaign_updates")
        .select("*")
        .eq("campaign_id", campaignData.id)
        .order("created_at", { ascending: false });

      setUpdates(updatesData || []);

      // Load recent pledges count (last 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("campaign_pledges")
        .select("*", { count: "exact", head: true })
        .eq("campaign_id", campaignData.id)
        .gte("created_at", oneDayAgo);

      setRecentPledgesCount(count || 0);
    } catch (error) {
      console.error("Error loading campaign:", error);
      toast.error("Failed to load campaign");
      navigate("/crowdfund/my-projects");
    } finally {
      setLoading(false);
    }
  };

  const handlePostUpdate = async (data: { title: string; body: string }) => {
    if (!campaign || !user) return;

    try {
      setIsSubmittingUpdate(true);

      const { data: newUpdate, error } = await supabase
        .from("campaign_updates")
        .insert({
          campaign_id: campaign.id,
          author_id: user.id,
          title: data.title,
          body_markdown: data.body,
          is_public: true,
        })
        .select()
        .single();

      if (error) throw error;

      setUpdates([newUpdate, ...updates]);
      setPostModalOpen(false);
      toast.success("Update posted successfully!");
    } catch (error) {
      console.error("Error posting update:", error);
      toast.error("Failed to post update");
    } finally {
      setIsSubmittingUpdate(false);
    }
  };

  // Determine contextual subheader
  const getSubheader = () => {
    if (!campaign) return "";
    
    if (campaign.status === "live") {
      if (campaign.backers_count >= 10) {
        return "Backers are discovering your project";
      }
      if (campaign.backers_count > 0) {
        return "Momentum is building";
      }
      return "Your campaign is live";
    }
    
    if (campaign.status === "upcoming") {
      return "Your campaign is scheduled";
    }
    
    return "Campaign Dashboard";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return null;
  }

  // Check if campaign is new (within 48 hours)
  const isNewCampaign =
    Date.now() - new Date(campaign.created_at).getTime() < 48 * 60 * 60 * 1000;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            className="mb-4"
            onClick={() => navigate("/crowdfund/my-projects")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            My Projects
          </Button>

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Campaign Dashboard</h1>
              <p className="text-muted-foreground mt-1">{getSubheader()}</p>
            </div>
            <Button variant="outline" asChild>
              <Link to={`/crowdfund/${campaign.slug}`}>
                <ExternalLink className="h-4 w-4 mr-2" />
                View Campaign
              </Link>
            </Button>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Campaign Status - Always visible */}
          <CampaignStatusCard
            title={campaign.title}
            status={campaign.status as any}
            endsAt={campaign.ends_at}
          />

          {/* Activity Snapshot */}
          <ActivitySnapshotCard
            backersCount={campaign.backers_count}
            recentActivityCount={recentPledgesCount}
          />

          {/* Next Action */}
          <NextActionCard
            hasUpdates={updates.length > 0}
            onPostUpdate={() => setPostModalOpen(true)}
          />

          {/* Recent Updates Preview */}
          <div className="md:col-span-2">
            <RecentUpdatesPreview
              updates={updates}
              onEditUpdate={(id) => {
                // Could navigate to edit, for now just log
                console.log("Edit update:", id);
              }}
            />
          </div>

          {/* Launch Tips - Show for new campaigns */}
          {isNewCampaign && updates.length < 2 && (
            <div className="lg:col-span-1">
              <LaunchTipsPanel />
            </div>
          )}
        </div>

        {/* Footer confidence copy */}
        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">
            Consistent updates build backer confidence.
          </p>
        </div>
      </div>

      {/* Post Update Modal */}
      <PostUpdateModal
        open={postModalOpen}
        onOpenChange={setPostModalOpen}
        onSubmit={handlePostUpdate}
        isSubmitting={isSubmittingUpdate}
      />
    </div>
  );
}
