import { useState, useEffect } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ProfileImageUpload } from "./ProfileImageUpload";

const profileSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be less than 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores")
    .transform((val) => val.toLowerCase()),
  bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
});

interface ProfileEditFormProps {
  userId: string;
}

export function ProfileEditForm({ userId }: ProfileEditFormProps) {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ username?: string; bio?: string }>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("username, bio, profile_image_url")
        .eq("user_id", userId)
        .single();

      if (error) throw error;

      setUsername(data.username || "");
      setBio(data.bio || "");
      setProfileImageUrl(data.profile_image_url);
    } catch (error: any) {
      console.error("Error fetching profile:", error);
      toast({
        title: "Error loading profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate
    const result = profileSchema.safeParse({ username, bio });

    if (!result.success) {
      const fieldErrors: any = {};
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0]] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          username: result.data.username,
          bio: result.data.bio || null,
        })
        .eq("user_id", userId);

      if (error) {
        if (error.code === "23505") {
          // Unique constraint violation
          setErrors({ username: "This username is already taken" });
          return;
        }
        throw error;
      }

      toast({
        title: "Profile updated successfully",
        description: "Your profile changes have been saved",
      });
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Image */}
          <div className="flex justify-center">
            <ProfileImageUpload
              currentImageUrl={profileImageUrl}
              userId={userId}
              onImageUploaded={setProfileImageUrl}
            />
          </div>

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              maxLength={20}
            />
            {errors.username && (
              <p className="text-sm text-destructive">{errors.username}</p>
            )}
            <p className="text-xs text-muted-foreground">
              3-20 characters, letters, numbers, and underscores only
            </p>
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio (Optional)</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              maxLength={500}
              rows={4}
            />
            {errors.bio && (
              <p className="text-sm text-destructive">{errors.bio}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {bio.length}/500 characters
            </p>
          </div>

          {/* Submit */}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
