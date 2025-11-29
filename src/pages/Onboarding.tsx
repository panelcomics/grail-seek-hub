import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ProfileImageUpload } from "@/components/ProfileImageUpload";

const Onboarding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Step 1: Username
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");

  // Step 2: Location
  const [country, setCountry] = useState("US");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }

    // Check if user has already completed onboarding
    const checkOnboardingStatus = async () => {
      if (!user) return;

      try {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("username, postal_code, state, onboarding_completed")
          .eq("user_id", user.id)
          .single();

        if (error) throw error;

        // If already completed, redirect to home
        if (profile?.onboarding_completed) {
          toast({
            title: "You're already set up!",
            description: "Redirecting to homepage...",
          });
          navigate("/");
          return;
        }

        // Pre-fill suggested username from email
        if (!profile?.username && user.email) {
          const suggested = user.email
            .split("@")[0]
            .replace(/[^a-zA-Z0-9_]/g, "_")
            .substring(0, 20);
          setUsername(suggested);
        }
      } catch (error) {
        console.error("Error checking onboarding status:", error);
      } finally {
        setCheckingStatus(false);
      }
    };

    if (user) {
      checkOnboardingStatus();
    }
  }, [user, authLoading, navigate, toast]);

  const validateUsername = (value: string): boolean => {
    setUsernameError("");
    
    if (!value) {
      setUsernameError("Username is required");
      return false;
    }
    
    if (value.length < 3 || value.length > 20) {
      setUsernameError("Username must be 3-20 characters");
      return false;
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      setUsernameError("One word only — no spaces. Letters, numbers, and underscores allowed.");
      return false;
    }
    
    if (/\s/.test(value)) {
      setUsernameError("Username cannot contain spaces");
      return false;
    }
    
    return true;
  };

  const handleStep1Submit = async () => {
    if (!validateUsername(username)) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ username })
        .eq("user_id", user!.id);
      
      if (error) throw error;
      
      setCurrentStep(2);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const geocodeLocation = async () => {
    if (!postalCode || country !== "US") return { geocoded: false };

    try {
      const { data, error } = await supabase.functions.invoke('geocode-profile', {
        body: { 
          country, 
          state: state.toUpperCase(), // Normalize to uppercase
          city, 
          postal_code: postalCode 
        }
      });

      if (error) {
        console.warn('[ONBOARDING] Geocoding error:', error);
        return { geocoded: false };
      }
      
      return data || { geocoded: false };
    } catch (error) {
      console.warn('[ONBOARDING] Geocoding failed:', error);
      return { geocoded: false };
    }
  };

  const handleStep2Submit = async () => {
    if (!country || !state || !postalCode) {
      toast({
        title: "Location Required",
        description: "Please fill in country, state, and ZIP code",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Geocode the location
      const geocodeResult = await geocodeLocation();

      // Update profile with location and mark onboarding complete
      const updateData: any = {
        country,
        state: state.toUpperCase(), // Normalize state
        city: city || null,
        postal_code: postalCode,
        onboarding_completed: true,
      };

      // Add coordinates if geocoding succeeded
      if (geocodeResult?.geocoded && geocodeResult.lat && geocodeResult.lng) {
        updateData.lat = geocodeResult.lat;
        updateData.lng = geocodeResult.lng;
      }

      if (profileImageUrl) {
        updateData.profile_image_url = profileImageUrl;
      }

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("user_id", user!.id);
      
      if (error) throw error;
      
      // Show appropriate success message
      const coordinatesMessage = geocodeResult?.geocoded 
        ? "Your location was saved with coordinates for Local Deals."
        : "Your location was saved (coordinates couldn't be found, but you can still use the platform).";
      
      toast({
        title: "Profile set! You're ready to hunt Grails.",
        description: coordinatesMessage,
      });
      
      navigate("/?onboarding_complete=true");
    } catch (error: any) {
      console.error('[ONBOARDING] Save error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || checkingStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background/95 to-muted/30 p-4">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between mb-4">
            {[1, 2].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                    step < currentStep
                      ? "bg-primary border-primary text-primary-foreground"
                      : step === currentStep
                      ? "border-primary text-primary font-bold"
                      : "border-muted text-muted-foreground"
                  }`}
                >
                  {step < currentStep ? <Check className="h-5 w-5" /> : step}
                </div>
                {step < 2 && (
                  <div
                    className={`flex-1 h-1 mx-2 rounded-full transition-all ${
                      step < currentStep ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <CardTitle className="text-2xl">Welcome to GrailSeeker</CardTitle>
          <CardDescription>
            {currentStep === 1 && "Let's set up your profile so buyers and sellers know who you are."}
            {currentStep === 2 && "Add your location so we can show you Local Deals near you."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Step 1: Username */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  placeholder="your_username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setUsernameError("");
                  }}
                  onBlur={() => validateUsername(username)}
                  disabled={isLoading}
                />
                {usernameError && (
                  <p className="text-sm text-destructive">{usernameError}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Usernames must be 1 word with letters, numbers, or underscores. No spaces.
                </p>
              </div>
              <Button
                className="w-full"
                onClick={handleStep1Submit}
                disabled={isLoading || !username}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Continue
              </Button>
            </div>
          )}

          {/* Step 2: Location & Profile Image */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Your ZIP code powers 'Local Deals Near You' so buyers and sellers can find each other within 25/50/100 miles.
              </p>
              
              <div className="space-y-2">
                <Label htmlFor="country">Country *</Label>
                <Select value={country} onValueChange={setCountry} disabled={isLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="US">United States</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    placeholder="CA"
                    value={state}
                    onChange={(e) => setState(e.target.value.toUpperCase())}
                    maxLength={2}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode">ZIP Code *</Label>
                  <Input
                    id="postalCode"
                    placeholder="90210"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City (optional)</Label>
                <Input
                  id="city"
                  placeholder="Los Angeles"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label>Profile Image (optional)</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Add a profile image (optional) — you can skip for now and add it later.
                </p>
                <ProfileImageUpload
                  currentImageUrl={profileImageUrl}
                  onImageUploaded={setProfileImageUrl}
                  userId={user?.id || ""}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(1)}
                  disabled={isLoading}
                >
                  Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleStep2Submit}
                  disabled={isLoading || !country || !state || !postalCode}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Complete Setup
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;
