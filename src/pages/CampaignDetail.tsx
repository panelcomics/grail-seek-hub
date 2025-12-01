import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Calendar, MapPin, Users, Clock, ExternalLink } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { formatDistanceToNow } from "date-fns";

interface Campaign {
  id: string;
  creator_id: string;
  slug: string;
  title: string;
  short_tagline: string;
  cover_image_url: string | null;
  video_url: string | null;
  category: string;
  funding_goal_cents: number;
  current_pledged_cents: number;
  backers_count: number;
  starts_at: string;
  ends_at: string;
  status: string;
  location: string | null;
  story_markdown: string;
  risks_markdown: string | null;
  created_at: string;
}

interface Reward {
  id: string;
  title: string;
  description: string;
  pledge_amount_cents: number;
  estimated_delivery_date: string | null;
  limit_quantity: number | null;
  claimed_quantity: number;
  includes_shipping: boolean;
  is_digital: boolean;
}

interface Update {
  id: string;
  title: string;
  body_markdown: string;
  created_at: string;
  author_id: string;
}

interface Comment {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  profiles?: {
    username: string;
  };
}

export default function CampaignDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [creator, setCreator] = useState<any>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [stretchGoals, setStretchGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    if (slug) {
      loadCampaign();
    }
  }, [slug]);

  const loadCampaign = async () => {
    try {
      setLoading(true);

      // Load campaign
      const { data: campaignData, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('slug', slug)
        .single();

      if (campaignError) throw campaignError;
      setCampaign(campaignData);

      // Load creator profile
      const { data: creatorData } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('user_id', campaignData.creator_id)
        .single();
      setCreator(creatorData);

      // Load rewards
      const { data: rewardsData } = await supabase
        .from('campaign_rewards')
        .select('*')
        .eq('campaign_id', campaignData.id)
        .order('pledge_amount_cents', { ascending: true });
      setRewards(rewardsData || []);

      // Load updates
      const { data: updatesData } = await supabase
        .from('campaign_updates')
        .select('*')
        .eq('campaign_id', campaignData.id)
        .eq('is_public', true)
        .order('created_at', { ascending: false });
      setUpdates(updatesData || []);

      // Load comments
      const { data: commentsRaw } = await supabase
        .from('campaign_comments')
        .select('*')
        .eq('campaign_id', campaignData.id)
        .order('created_at', { ascending: false });

      if (commentsRaw && commentsRaw.length > 0) {
        const authorIds = [...new Set(commentsRaw.map(c => c.author_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username')
          .in('user_id', authorIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        const enrichedComments = commentsRaw.map(c => ({
          ...c,
          profiles: profileMap.get(c.author_id)
        }));
        setComments(enrichedComments);
      }

      // Load stretch goals
      const { data: stretchData } = await supabase
        .from('campaign_stretch_goals')
        .select('*')
        .eq('campaign_id', campaignData.id)
        .order('target_amount_cents', { ascending: true });
      setStretchGoals(stretchData || []);

    } catch (error) {
      console.error('Error loading campaign:', error);
      toast.error('Campaign not found');
      navigate('/crowdfund');
    } finally {
      setLoading(false);
    }
  };

  const handlePledge = async (reward: Reward) => {
    if (!user) {
      toast.error('Please sign in to back this project');
      navigate('/auth');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-campaign-pledge', {
        body: {
          campaignId: campaign!.id,
          rewardId: reward.id,
          amountCents: reward.pledge_amount_cents,
        },
      });

      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      console.error('Error creating pledge:', error);
      toast.error('Failed to start checkout');
    }
  };

  const handleComment = async () => {
    if (!user) {
      toast.error('Please sign in to comment');
      return;
    }

    if (!commentText.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }

    try {
      setSubmittingComment(true);

      const { data, error } = await supabase
        .from('campaign_comments')
        .insert({
          campaign_id: campaign!.id,
          author_id: user.id,
          body: commentText.trim()
        })
        .select()
        .single();

      if (error) throw error;

      // Get user profile for the new comment
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id, username')
        .eq('user_id', user.id)
        .single();

      setComments([{ ...data, profiles: profile }, ...comments]);
      setCommentText("");
      toast.success('Comment posted!');
    } catch (error) {
      console.error('Error posting comment:', error);
      toast.error('Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading campaign...</p>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return null;
  }

  const percentFunded = Math.min(
    100,
    (campaign.current_pledged_cents / campaign.funding_goal_cents) * 100
  );

  const daysRemaining = Math.ceil(
    (new Date(campaign.ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
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
              <BreadcrumbPage>{campaign.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Media + Story */}
          <div className="lg:col-span-2 space-y-6">
            {/* Cover Image/Video */}
            <div className="aspect-video rounded-lg overflow-hidden bg-muted">
              {campaign.video_url ? (
                <div className="w-full h-full">
                  {/* Simple iframe for YouTube/Vimeo */}
                  <iframe
                    src={campaign.video_url}
                    className="w-full h-full"
                    allowFullScreen
                  />
                </div>
              ) : campaign.cover_image_url ? (
                <img
                  src={campaign.cover_image_url}
                  alt={campaign.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  No media
                </div>
              )}
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="updates">Updates ({updates.length})</TabsTrigger>
                <TabsTrigger value="comments">Comments ({comments.length})</TabsTrigger>
                <TabsTrigger value="backers">Backers</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6 mt-6">
                <div className="prose prose-sm max-w-none">
                  <h2 className="text-2xl font-bold mb-4">Story</h2>
                  <div className="whitespace-pre-wrap">{campaign.story_markdown}</div>
                </div>

                {campaign.risks_markdown && (
                  <div className="prose prose-sm max-w-none">
                    <h2 className="text-2xl font-bold mb-4">Risks & Challenges</h2>
                    <div className="whitespace-pre-wrap">{campaign.risks_markdown}</div>
                  </div>
                )}

                {stretchGoals.length > 0 && (
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold">Stretch Goals</h2>
                    {stretchGoals.map((goal) => (
                      <div
                        key={goal.id}
                        className={`border rounded-lg p-4 ${
                          goal.is_unlocked ? 'bg-primary/5 border-primary' : 'bg-card'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold">{goal.title}</h3>
                          {goal.is_unlocked && (
                            <Badge variant="default">Unlocked!</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          ${(goal.target_amount_cents / 100).toLocaleString()} goal
                        </p>
                        <p className="text-sm">{goal.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="updates" className="space-y-4 mt-6">
                {updates.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No updates yet
                  </div>
                ) : (
                  updates.map((update) => (
                    <div key={update.id} className="border rounded-lg p-6">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xl font-semibold">{update.title}</h3>
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(update.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <div className="whitespace-pre-wrap">{update.body_markdown}</div>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="comments" className="space-y-4 mt-6">
                {user && (
                  <div className="border rounded-lg p-4 space-y-3">
                    <Textarea
                      placeholder="Add a comment..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      rows={3}
                    />
                    <div className="flex justify-end">
                      <Button onClick={handleComment} disabled={submittingComment || !commentText.trim()}>
                        {submittingComment ? 'Posting...' : 'Post Comment'}
                      </Button>
                    </div>
                  </div>
                )}

                {comments.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No comments yet. Be the first to comment!
                  </div>
                ) : (
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-semibold">
                            {comment.profiles?.username || 'Backer'}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm">{comment.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="backers" className="mt-6">
                <div className="text-center py-12 space-y-2">
                  <Users className="w-12 h-12 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">
                    {campaign.backers_count} backer{campaign.backers_count !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Backer details are kept private
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column: Pledge Section */}
          <div className="space-y-6">
            {/* Campaign Info Card */}
            <div className="bg-card border rounded-lg p-6 space-y-4 sticky top-4">
              <div>
                <h1 className="text-2xl font-bold mb-2">{campaign.title}</h1>
                <p className="text-muted-foreground">{campaign.short_tagline}</p>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>by {creator?.username || 'Anonymous'}</span>
                {campaign.location && (
                  <>
                    <span>•</span>
                    <MapPin className="w-4 h-4" />
                    <span>{campaign.location}</span>
                  </>
                )}
              </div>

              <Badge>{campaign.category}</Badge>

              {/* Funding Progress */}
              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-3xl font-bold text-primary">
                    ${(campaign.current_pledged_cents / 100).toLocaleString()}
                  </span>
                  <span className="text-muted-foreground">
                    of ${(campaign.funding_goal_cents / 100).toLocaleString()}
                  </span>
                </div>
                <Progress value={percentFunded} />
                <div className="text-sm text-muted-foreground">
                  {percentFunded.toFixed(0)}% funded
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <div className="text-2xl font-bold">{campaign.backers_count}</div>
                  <div className="text-sm text-muted-foreground">backers</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {daysRemaining > 0 ? daysRemaining : 0}
                  </div>
                  <div className="text-sm text-muted-foreground">days to go</div>
                </div>
              </div>

              {campaign.status === 'live' && daysRemaining > 0 && (
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => {
                    const element = document.getElementById('rewards');
                    element?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  Back This Project
                </Button>
              )}

              {campaign.status !== 'live' && (
                <div className="text-center py-4 text-muted-foreground">
                  This campaign has ended
                </div>
              )}
            </div>

            {/* Rewards */}
            {campaign.status === 'live' && rewards.length > 0 && (
              <div id="rewards" className="space-y-4">
                <h2 className="text-xl font-bold">Reward Tiers</h2>
                {rewards.map((reward) => (
                  <div key={reward.id} className="bg-card border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-xl font-bold text-primary">
                          ${(reward.pledge_amount_cents / 100).toLocaleString()}
                        </div>
                        <h3 className="font-semibold mt-1">{reward.title}</h3>
                      </div>
                      {reward.is_digital && (
                        <Badge variant="outline">Digital</Badge>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground">{reward.description}</p>

                    {reward.estimated_delivery_date && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>Est. delivery: {new Date(reward.estimated_delivery_date).toLocaleDateString()}</span>
                      </div>
                    )}

                    {reward.limit_quantity && (
                      <div className="text-xs text-muted-foreground">
                        {reward.limit_quantity - reward.claimed_quantity} of {reward.limit_quantity} available
                      </div>
                    )}

                    <Button
                      className="w-full"
                      onClick={() => handlePledge(reward)}
                      disabled={
                        reward.limit_quantity !== null &&
                        reward.claimed_quantity >= reward.limit_quantity
                      }
                    >
                      {reward.limit_quantity !== null && reward.claimed_quantity >= reward.limit_quantity
                        ? 'Sold Out'
                        : 'Select Reward'}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
