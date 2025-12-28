// Crowdfunding confidence + momentum layers (additive, safe-mode)
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Calendar, MapPin, Users, Clock, TrendingUp, Target, Heart } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { formatDistanceToNow } from "date-fns";
import { CampaignMomentumIndicator } from "@/components/crowdfund/CampaignMomentumIndicator";
import { CreatorTrustCard } from "@/components/crowdfund/CreatorTrustCard";
import { RecentBackersStrip } from "@/components/crowdfund/RecentBackersStrip";
import { CreatorUpdateTimeline } from "@/components/crowdfund/CreatorUpdateTimeline";

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
  is_demo?: boolean;
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

      const { data: campaignData, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('slug', slug)
        .single();

      if (campaignError) throw campaignError;
      setCampaign(campaignData);

      const { data: creatorData } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('user_id', campaignData.creator_id)
        .single();
      setCreator(creatorData);

      const { data: rewardsData } = await supabase
        .from('campaign_rewards')
        .select('*')
        .eq('campaign_id', campaignData.id)
        .order('pledge_amount_cents', { ascending: true });
      setRewards(rewardsData || []);

      const { data: updatesData } = await supabase
        .from('campaign_updates')
        .select('*')
        .eq('campaign_id', campaignData.id)
        .eq('is_public', true)
        .order('created_at', { ascending: false });
      setUpdates(updatesData || []);

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
      {/* Hero Banner */}
      <div className="relative h-64 md:h-80 bg-gradient-to-br from-primary/20 via-background to-accent/20 overflow-hidden">
        {campaign.cover_image_url && (
          <>
            <img 
              src={campaign.cover_image_url}
              alt={campaign.title}
              className="absolute inset-0 w-full h-full object-cover opacity-30 blur-sm"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          </>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-32 relative z-10">
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

        {/* Demo Campaign Banner */}
        {campaign.is_demo && (
          <div className="mb-6 p-4 bg-yellow-500/10 border-2 border-yellow-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <Badge variant="outline" className="bg-yellow-500 text-yellow-950 border-yellow-600 font-semibold">
                  DEMO CAMPAIGN
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                This is a demo campaign used to showcase GrailSeeker Crowdfunding. 
                Please use test payments only while we're in Beta.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
          {/* Left Column: Media + Story */}
          <div className="lg:col-span-2 space-y-8">
            {/* Main Campaign Card */}
            <div className="bg-card border rounded-xl shadow-xl p-6 space-y-6">
              {/* Cover Image/Video */}
              <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                {campaign.video_url ? (
                  <div className="w-full h-full">
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

              {/* Campaign Header */}
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <Badge variant="secondary" className="mb-2">{campaign.category}</Badge>
                    <h1 className="text-3xl md:text-4xl font-bold leading-tight">{campaign.title}</h1>
                    {/* Momentum Indicator - directly under title */}
                    <CampaignMomentumIndicator
                      backersCount={campaign.backers_count}
                      currentPledgedCents={campaign.current_pledged_cents}
                      createdAt={campaign.created_at}
                      className="mt-2"
                    />
                    <p className="text-lg text-muted-foreground mt-2">{campaign.short_tagline}</p>
                  </div>
                </div>

                {/* Creator */}
                <div className="flex items-center gap-3 pt-2">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={creator?.avatar_url} />
                    <AvatarFallback>
                      {creator?.username?.[0]?.toUpperCase() || 'C'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm text-muted-foreground">Created by</div>
                    <div className="font-medium">{creator?.username || 'Anonymous'}</div>
                  </div>
                  {campaign.location && (
                    <>
                      <span className="text-muted-foreground">•</span>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        {campaign.location}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4 h-12">
                <TabsTrigger value="overview" className="text-base">Overview</TabsTrigger>
                <TabsTrigger value="updates" className="text-base">
                  Updates <span className="ml-1 text-xs">({updates.length})</span>
                </TabsTrigger>
                <TabsTrigger value="comments" className="text-base">
                  Comments <span className="ml-1 text-xs">({comments.length})</span>
                </TabsTrigger>
                <TabsTrigger value="backers" className="text-base">Backers</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-8 mt-8">
                <div className="prose prose-lg max-w-none">
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <Target className="w-6 h-6 text-primary" />
                    Story
                  </h2>
                  <div className="whitespace-pre-wrap text-foreground">{campaign.story_markdown}</div>
                </div>

                {/* Creator Update Timeline - below description, above FAQs */}
                <CreatorUpdateTimeline updates={updates} />

                {campaign.risks_markdown && (
                  <div className="prose prose-lg max-w-none">
                    <h2 className="text-2xl font-bold mb-4">Risks & Challenges</h2>
                    <div className="whitespace-pre-wrap text-foreground">{campaign.risks_markdown}</div>
                  </div>
                )}

                {stretchGoals.length > 0 && (
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      <TrendingUp className="w-6 h-6 text-primary" />
                      Stretch Goals
                    </h2>
                    {stretchGoals.map((goal) => (
                      <div
                        key={goal.id}
                        className={`border rounded-lg p-5 transition-all ${
                          goal.is_unlocked 
                            ? 'bg-primary/5 border-primary shadow-lg' 
                            : 'bg-card hover:border-primary/50'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-semibold text-lg">{goal.title}</h3>
                          {goal.is_unlocked && (
                            <Badge variant="default" className="shadow-md">✓ Unlocked!</Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium text-primary mb-2">
                          ${(goal.target_amount_cents / 100).toLocaleString()} goal
                        </p>
                        <p className="text-sm text-muted-foreground">{goal.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="updates" className="space-y-6 mt-8">
                {updates.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground bg-muted/30 rounded-lg">
                    <div className="text-4xl mb-4">📢</div>
                    <p className="text-lg">Creator updates will appear here.</p>
                    <p className="text-sm mt-2 text-muted-foreground/70">Backers will be notified as the campaign progresses.</p>
                  </div>
                ) : (
                  updates.map((update) => (
                    <div key={update.id} className="border rounded-lg p-6 bg-card hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-semibold">{update.title}</h3>
                        <span className="text-sm text-muted-foreground whitespace-nowrap ml-4">
                          {formatDistanceToNow(new Date(update.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <div className="whitespace-pre-wrap text-muted-foreground">{update.body_markdown}</div>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="comments" className="space-y-6 mt-8">
                {user && (
                  <div className="border rounded-lg p-6 space-y-4 bg-card shadow-sm">
                    <h3 className="font-semibold">Leave a comment</h3>
                    <Textarea
                      placeholder="Share your thoughts about this project..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      rows={4}
                      className="resize-none"
                    />
                    <div className="flex justify-end">
                      <Button 
                        onClick={handleComment} 
                        disabled={submittingComment || !commentText.trim()}
                        size="lg"
                      >
                        {submittingComment ? 'Posting...' : 'Post Comment'}
                      </Button>
                    </div>
                  </div>
                )}

                {comments.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground bg-muted/30 rounded-lg">
                    <div className="text-4xl mb-4">💬</div>
                    <p className="text-lg">No comments yet</p>
                    <p className="text-sm mt-2">Be the first to share your thoughts!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="border rounded-lg p-5 bg-card hover:shadow-sm transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {comment.profiles?.username?.[0]?.toUpperCase() || 'B'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-semibold">
                              {comment.profiles?.username || 'Backer'}
                            </span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground pl-10">{comment.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="backers" className="mt-8">
                <div className="text-center py-16 space-y-4 bg-muted/30 rounded-lg">
                  <Users className="w-16 h-16 mx-auto text-primary" />
                  <div>
                    <p className="text-3xl font-bold text-primary">{campaign.backers_count}</p>
                    <p className="text-muted-foreground mt-1">
                      backer{campaign.backers_count !== 1 ? 's' : ''} supporting this project
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Backer details are kept private for security
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column: Pledge Section */}
          <div className="space-y-6">
            {/* Campaign Stats Card */}
            <div className="bg-card border rounded-xl shadow-xl p-6 space-y-6 sticky top-4">
              {/* Funding Progress */}
              <div className="space-y-4">
                <div className="flex justify-between items-baseline">
                  <span className="text-4xl font-bold text-primary">
                    ${(campaign.current_pledged_cents / 100).toLocaleString()}
                  </span>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  pledged of ${(campaign.funding_goal_cents / 100).toLocaleString()} goal
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-secondary/50 h-3 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-700 ease-out rounded-full"
                    style={{ width: `${percentFunded}%` }}
                  />
                </div>
                
                <div className="text-lg font-semibold text-primary">
                  {percentFunded > 0 
                    ? `${percentFunded.toFixed(0)}% funded`
                    : "Early funding underway"
                  }
                </div>

                {/* Recent Backers Strip - visual activity reinforcement */}
                <RecentBackersStrip 
                  backersCount={campaign.backers_count} 
                  className="pt-2"
                />
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-6 pt-6 border-t">
                <div>
                  <div className="text-3xl font-bold">{campaign.backers_count}</div>
                  <div className="text-sm text-muted-foreground">backers</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">
                    {daysRemaining > 0 ? daysRemaining : 0}
                  </div>
                  <div className="text-sm text-muted-foreground">days to go</div>
                </div>
              </div>

              {campaign.status === 'live' && daysRemaining > 0 && (
                <Button
                  className="w-full h-14 text-lg shadow-lg hover:shadow-xl"
                  size="lg"
                  onClick={() => {
                    const element = document.getElementById('rewards');
                    element?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <Heart className="w-5 h-5 mr-2" />
                  Back This Project
                </Button>
              )}

              {campaign.status !== 'live' && (
                <div className="text-center py-4 text-muted-foreground bg-muted rounded-lg">
                  Campaign has ended
                </div>
              )}

              {daysRemaining <= 0 && campaign.status === 'live' && (
                <div className="text-center py-4 text-muted-foreground bg-muted rounded-lg">
                  Campaign has ended
                </div>
              )}
            </div>

            {/* Creator Trust Card - non-primary placement */}
            <CreatorTrustCard
              creatorUsername={creator?.username}
              isActiveSeller={true}
              isEarlyCreator={true}
            />

            {/* Rewards Section */}
            {rewards.length > 0 && campaign.status === 'live' && daysRemaining > 0 && (
              <div id="rewards" className="space-y-4">
                <h3 className="text-2xl font-bold">Support & Rewards</h3>
                {rewards.map((reward) => (
                  <div
                    key={reward.id}
                    className="bg-card border rounded-lg p-6 space-y-4 hover:shadow-lg hover:border-primary/50 transition-all group"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-2xl font-bold text-primary">
                          ${(reward.pledge_amount_cents / 100).toLocaleString()}
                        </div>
                        <h4 className="font-semibold text-lg mt-1">{reward.title}</h4>
                      </div>
                      {reward.is_digital && (
                        <Badge variant="secondary">Digital</Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-muted-foreground">{reward.description}</p>
                    
                    {reward.estimated_delivery_date && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        Est. delivery: {new Date(reward.estimated_delivery_date).toLocaleDateString()}
                      </div>
                    )}
                    
                    {reward.limit_quantity && (
                      <div className="text-sm text-muted-foreground">
                        {reward.limit_quantity - reward.claimed_quantity} of {reward.limit_quantity} remaining
                      </div>
                    )}
                    
                    <Button
                      onClick={() => handlePledge(reward)}
                      disabled={reward.limit_quantity ? reward.claimed_quantity >= reward.limit_quantity : false}
                      className="w-full h-12 group-hover:shadow-md transition-shadow"
                      size="lg"
                    >
                      {reward.limit_quantity && reward.claimed_quantity >= reward.limit_quantity
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

      {/* Mobile Fixed CTA */}
      {campaign.status === 'live' && daysRemaining > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t shadow-2xl z-50">
          <Button
            className="w-full h-14 text-lg shadow-xl"
            size="lg"
            onClick={() => {
              const element = document.getElementById('rewards');
              element?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <Heart className="w-5 h-5 mr-2" />
            Back This Project
          </Button>
        </div>
      )}
    </div>
  );
}
