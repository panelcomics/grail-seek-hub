import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Star, Award, TrendingUp, MessageSquare, Palette, User, Loader2, Mail, Lock, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { ShippingPresets } from "@/components/ShippingPresets";

interface UserBadge {
  id: string;
  badge_type: string;
  badge_name: string;
  badge_description: string;
  earned_at: string;
}

interface Rating {
  id: string;
  rating: number;
  review_text: string;
  transaction_type: string;
  created_at: string;
  reviewer_id: string;
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [totalRatings, setTotalRatings] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      navigate('/auth');
      return;
    }
    
    loadProfile();
  }, [user, authLoading, navigate]);

  const loadProfile = async () => {
    if (!user) return;
    
    try {

      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('verified_artist, display_name, bio, profile_image_url')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);
      setDisplayName(profileData.display_name || "");
      setBio(profileData.bio || "");
      setProfileImageUrl(profileData.profile_image_url || "");

      // Fetch badges
      const { data: badgesData, error: badgesError } = await supabase
        .from('user_badges')
        .select('*')
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false });

      if (badgesError) throw badgesError;
      setBadges(badgesData || []);

      // Fetch ratings
      const { data: ratingsData, error: ratingsError } = await supabase
        .from('user_ratings')
        .select('*')
        .eq('reviewed_user_id', user.id)
        .order('created_at', { ascending: false });

      if (ratingsError) throw ratingsError;
      setRatings(ratingsData || []);

      // Calculate average rating
      if (ratingsData && ratingsData.length > 0) {
        const avg = ratingsData.reduce((sum, r) => sum + r.rating, 0) / ratingsData.length;
        setAverageRating(Math.round(avg * 10) / 10);
        setTotalRatings(ratingsData.length);
      }

    } catch (error: any) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setUploadingImage(true);
    try {
      if (profileImageUrl) {
        const oldPath = profileImageUrl.split('/').slice(-2).join('/');
        await supabase.storage.from('profile-images').remove([oldPath]);
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ profile_image_url: publicUrl })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      setProfileImageUrl(publicUrl);
      toast.success("Profile image updated successfully");
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast.error(error.message || "Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName || null,
          bio: bio || null,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Profile updated successfully");
      await loadProfile();
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast.success("Password updated successfully");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: user?.email || "",
      });

      if (error) throw error;

      toast.success("Verification email sent! Check your inbox.");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    toast.error("Please contact support to delete your account");
    setShowDeleteDialog(false);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-5 w-5 ${
          i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
        }`}
      />
    ));
  };

  const getBadgeIcon = (type: string) => {
    switch (type) {
      case 'trader':
        return <TrendingUp className="h-6 w-6" />;
      case 'community':
        return <MessageSquare className="h-6 w-6" />;
      default:
        return <Award className="h-6 w-6" />;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8 mt-20">
          <div className="text-center">Loading...</div>
        </main>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 mt-20">
        {/* Profile Header */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <Avatar className="h-24 w-24">
                {profileImageUrl ? (
                  <AvatarImage src={profileImageUrl} alt="Profile" />
                ) : (
                  <AvatarFallback className="text-2xl">
                    {displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                )}
              </Avatar>
              
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                  <h1 className="text-3xl font-bold">
                    {displayName || user?.email?.split('@')[0] || 'User'}
                  </h1>
                  {profile?.verified_artist && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge variant="secondary" className="gap-1.5 bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-purple-500/30">
                            <Palette className="h-3.5 w-3.5" />
                            Verified Artist
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Verified for original art and creator-authenticated listings.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                <p className="text-muted-foreground mb-4">{user?.email}</p>
                
                <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
                  <div className="flex">
                    {renderStars(Math.round(averageRating))}
                  </div>
                  <span className="font-semibold text-lg">{averageRating.toFixed(1)}</span>
                  <span className="text-muted-foreground">({totalRatings} ratings)</span>
                </div>

                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                  {badges.slice(0, 3).map((badge) => (
                    <Badge key={badge.id} variant="secondary" className="gap-1">
                      {getBadgeIcon(badge.badge_type)}
                      {badge.badge_name}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="edit-profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="edit-profile">Edit Profile</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="shipping">Shipping</TabsTrigger>
          </TabsList>

          <TabsContent value="edit-profile">
            <Card>
              <CardHeader>
                <CardTitle>Edit Profile</CardTitle>
                <CardDescription>Update your public seller profile information</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <div className="space-y-4">
                    <Label>Profile Image</Label>
                    <div className="flex items-center gap-6">
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center overflow-hidden border-4 border-background shadow-lg">
                        {profileImageUrl ? (
                          <img
                            src={profileImageUrl}
                            alt="Profile"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-3xl font-bold text-primary">
                            {displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <Input
                          id="profile-image"
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          disabled={uploadingImage}
                          className="cursor-pointer"
                        />
                        <p className="text-xs text-muted-foreground mt-2">
                          Upload a profile picture (max 5MB). JPG, PNG, or WEBP.
                        </p>
                        {uploadingImage && (
                          <p className="text-xs text-primary mt-1 flex items-center gap-2">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Uploading...
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="display-name">Seller Name / Display Name</Label>
                    <Input
                      id="display-name"
                      type="text"
                      placeholder="Your shop name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      This is how your name appears to buyers. If left blank, a shortened version of your email will be used.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      placeholder="Tell buyers about yourself and your collection..."
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={4}
                    />
                  </div>

                  <Button type="submit" disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <User className="mr-2 h-4 w-4" />
                        Save Profile
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="account">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                  <CardDescription>Your account details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Email Verification Status</Label>
                    <div className="flex items-center gap-2">
                      <p className="text-sm">
                        {user.email_confirmed_at ? "✓ Verified" : "✗ Not verified"}
                      </p>
                      {!user.email_confirmed_at && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleResendVerification}
                          disabled={loading}
                        >
                          {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Mail className="mr-2 h-4 w-4" />
                              Resend Verification
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Change Password</CardTitle>
                  <CardDescription>Update your account password</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm New Password</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Lock className="mr-2 h-4 w-4" />
                          Update Password
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card className="border-destructive">
                <CardHeader>
                  <CardTitle className="text-destructive">Danger Zone</CardTitle>
                  <CardDescription>Irreversible account actions</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Account
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="achievements">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Achievements
                </CardTitle>
                <CardDescription>Badges earned through trading</CardDescription>
              </CardHeader>
              <CardContent>
                {badges.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No badges earned yet. Complete trades to earn achievements!
                  </p>
                ) : (
                  <div className="space-y-4">
                    {badges.map((badge) => (
                      <div
                        key={badge.id}
                        className="flex items-start gap-3 p-4 rounded-lg bg-muted/50"
                      >
                        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          {getBadgeIcon(badge.badge_type)}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold">{badge.badge_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {badge.badge_description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Earned {new Date(badge.earned_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Recent Reviews
                </CardTitle>
                <CardDescription>What others say about trading with you</CardDescription>
              </CardHeader>
              <CardContent>
                {ratings.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No reviews yet. Complete your first trade to get reviewed!
                  </p>
                ) : (
                  <div className="space-y-4">
                    {ratings.slice(0, 5).map((rating) => (
                      <div key={rating.id} className="p-4 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex">
                            {renderStars(rating.rating)}
                          </div>
                          {rating.transaction_type && (
                            <Badge variant="outline" className="text-xs">
                              {rating.transaction_type}
                            </Badge>
                          )}
                        </div>
                        {rating.review_text && (
                          <p className="text-sm mb-2">{rating.review_text}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {new Date(rating.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="shipping">
            <ShippingPresets />
          </TabsContent>
        </Tabs>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Account?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. All your data including your collection will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive">
                Delete Account
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
