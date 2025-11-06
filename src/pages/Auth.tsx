import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Eye, EyeOff } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { PasswordStrengthMeter } from "@/components/PasswordStrengthMeter";

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [magicLinkEmail, setMagicLinkEmail] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [googleFallbackEmail, setGoogleFallbackEmail] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const logAuthEvent = async (event: string, metadata?: any) => {
    try {
      await supabase.from('event_logs').insert({
        event,
        metadata
      });
    } catch (error) {
      console.error('Failed to log auth event:', error);
    }
  };

  useEffect(() => {
    // Clear password fields on mount to prevent autofill
    setSignInPassword("");
    setSignUpPassword("");
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: signInEmail,
        password: signInPassword,
      });

      if (error) {
        await logAuthEvent('login_fail', { email: signInEmail, error: error.message });
        throw error;
      }

      await logAuthEvent('login_success', { email: signInEmail });
      toast({
        title: "Welcome back!",
        description: "Successfully signed in.",
      });
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message === "Invalid login credentials" 
          ? "Email or password incorrect — please try again"
          : error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!acceptedTerms) {
      toast({
        title: "Terms Required",
        description: "You must accept the Terms of Service and Privacy Policy.",
        variant: "destructive",
      });
      return;
    }

    if (!isPasswordValid) {
      toast({
        title: "Invalid Password",
        description: "Add a number or symbol (e.g., SpaceCowboy1!)",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email: signUpEmail,
        password: signUpPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        if (error.message.includes("already registered")) {
          throw new Error("Email in use — try another or sign in");
        }
        throw error;
      }

      await logAuthEvent('signup_email', { email: signUpEmail });

      toast({
        title: "Account created!",
        description: "Check your email to verify your account.",
      });
    } catch (error: any) {
      await logAuthEvent('signup_failed', { email: signUpEmail, error: error.message });
      toast({
        title: "Signup failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: magicLinkEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;

      setMagicLinkSent(true);
      toast({
        title: "Magic link sent!",
        description: "Check your email for the login link",
      });
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

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/v1/callback`,
          scopes: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        },
      });

      if (error) throw error;
      await logAuthEvent('signup_google');
    } catch (error: any) {
      const is403 = error.message.includes('403') || error.status === 403;
      await logAuthEvent('google_failed', { error: error.message, is403 });
      
      const emailMatch = error.message.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
      const fallbackEmail = emailMatch ? emailMatch[0] : '';
      
      if (fallbackEmail) {
        setGoogleFallbackEmail(fallbackEmail);
        setSignUpEmail(fallbackEmail);
      }

      toast({
        title: is403 ? "Google config issue — try email" : "Google login issue — using email instead",
        description: fallbackEmail 
          ? "We've pre-filled your email address"
          : "Please use email/password login",
        variant: "default",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background/95 to-muted/30 p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-3 mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg">
            <span className="text-2xl font-bold text-primary-foreground">GS</span>
          </div>
          <span className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Grail Seeker
          </span>
        </Link>

        <Card className="shadow-xl border-border/50">
          <CardHeader className="text-center space-y-2 pb-4">
            <CardTitle className="text-2xl font-bold">Welcome</CardTitle>
            <CardDescription className="text-base">
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="outline"
              className="w-full h-11 border-2 hover:bg-muted/50 transition-all"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
            >
              <FcGoogle className="mr-2 h-5 w-5" />
              <span className="font-medium">Continue with Google</span>
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-3 text-muted-foreground font-medium">
                  Or continue with
                </span>
              </div>
            </div>

            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-3 h-11">
                <TabsTrigger value="signin" className="font-medium">Sign In</TabsTrigger>
                <TabsTrigger value="signup" className="font-medium">Sign Up</TabsTrigger>
                <TabsTrigger value="magic" className="font-medium">Magic Link</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin" className="space-y-4 pt-4">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="font-medium">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="you@example.com"
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                      autoComplete="email"
                      required
                      disabled={isLoading}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password" className="font-medium">Password</Label>
                    <div className="relative">
                      <Input
                        id="signin-password"
                        type={showSignInPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={signInPassword}
                        onChange={(e) => setSignInPassword(e.target.value)}
                        autoComplete="new-password"
                        required
                        disabled={isLoading}
                        minLength={8}
                        className="h-11 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignInPassword(!showSignInPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        disabled={isLoading}
                      >
                        {showSignInPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-11 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold"
                    disabled={isLoading}
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                  <div className="text-center text-sm">
                    <button
                      type="button"
                      onClick={handleMagicLink}
                      className="text-muted-foreground hover:text-primary underline transition-colors"
                    >
                      Forgot password? Get a magic link
                    </button>
                  </div>
                </form>
              </TabsContent>
              
              <TabsContent value="signup" className="space-y-4 pt-4">
                {googleFallbackEmail && (
                  <div className="mb-4 p-3 bg-muted/50 rounded-lg border border-primary/20">
                    <p className="text-sm text-muted-foreground">
                      Google sign-in encountered an issue. Please set a password to complete your registration.
                    </p>
                  </div>
                )}
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="font-medium">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      value={signUpEmail}
                      onChange={(e) => setSignUpEmail(e.target.value)}
                      autoComplete="email"
                      required
                      disabled={isLoading}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="font-medium">Password</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showSignUpPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={signUpPassword}
                        onChange={(e) => setSignUpPassword(e.target.value)}
                        autoComplete="new-password"
                        required
                        disabled={isLoading}
                        minLength={8}
                        className="h-11 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        disabled={isLoading}
                      >
                        {showSignUpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <PasswordStrengthMeter 
                      password={signUpPassword} 
                      onValidationChange={setIsPasswordValid}
                    />
                  </div>
                  
                  <div className="flex items-start space-x-2 py-2">
                    <Checkbox 
                      id="terms" 
                      checked={acceptedTerms}
                      onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                      disabled={isLoading}
                      required
                      className="mt-1"
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor="terms"
                        className="text-sm font-medium leading-snug peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        I accept the Terms of Service and Privacy Policy
                      </label>
                      <p className="text-xs text-muted-foreground">
                        By signing up, you agree to our{" "}
                        <Link to="/terms" target="_blank" className="underline hover:text-primary transition-colors">
                          Terms of Service
                        </Link>
                        {" "}and{" "}
                        <Link to="/privacy" target="_blank" className="underline hover:text-primary transition-colors">
                          Privacy Policy
                        </Link>
                      </p>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold"
                    disabled={isLoading || !acceptedTerms || !isPasswordValid}
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isLoading ? "Creating account..." : "Create Account"}
                  </Button>
                </form>
                <div className="mt-4 text-center">
                  <p className="text-xs text-muted-foreground">
                    Trouble logging in? Contact{" "}
                    <a href="mailto:support@panelcomics.com" className="underline hover:text-primary transition-colors">
                      support@panelcomics.com
                    </a>
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="magic" className="space-y-4 pt-4">
                {magicLinkSent ? (
                  <div className="text-center py-8 space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                      <Mail className="h-8 w-8 text-primary" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg">Check your email</h3>
                      <p className="text-sm text-muted-foreground">
                        We sent a magic link to <span className="font-medium text-foreground">{magicLinkEmail}</span>
                      </p>
                      <p className="text-xs text-muted-foreground pt-2">
                        Tap the link to login to Grail Seeker instantly
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => {
                        setMagicLinkSent(false);
                        setMagicLinkEmail("");
                      }}
                    >
                      Try another email
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleMagicLink} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="magic-email" className="font-medium">Email</Label>
                      <Input
                        id="magic-email"
                        type="email"
                        placeholder="you@example.com"
                        value={magicLinkEmail}
                        onChange={(e) => setMagicLinkEmail(e.target.value)}
                        autoComplete="email"
                        required
                        disabled={isLoading}
                        className="h-11"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full h-11 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold" 
                      disabled={isLoading}
                    >
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isLoading ? "Sending..." : (
                        <>
                          <Mail className="mr-2 h-4 w-4" />
                          Send Magic Link
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      We'll email you a link to sign in instantly
                    </p>
                  </form>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
