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

const Onboarding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Step 1: Username
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");

  // Step 2: Location
  const [country, setCountry] = useState("US");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");

  // Step 3: Shipping (optional)
  const [fullName, setFullName] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingState, setShippingState] = useState("");
  const [shippingZip, setShippingZip] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

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
    if (!postalCode || country !== "US") return;

    try {
      const { data, error } = await supabase.functions.invoke('geocode-profile', {
        body: { 
          country, 
          state, 
          city, 
          postal_code: postalCode 
        }
      });

      if (error) {
        console.error('[ONBOARDING] Geocoding error:', error);
      }
      
      return data;
    } catch (error) {
      console.error('[ONBOARDING] Geocoding failed:', error);
      return null;
    }
  };

  const handleStep2Submit = async () => {
    if (!country || !state || !city || !postalCode) {
      toast({
        title: "Location Required",
        description: "Please fill in all location fields",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Geocode the location
      await geocodeLocation();

      // Update profile with location
      const { error } = await supabase
        .from("profiles")
        .update({
          country,
          state,
          city,
          postal_code: postalCode,
        })
        .eq("user_id", user!.id);
      
      if (error) throw error;
      
      setCurrentStep(3);
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

  const handleStep3Submit = async (skip: boolean = false) => {
    setIsLoading(true);
    try {
      let shippingData = null;
      
      if (!skip && fullName && streetAddress && shippingCity && shippingState && shippingZip) {
        shippingData = {
          name: fullName,
          street: streetAddress,
          city: shippingCity,
          state: shippingState,
          zip: shippingZip,
          country: country,
        };
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          shipping_address: shippingData,
          onboarding_completed: true,
        })
        .eq("user_id", user!.id);
      
      if (error) throw error;
      
      toast({
        title: "Welcome to GrailSeeker!",
        description: "Your account is ready. Start listing your grails!",
      });
      
      navigate("/?onboarding_complete=true");
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

  if (authLoading) {
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
            {[1, 2, 3].map((step) => (
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
                {step < 3 && (
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
            {currentStep === 1 && "Let's set up your username"}
            {currentStep === 2 && "Where are you located?"}
            {currentStep === 3 && "Add shipping info (optional)"}
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
                  One word only — no spaces. Letters, numbers, and underscores allowed.
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

          {/* Step 2: Location */}
          {currentStep === 2 && (
            <div className="space-y-4">
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
                    onChange={(e) => setState(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    placeholder="Los Angeles"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
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
                  disabled={isLoading || !country || !state || !city || !postalCode}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Shipping (Optional) */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg mb-4">
                <p className="text-sm text-muted-foreground">
                  Shipping info is optional now, but required before you can sell items. You can skip this step and add it later in your profile settings.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="streetAddress">Street Address</Label>
                <Input
                  id="streetAddress"
                  placeholder="123 Main St"
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="shippingCity">City</Label>
                  <Input
                    id="shippingCity"
                    placeholder="Los Angeles"
                    value={shippingCity}
                    onChange={(e) => setShippingCity(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shippingState">State</Label>
                  <Input
                    id="shippingState"
                    placeholder="CA"
                    value={shippingState}
                    onChange={(e) => setShippingState(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="shippingZip">ZIP Code</Label>
                <Input
                  id="shippingZip"
                  placeholder="90210"
                  value={shippingZip}
                  onChange={(e) => setShippingZip(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleStep3Submit(true)}
                  disabled={isLoading}
                >
                  Skip for Now
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => handleStep3Submit(false)}
                  disabled={isLoading}
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
