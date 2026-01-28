import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { RoleBadge } from "@/components/creators/RoleBadge";
import { ApplicationStatusCard } from "@/components/creators/ApplicationStatusCard";
import { ProfileImageUpload } from "@/components/ProfileImageUpload";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Palette, Rocket, Store, ExternalLink, Award } from "lucide-react";
import { toast } from "sonner";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [application, setApplication] = useState<any>(null);
  const [roles, setRoles] = useState<any>(null);
  const [publicProfile, setPublicProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    avatar_url: "",
    short_bio: "",
    social_links: {}
  });

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      // First get application and roles
      const [appResult, rolesResult] = await Promise.all([
        supabase
          .from("creator_applications")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("creator_roles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle()
      ]);

      if (appResult.error && appResult.error.code !== "PGRST116") throw appResult.error;
      if (rolesResult.error && rolesResult.error.code !== "PGRST116") throw rolesResult.error;

      setApplication(appResult.data);
      setRoles(rolesResult.data);

      // Then get public profile using the application ID (not user ID)
      if (appResult.data?.id) {
        const { data: profileData } = await supabase
          .from("creator_public_profiles")
          .select("*")
          .eq("creator_application_id", appResult.data.id)
          .maybeSingle();
        
        setPublicProfile(profileData);
      } else {
        setPublicProfile(null);
      }
      
      if (appResult.data) {
        setFormData({
          avatar_url: appResult.data.avatar_url || "",
          short_bio: appResult.data.bio || "",
          social_links: appResult.data.social_links || {}
        });
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user || !application) return;
    
    setSaving(true);
    try {
      // Update creator_applications
      const { error: appError } = await supabase
        .from("creator_applications")
        .update({
          avatar_url: formData.avatar_url,
          bio: formData.short_bio,
          social_links: formData.social_links
        })
        .eq("user_id", user.id);

      if (appError) throw appError;

      // If public profile exists, update it too
      if (publicProfile) {
        const { error: profileError } = await supabase
          .from("creator_public_profiles")
          .update({
            avatar_url: formData.avatar_url,
            short_bio: formData.short_bio,
            social_links: formData.social_links
          })
          .eq("id", publicProfile.id);

        if (profileError) throw profileError;
      }

      // Also sync bio to main profiles table so there's only ONE bio
      const { error: mainProfileError } = await supabase
        .from("profiles")
        .update({
          bio: formData.short_bio
        })
        .eq("user_id", user.id);

      if (mainProfileError) {
        console.warn("Could not sync bio to main profile:", mainProfileError);
      }

      toast.success("Profile updated successfully!");
      setEditing(false);
      loadData();
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUploaded = async (url: string) => {
    setFormData({ ...formData, avatar_url: url });
    
    // Update all profile tables to sync avatar
    if (application && user) {
      try {
        // Update creator_applications
        await supabase
          .from("creator_applications")
          .update({ avatar_url: url })
          .eq("user_id", user.id);

        // Update public profile if exists
        if (publicProfile) {
          await supabase
            .from("creator_public_profiles")
            .update({ avatar_url: url })
            .eq("id", publicProfile.id);
        }

        // ALSO sync to main profiles table
        await supabase
          .from("profiles")
          .update({ avatar_url: url })
          .eq("user_id", user.id);

        loadData();
        toast.success("Profile image updated across all profiles!");
      } catch (error) {
        console.error("Error syncing avatar:", error);
      }
    }
  };

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto py-12">
        <p className="text-center text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="container max-w-4xl mx-auto py-12 text-center space-y-4">
        <h1 className="text-3xl font-bold">Creator Dashboard</h1>
        <p className="text-muted-foreground">You haven't applied yet.</p>
        <Button onClick={() => navigate("/creators/apply")}>
          Apply to Become a Creator
        </Button>
      </div>
    );
  }

  const isApproved = application.status === "approved" && roles;

  return (
    <div className="container max-w-4xl mx-auto py-12 space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Creator Dashboard</h1>
          <p className="text-muted-foreground">Manage your creator account</p>
        </div>
        <div className="flex items-center gap-3">
          <RoleBadge isArtist={roles?.is_artist} isWriter={roles?.is_writer} />
          {publicProfile?.is_visible && publicProfile?.public_slug && (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/creators/${publicProfile.public_slug}`}>
                <ExternalLink className="w-4 h-4 mr-2" />
                View Public Profile
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Tier Badge */}
      {isApproved && application.tier && (
        <Card className="border-2">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Award className={`w-12 h-12 ${
                application.tier === 'gold' ? 'text-yellow-500' :
                application.tier === 'silver' ? 'text-gray-400' :
                'text-orange-700'
              }`} />
              <div className="flex-1">
                <h3 className="text-xl font-bold capitalize">{application.tier} Creator</h3>
                {application.review_score && (
                  <p className="text-sm text-muted-foreground">
                    Review Score: {application.review_score}/100
                  </p>
                )}
                {application.approved_at && (
                  <p className="text-xs text-muted-foreground">
                    Approved {new Date(application.approved_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!isApproved && (
        <ApplicationStatusCard
          status={application.status}
          roleRequested={application.role_requested}
          createdAt={application.created_at}
          adminNotes={application.admin_notes}
        />
      )}

      {isApproved && (
        <div className="grid gap-6 md:grid-cols-2">
          {roles.is_artist && (
            <Card>
              <CardHeader>
                <Palette className="w-8 h-8 mb-2 text-primary" />
                <CardTitle>Artist Features</CardTitle>
                <CardDescription>Manage your art and storefront</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" disabled>
                  <Store className="w-4 h-4 mr-2" />
                  My Storefront (Coming Soon)
                </Button>
                <Button variant="outline" className="w-full justify-start" disabled>
                  <Palette className="w-4 h-4 mr-2" />
                  Upload Art (Coming Soon)
                </Button>
              </CardContent>
            </Card>
          )}

          {roles.is_writer && (
            <Card>
              <CardHeader>
                <Rocket className="w-8 h-8 mb-2 text-primary" />
                <CardTitle>Writer Features</CardTitle>
                <CardDescription>Launch and manage campaigns</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  className="w-full justify-start"
                  onClick={() => navigate("/crowdfund/launch")}
                >
                  <Rocket className="w-4 h-4 mr-2" />
                  Launch New Campaign
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => navigate("/crowdfund/my-projects")}
                >
                  My Campaigns
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {isApproved && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Public Profile</CardTitle>
              <CardDescription>Update your public creator information</CardDescription>
            </div>
            {!editing ? (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                Edit Profile
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setEditing(false);
                    setFormData({
                      avatar_url: application.avatar_url || "",
                      short_bio: application.bio || "",
                      social_links: application.social_links || {}
                    });
                  }}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleSaveProfile}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {!editing ? (
              <>
                <div className="flex items-center gap-4">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={application.avatar_url} />
                    <AvatarFallback>
                      {application.full_name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-lg">{application.full_name}</h3>
                    <p className="text-sm text-muted-foreground">{application.email}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Bio</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {application.bio || "No bio added yet."}
                  </p>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Portfolio Links</h3>
                  <div className="space-y-1">
                    {application.portfolio_links?.map((link: string, i: number) => (
                      <a
                        key={i}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm text-primary hover:underline"
                      >
                        {link}
                      </a>
                    ))}
                  </div>
                </div>

                {application.social_links && Object.keys(application.social_links).length > 0 && (
                  <div>
                    <h3 className="font-medium mb-2">Social Media</h3>
                    <div className="space-y-1">
                      {Object.entries(application.social_links).map(([platform, url]: [string, any]) => (
                        url && (
                          <a
                            key={platform}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-sm text-primary hover:underline capitalize"
                          >
                            {platform}: {url}
                          </a>
                        )
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div>
                  <label className="text-sm font-medium mb-2 block">Profile Image</label>
                  <ProfileImageUpload
                    currentImageUrl={formData.avatar_url || null}
                    userId={user?.id || ""}
                    onImageUploaded={handleImageUploaded}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Bio</label>
                  <Textarea
                    placeholder="Tell people about yourself..."
                    value={formData.short_bio}
                    onChange={(e) => setFormData({ ...formData, short_bio: e.target.value })}
                    rows={6}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Social Links</label>
                  <div className="space-y-2">
                    {["website", "twitter", "instagram", "linkedin"].map((platform) => (
                      <Input
                        key={platform}
                        placeholder={`${platform.charAt(0).toUpperCase() + platform.slice(1)} URL`}
                        value={(formData.social_links as any)[platform] || ""}
                        onChange={(e) => setFormData({
                          ...formData,
                          social_links: {
                            ...formData.social_links,
                            [platform]: e.target.value
                          }
                        })}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
