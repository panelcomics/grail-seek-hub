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
  country: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  postal_code: z.string().optional(),
});

interface ProfileEditFormProps {
  userId: string;
}

export function ProfileEditForm({ userId }: ProfileEditFormProps) {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [geocoding, setGeocoding] = useState(false);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [country, setCountry] = useState("US");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [hasActiveListings, setHasActiveListings] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; bio?: string; location?: string }>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("username, bio, profile_image_url, country, state, city, postal_code")
        .eq("user_id", userId)
        .single();

      if (error) throw error;

      setUsername(data.username || "");
      setBio(data.bio || "");
      setProfileImageUrl(data.profile_image_url);
      setCountry(data.country || "US");
      setState(data.state || "");
      setCity(data.city || "");
      setPostalCode(data.postal_code || "");

      // Check if user has active listings
      const { count } = await supabase
        .from("listings")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "active");

      setHasActiveListings((count || 0) > 0);
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
    const result = profileSchema.safeParse({ 
      username, 
      bio,
      country,
      state,
      city,
      postal_code: postalCode
    });

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
      // First update basic profile fields
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          username: result.data.username,
          bio: result.data.bio || null,
        })
        .eq("user_id", userId);

      if (profileError) {
        if (profileError.code === "23505") {
          setErrors({ username: "This username is already taken" });
          return;
        }
        throw profileError;
      }

      // If postal_code and country are provided, geocode the location
      if (postalCode && country) {
        setGeocoding(true);
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            console.warn("[PROFILE] No active session for geocoding");
            toast({
              title: "Profile updated",
              description: "Profile saved without location geocoding",
            });
            return;
          }

          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/geocode-profile`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                postal_code: postalCode,
                country: country,
                state: state || undefined,
                city: city || undefined,
              }),
            }
          );

          const geocodeResult = await response.json();

          if (!response.ok) {
            console.warn("[PROFILE] Geocoding request failed:", geocodeResult);
            toast({
              title: "Location saved (without coordinates)",
              description: "We couldn't find exact coordinates for this ZIP code, but your profile was updated.",
            });
          } else if (geocodeResult.geocoded) {
            toast({
              title: "Profile updated successfully",
              description: "Your profile and location have been saved with coordinates",
            });
          } else {
            console.warn("[PROFILE] Geocoding did not find coordinates");
            toast({
              title: "Location saved (without coordinates)",
              description: "We couldn't find exact coordinates for this ZIP code, but your profile was updated.",
            });
          }
        } catch (geocodeError) {
          console.warn("[PROFILE] Geocoding error:", geocodeError);
          // Don't fail the whole update if geocoding fails
          toast({
            title: "Profile updated",
            description: "Profile saved, but we couldn't geocode your location",
          });
        } finally {
          setGeocoding(false);
        }
      } else {
        // No location provided, just show success
        toast({
          title: "Profile updated successfully",
          description: "Your profile changes have been saved",
        });
      }
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
              One word only — no spaces. Letters, numbers, and underscores allowed.
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

          {/* Location Section */}
          <div className="space-y-4 pt-4 border-t">
            <div>
              <Label className="text-base font-semibold">Location</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Add your location so buyers can find your books in Local Deals
              </p>
              {hasActiveListings && !postalCode && (
                <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    💡 You have active listings! Add your city & ZIP so buyers can find your books in Local Deals.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <select
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="US">United States</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Currently only US locations are supported
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="e.g., CA"
                  maxLength={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="postal-code">ZIP Code</Label>
                <Input
                  id="postal-code"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="e.g., 90210"
                  maxLength={10}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City (Optional)</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g., Los Angeles"
                maxLength={100}
              />
            </div>

            {errors.location && (
              <p className="text-sm text-destructive">{errors.location}</p>
            )}
          </div>

          {/* Submit */}
          <Button type="submit" disabled={loading || geocoding} className="w-full">
            {loading || geocoding ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {geocoding ? "Geocoding location..." : "Saving..."}
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
