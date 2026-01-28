import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface Application {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  creator_type: string | null;
  role_requested: string | null;
  portfolio_links: string[];
  social_links: any;
  sample_files: string[];
  bio: string | null;
  requested_access: any[];
  status: string;
  admin_notes: string | null;
  created_at: string;
  profiles?: {
    username: string;
    email: string;
  };
}

interface AdminApplicationTableProps {
  applications: Application[];
  onUpdate: () => void;
}

export function AdminApplicationTable({ applications, onUpdate }: AdminApplicationTableProps) {
  const { user } = useAuth();
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [reviewScore, setReviewScore] = useState<number>(0);
  const [tier, setTier] = useState<string>("auto");
  const [processing, setProcessing] = useState(false);
  const [creatingProfile, setCreatingProfile] = useState(false);

  const handleApprove = async (app: Application) => {
    if (!user) return;
    
    setProcessing(true);
    try {
      // Auto-assign tier based on review score
      let autoTier = tier === "auto" ? "" : tier;
      if (!autoTier && reviewScore > 0) {
        if (reviewScore >= 80) autoTier = "gold";
        else if (reviewScore >= 60) autoTier = "silver";
        else if (reviewScore >= 40) autoTier = "bronze";
      }

      // Update application status
      const { error: appError } = await supabase
        .from("creator_applications")
        .update({ 
          status: "approved",
          admin_notes: adminNotes || null,
          review_score: reviewScore > 0 ? reviewScore : null,
          tier: autoTier || null,
          approved_at: new Date().toISOString()
        })
        .eq("id", app.id);

      if (appError) throw appError;

      // Determine roles from creator_type and requested_access
      const creatorType = app.creator_type || app.role_requested || 'artist';
      const isArtist = creatorType === 'artist' || creatorType === 'cover_artist' || 
                       app.requested_access?.includes('original_art');
      const isWriter = creatorType === 'writer' || creatorType === 'grailfunding_creator' ||
                       app.requested_access?.includes('grailfunding');

      // Create or update creator_roles
      const roleData = {
        user_id: app.user_id,
        is_artist: isArtist,
        is_writer: isWriter,
        approved_at: new Date().toISOString(),
        approved_by: user.id
      };

      const { error: roleError } = await supabase
        .from("creator_roles")
        .upsert(roleData);

      if (roleError) throw roleError;

      // AUTO-CREATE PUBLIC PROFILE on approval
      const slug = (app.full_name || app.profiles?.username || 'creator')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      // Check if profile already exists
      const { data: existingProfile } = await supabase
        .from("creator_public_profiles")
        .select("id")
        .eq("creator_application_id", app.id)
        .maybeSingle();

      if (!existingProfile) {
        const { error: profileError } = await supabase
          .from("creator_public_profiles")
          .insert({
            creator_application_id: app.id,
            public_slug: slug,
            display_name: app.full_name || app.profiles?.username || 'Creator',
            avatar_url: (app as any).avatar_url || null,
            short_bio: app.bio || null,
            social_links: app.social_links || {},
            featured_links: [],
            is_visible: true
          });

        if (profileError) {
          console.error("Error creating public profile:", profileError);
          // Don't fail the whole approval, just log
        }

        // Update the application to mark it as public
        await supabase
          .from("creator_applications")
          .update({ 
            is_profile_public: true,
            public_slug: slug
          })
          .eq("id", app.id);
      }

      // Trigger email notification
      await supabase.functions.invoke("creator-notify", {
        body: {
          type: "approved",
          userId: app.user_id,
          fullName: app.full_name,
          email: app.email,
          creatorType: app.creator_type || app.role_requested
        }
      });

      toast.success("Application approved! Public profile created automatically.");
      setSelectedApp(null);
      setAdminNotes("");
      setReviewScore(0);
      setTier("auto");
      onUpdate();
    } catch (error: any) {
      console.error("Error approving application:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (app: Application) => {
    if (!adminNotes.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from("creator_applications")
        .update({ 
          status: "rejected",
          admin_notes: adminNotes
        })
        .eq("id", app.id);

      if (error) throw error;

      // Trigger email notification
      await supabase.functions.invoke("creator-notify", {
        body: {
          type: "rejected",
          userId: app.user_id,
          fullName: app.full_name,
          email: app.email,
          adminNotes: adminNotes
        }
      });

      toast.success("Application decision sent.");
      setSelectedApp(null);
      setAdminNotes("");
      setReviewScore(0);
      setTier("auto");
      onUpdate();
    } catch (error: any) {
      console.error("Error rejecting application:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const handleCreatePublicProfile = async (app: Application) => {
    setCreatingProfile(true);
    try {
      // Generate slug from full_name
      const slug = (app.full_name || app.profiles?.username || 'creator')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      // Check if profile already exists
      const { data: existingProfile } = await supabase
        .from("creator_public_profiles")
        .select("id")
        .eq("creator_application_id", app.id)
        .maybeSingle();

      const profileData = {
        creator_application_id: app.id,
        public_slug: slug,
        display_name: app.full_name || app.profiles?.username || 'Creator',
        avatar_url: (app as any).avatar_url || null,
        short_bio: app.bio || null,
        social_links: app.social_links || {},
        featured_links: [],
        is_visible: true
      };

      if (existingProfile) {
        // Update existing profile
        const { error } = await supabase
          .from("creator_public_profiles")
          .update(profileData)
          .eq("id", existingProfile.id);

        if (error) throw error;
        toast.success("Public profile updated successfully!");
      } else {
        // Create new profile
        const { error } = await supabase
          .from("creator_public_profiles")
          .insert(profileData);

        if (error) throw error;
        toast.success("Public profile created successfully!");
      }

      // Update the application to mark it as public
      await supabase
        .from("creator_applications")
        .update({ 
          is_profile_public: true,
          public_slug: slug
        })
        .eq("id", app.id);

      onUpdate();
    } catch (error: any) {
      console.error("Error creating public profile:", error);
      toast.error("Failed to create public profile");
    } finally {
      setCreatingProfile(false);
    }
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Applicant</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Creator Type</TableHead>
            <TableHead>Requested Access</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {applications.map((app) => (
            <TableRow key={app.id}>
              <TableCell>
                <div>
                  <p className="font-medium">{app.full_name || app.profiles?.username || "Unknown"}</p>
                  <p className="text-sm text-muted-foreground">@{app.profiles?.username}</p>
                </div>
              </TableCell>
              <TableCell>
                <p className="text-sm">{app.email || app.profiles?.email}</p>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="capitalize">
                  {(app.creator_type || app.role_requested || '').replace(/_/g, ' ')}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {app.requested_access?.map((access, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {access.replace(/_/g, ' ')}
                    </Badge>
                  )) || <span className="text-sm text-muted-foreground">-</span>}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={app.status === "pending" ? "secondary" : app.status === "approved" ? "default" : "destructive"}>
                  {app.status}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(app.created_at).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <Button 
                  variant="default"
                  size="sm"
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                  onClick={() => {
                    setSelectedApp(app);
                    const applicantName = app.full_name || app.profiles?.username || "Creator";
                    const defaultMessage = app.status === "pending" && !app.admin_notes
                      ? `Welcome to Grailseeker ${applicantName}. If you have any issues or recommendations please reach out to creators@grailseeker.app\n\nMark Bagnetto\nPresident`
                      : (app.admin_notes || "");
                    setAdminNotes(defaultMessage);
                    setReviewScore((app as any).review_score || 0);
                    setTier((app as any).tier || "auto");
                  }}
                >
                  Review
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!selectedApp} onOpenChange={() => setSelectedApp(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Review Creator Application</DialogTitle>
            <DialogDescription className="text-base">
              Review the application details below and approve or reject.
            </DialogDescription>
          </DialogHeader>

          {selectedApp && (
            <div className="space-y-6">
              <div>
                <h3 className="font-medium mb-2">Applicant Info</h3>
                <div className="space-y-1 text-sm">
                  <p><strong>Full Name:</strong> {selectedApp.full_name || 'Not provided'}</p>
                  <p><strong>Email:</strong> {selectedApp.email || selectedApp.profiles?.email}</p>
                  <p><strong>Username:</strong> @{selectedApp.profiles?.username}</p>
                  <p><strong>Creator Type:</strong> {(selectedApp.creator_type || selectedApp.role_requested || '').replace(/_/g, ' ')}</p>
                  <p><strong>Submitted:</strong> {new Date(selectedApp.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2">Requested Access</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedApp.requested_access?.map((access, idx) => (
                    <Badge key={idx} variant="secondary">
                      {access.replace(/_/g, ' ')}
                    </Badge>
                  )) || <span className="text-sm text-muted-foreground">None specified</span>}
                </div>
              </div>

              {selectedApp.bio && (
                <div>
                  <h3 className="font-medium mb-2">Bio</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedApp.bio}
                  </p>
                </div>
              )}

              <div>
                <h3 className="font-medium mb-2">Portfolio Links</h3>
                <div className="space-y-1">
                  {selectedApp.portfolio_links?.map((link, i) => (
                    <a
                      key={i}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="w-4 h-4" />
                      {link}
                    </a>
                  ))}
                </div>
              </div>

              {selectedApp.social_links && Object.keys(selectedApp.social_links).filter(k => selectedApp.social_links[k]).length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">Social Media</h3>
                  <div className="space-y-1">
                    {Object.entries(selectedApp.social_links).map(([platform, url]) => (
                      url && (
                        <a
                          key={platform}
                          href={url as string}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-primary hover:underline capitalize"
                        >
                          <ExternalLink className="w-4 h-4" />
                          {platform}: {url as string}
                        </a>
                      )
                    ))}
                  </div>
                </div>
              )}

              {selectedApp.sample_files && selectedApp.sample_files.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">Sample Files</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedApp.sample_files.map((file, idx) => (
                      <a
                        key={idx}
                        href={file}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:underline p-2 border rounded"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View Sample {idx + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="review-score">Review Score (0-100)</Label>
                  <Input
                    id="review-score"
                    type="number"
                    min="0"
                    max="100"
                    value={reviewScore}
                    onChange={(e) => setReviewScore(parseInt(e.target.value) || 0)}
                    placeholder="Optional"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    80-100: Gold, 60-79: Silver, 40-59: Bronze
                  </p>
                </div>

                <div>
                  <Label htmlFor="tier">Creator Tier</Label>
                  <Select value={tier} onValueChange={setTier}>
                    <SelectTrigger id="tier">
                      <SelectValue placeholder="Auto-assign based on score" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">None (Auto-assign)</SelectItem>
                      <SelectItem value="bronze">Bronze</SelectItem>
                      <SelectItem value="silver">Silver</SelectItem>
                      <SelectItem value="gold">Gold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2">Notes for Applicant</h3>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder={selectedApp?.status === "pending" 
                    ? "Add a welcome message or feedback for the applicant..." 
                    : "Add notes for the applicant..."}
                  rows={3}
                />
                {selectedApp?.status === "pending" && (
                  <p className="text-xs text-muted-foreground mt-1">
                    💡 For rejections, include a short note explaining the decision.
                  </p>
                )}
              </div>

              {selectedApp.status === "pending" && (
                <>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleApprove(selectedApp)}
                      disabled={processing}
                      className="flex-1"
                    >
                      {processing ? "Processing..." : "Approve Application"}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleReject(selectedApp)}
                      disabled={processing}
                      className="flex-1"
                    >
                      Reject
                    </Button>
                  </div>
                </>
              )}

              {selectedApp.status === "approved" && (
                <div className="space-y-4 border-t pt-4">
                  <div>
                    <h3 className="font-medium mb-2">Public Profile Management</h3>
                    <Button
                      onClick={() => handleCreatePublicProfile(selectedApp)}
                      disabled={creatingProfile}
                      variant="outline"
                      className="w-full"
                    >
                      {creatingProfile ? "Creating..." : "Create / Update Public Profile"}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      This will make their profile visible at /creators/[slug]
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
