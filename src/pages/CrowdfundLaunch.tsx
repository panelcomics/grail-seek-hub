import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Rocket } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const CATEGORIES = [
  "Comic Series",
  "One-Shot",
  "Graphic Novel",
  "Artbook",
  "Anthology",
  "Other"
];

interface RewardTier {
  id: string;
  title: string;
  description: string;
  pledge_amount_cents: number;
  estimated_delivery_date: string;
  limit_quantity: number | null;
  is_digital: boolean;
  sort_order: number;
}

export default function CrowdfundLaunch() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [goalAmount, setGoalAmount] = useState("");
  const [durationDays, setDurationDays] = useState("30");
  const [coverImage, setCoverImage] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [story, setStory] = useState("");
  const [risks, setRisks] = useState("");
  const [rewards, setRewards] = useState<RewardTier[]>([]);

  if (!user) {
    navigate('/auth');
    return null;
  }

  const handleAddReward = () => {
    const newReward: RewardTier = {
      id: crypto.randomUUID(),
      title: "",
      description: "",
      pledge_amount_cents: 0,
      estimated_delivery_date: "",
      limit_quantity: null,
      is_digital: false,
      sort_order: rewards.length,
    };
    setRewards([...rewards, newReward]);
  };

  const handleUpdateReward = (id: string, field: keyof RewardTier, value: any) => {
    setRewards(rewards.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleRemoveReward = (id: string) => {
    setRewards(rewards.filter(r => r.id !== id));
  };

  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert({
          creator_id: user.id,
          slug,
          title,
          short_tagline: tagline,
          category,
          location,
          funding_goal_cents: Math.round(parseFloat(goalAmount) * 100),
          ends_at: new Date(Date.now() + parseInt(durationDays) * 24 * 60 * 60 * 1000).toISOString(),
          cover_image_url: coverImage || null,
          video_url: videoUrl || null,
          story_markdown: story,
          risks_markdown: risks,
          status: 'draft'
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Insert rewards
      if (rewards.length > 0) {
        const { error: rewardsError } = await supabase
          .from('campaign_rewards')
          .insert(
            rewards.map(r => ({
              campaign_id: campaign.id,
              title: r.title,
              description: r.description,
              pledge_amount_cents: r.pledge_amount_cents,
              estimated_delivery_date: r.estimated_delivery_date || null,
              limit_quantity: r.limit_quantity,
              is_digital: r.is_digital,
              sort_order: r.sort_order,
            }))
          );

        if (rewardsError) throw rewardsError;
      }

      toast.success('Campaign saved as draft!');
      navigate('/crowdfund/my-projects');
    } catch (error: any) {
      console.error('Error saving campaign:', error);
      toast.error(error.message || 'Failed to save campaign');
    } finally {
      setSaving(false);
    }
  };

  const handleLaunch = async () => {
    try {
      setSaving(true);
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert({
          creator_id: user.id,
          slug,
          title,
          short_tagline: tagline,
          category,
          location,
          funding_goal_cents: Math.round(parseFloat(goalAmount) * 100),
          ends_at: new Date(Date.now() + parseInt(durationDays) * 24 * 60 * 60 * 1000).toISOString(),
          cover_image_url: coverImage || null,
          video_url: videoUrl || null,
          story_markdown: story,
          risks_markdown: risks,
          status: 'live',
          starts_at: new Date().toISOString()
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Insert rewards
      if (rewards.length > 0) {
        const { error: rewardsError } = await supabase
          .from('campaign_rewards')
          .insert(
            rewards.map(r => ({
              campaign_id: campaign.id,
              title: r.title,
              description: r.description,
              pledge_amount_cents: r.pledge_amount_cents,
              estimated_delivery_date: r.estimated_delivery_date || null,
              limit_quantity: r.limit_quantity,
              is_digital: r.is_digital,
              sort_order: r.sort_order,
            }))
          );

        if (rewardsError) throw rewardsError;
      }

      toast.success('🚀 Campaign launched!');
      navigate(`/crowdfund/campaign/${slug}`);
    } catch (error: any) {
      console.error('Error launching campaign:', error);
      toast.error(error.message || 'Failed to launch campaign');
    } finally {
      setSaving(false);
    }
  };

  const canProceed = () => {
    if (step === 1) return title && tagline && category && goalAmount && parseFloat(goalAmount) > 0;
    if (step === 2) return true;
    if (step === 3) return story;
    if (step === 4) return true;
    return true;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-4 space-y-6">
              <div>
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
                      <BreadcrumbPage>Launch</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>

                <h1 className="text-2xl font-bold mb-2">Launch Your Project</h1>
                <p className="text-sm text-muted-foreground">Complete all steps to publish your campaign</p>
              </div>

              {/* Progress Steps */}
              <div className="bg-card border rounded-lg p-6">
                <h3 className="font-semibold mb-4">Launch Progress</h3>
                <div className="space-y-3">
                  {['Basics', 'Media', 'Story', 'Rewards', 'Review'].map((label, i) => (
                    <div 
                      key={i} 
                      className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                        step === i + 1 
                          ? 'bg-primary/10 border border-primary' 
                          : step > i + 1
                          ? 'bg-accent'
                          : 'bg-muted/50'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                          step > i + 1
                            ? 'bg-primary text-primary-foreground'
                            : step === i + 1
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-background text-muted-foreground'
                        }`}
                      >
                        {step > i + 1 ? '✓' : i + 1}
                      </div>
                      <span className={`text-sm font-medium ${step === i + 1 ? 'text-primary' : 'text-muted-foreground'}`}>
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-card border rounded-xl shadow-lg p-8 space-y-8">
              {/* Step Header */}
              <div className="pb-6 border-b">
                <h2 className="text-2xl font-bold">
                  {step === 1 && 'Project Basics'}
                  {step === 2 && 'Media & Visuals'}
                  {step === 3 && 'Your Story'}
                  {step === 4 && 'Reward Tiers'}
                  {step === 5 && 'Review & Launch'}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {step === 1 && 'Tell us about your project'}
                  {step === 2 && 'Add images and videos to showcase your work'}
                  {step === 3 && 'Share your vision with potential backers'}
                  {step === 4 && 'Create rewards to thank your supporters'}
                  {step === 5 && 'Double-check everything before going live'}
                </p>
              </div>

              {/* Step 1: Basics */}
              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="title">Project Title *</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., The Lost Chronicles: A Sci-Fi Epic"
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="tagline">Short Tagline *</Label>
                    <Input
                      id="tagline"
                      value={tagline}
                      onChange={(e) => setTagline(e.target.value)}
                      placeholder="One compelling sentence about your project"
                      maxLength={120}
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">{tagline.length}/120 characters</p>
                  </div>

                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="location">Location (optional)</Label>
                    <Input
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g., Brooklyn, NY"
                      className="mt-2"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="goal">Funding Goal (USD) *</Label>
                      <Input
                        id="goal"
                        type="number"
                        value={goalAmount}
                        onChange={(e) => setGoalAmount(e.target.value)}
                        placeholder="5000"
                        min="1"
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="duration">Campaign Duration</Label>
                      <Select value={durationDays} onValueChange={setDurationDays}>
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="14">14 days</SelectItem>
                          <SelectItem value="30">30 days</SelectItem>
                          <SelectItem value="45">45 days</SelectItem>
                          <SelectItem value="60">60 days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Media */}
              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="cover">Cover Image URL</Label>
                    <Input
                      id="cover"
                      value={coverImage}
                      onChange={(e) => setCoverImage(e.target.value)}
                      placeholder="https://..."
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Recommended: 1200x675px (16:9 aspect ratio)
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="video">Video URL (optional)</Label>
                    <Input
                      id="video"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="YouTube or Vimeo link"
                      className="mt-2"
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Story */}
              {step === 3 && (
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="story">Project Story *</Label>
                    <Textarea
                      id="story"
                      value={story}
                      onChange={(e) => setStory(e.target.value)}
                      placeholder="Tell backers about your comic project..."
                      rows={10}
                      className="mt-2 resize-none"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Supports Markdown formatting
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="risks">Risks & Challenges (optional)</Label>
                    <Textarea
                      id="risks"
                      value={risks}
                      onChange={(e) => setRisks(e.target.value)}
                      placeholder="What challenges might you face?"
                      rows={5}
                      className="mt-2 resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Step 4: Rewards */}
              {step === 4 && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Reward Tiers</h3>
                    <Button onClick={handleAddReward} variant="outline">
                      Add Reward
                    </Button>
                  </div>

                  {rewards.length === 0 ? (
                    <div className="text-center py-12 bg-muted/30 rounded-lg">
                      <div className="text-4xl mb-3">🎁</div>
                      <p className="text-muted-foreground">No rewards yet</p>
                      <p className="text-sm text-muted-foreground mt-1">Add rewards to incentivize backers!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {rewards.map((reward) => (
                        <div key={reward.id} className="border rounded-lg p-5 space-y-4 bg-muted/30">
                          <div className="grid grid-cols-2 gap-3">
                            <Input
                              placeholder="Reward title"
                              value={reward.title}
                              onChange={(e) => handleUpdateReward(reward.id, 'title', e.target.value)}
                            />
                            <Input
                              type="number"
                              placeholder="Pledge amount ($)"
                              value={reward.pledge_amount_cents / 100}
                              onChange={(e) =>
                                handleUpdateReward(reward.id, 'pledge_amount_cents', parseFloat(e.target.value) * 100)
                              }
                            />
                          </div>

                          <Textarea
                            placeholder="What's included?"
                            value={reward.description}
                            onChange={(e) => handleUpdateReward(reward.id, 'description', e.target.value)}
                            rows={2}
                          />

                          <div className="grid grid-cols-2 gap-3">
                            <Input
                              type="date"
                              placeholder="Estimated delivery"
                              value={reward.estimated_delivery_date}
                              onChange={(e) => handleUpdateReward(reward.id, 'estimated_delivery_date', e.target.value)}
                            />
                            <Input
                              type="number"
                              placeholder="Limit (optional)"
                              value={reward.limit_quantity || ''}
                              onChange={(e) =>
                                handleUpdateReward(reward.id, 'limit_quantity', e.target.value ? parseInt(e.target.value) : null)
                              }
                            />
                          </div>

                          <div className="flex justify-between items-center">
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={reward.is_digital}
                                onChange={(e) => handleUpdateReward(reward.id, 'is_digital', e.target.checked)}
                                className="rounded"
                              />
                              Digital reward
                            </label>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveReward(reward.id)}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Step 5: Review */}
              {step === 5 && (
                <div className="space-y-8">
                  <div className="bg-accent/30 rounded-lg p-6 space-y-4">
                    <h3 className="text-xl font-semibold">Campaign Summary</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground mb-1">Title</div>
                        <div className="font-medium">{title}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground mb-1">Category</div>
                        <div className="font-medium">{category}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground mb-1">Funding Goal</div>
                        <div className="font-medium text-primary text-lg">
                          ${parseFloat(goalAmount).toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground mb-1">Duration</div>
                        <div className="font-medium">{durationDays} days</div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-muted-foreground mb-1">Tagline</div>
                        <div className="font-medium">{tagline}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground mb-1">Reward Tiers</div>
                        <div className="font-medium">{rewards.length}</div>
                      </div>
                    </div>
                  </div>

                  {story && (
                    <div>
                      <h4 className="font-semibold mb-2">Story Preview</h4>
                      <div className="bg-muted/50 p-4 rounded-lg max-h-48 overflow-auto">
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-6">
                          {story}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="bg-primary/5 border border-primary/20 p-6 rounded-lg">
                    <h4 className="font-semibold mb-2 text-primary">Important</h4>
                    <p className="text-sm text-muted-foreground">
                      By launching this campaign, you agree to deliver the promised rewards to backers
                      and communicate regularly about your progress. Once live, your campaign will be visible to all users.
                    </p>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between pt-8 border-t mt-8">
                {step > 1 ? (
                  <Button variant="outline" size="lg" onClick={() => setStep(step - 1)}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                ) : (
                  <div />
                )}

                <div className="flex gap-3">
                  {step < 5 ? (
                    <Button size="lg" onClick={() => setStep(step + 1)} disabled={!canProceed()}>
                      Continue
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" size="lg" onClick={handleSaveDraft} disabled={saving}>
                        Save Draft
                      </Button>
                      <Button size="lg" onClick={handleLaunch} disabled={saving} className="min-w-40">
                        <Rocket className="w-4 h-4 mr-2" />
                        {saving ? 'Launching...' : 'Launch Campaign'}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
