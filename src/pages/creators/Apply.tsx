import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ApplicationForm } from "@/components/creators/ApplicationForm";
import { ApplicationStatusCard } from "@/components/creators/ApplicationStatusCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Palette, PenTool, Rocket } from "lucide-react";

export default function Apply() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [existingApp, setExistingApp] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    checkExistingApplication();
  }, [user]);

  const checkExistingApplication = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("creator_applications")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      setExistingApp(data);
    } catch (error) {
      console.error("Error checking application:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto py-12">
        <p className="text-center text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (existingApp) {
    return (
      <div className="container max-w-4xl mx-auto py-12 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Creator Application</h1>
          <p className="text-muted-foreground">Your application status</p>
        </div>

        <ApplicationStatusCard
          status={existingApp.status}
          roleRequested={existingApp.role_requested}
          createdAt={existingApp.created_at}
          adminNotes={existingApp.admin_notes}
        />

        {existingApp.status === "approved" && (
          <Button onClick={() => navigate("/creators/dashboard")} className="w-full">
            Go to Creator Dashboard
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-12 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">Become a Creator</h1>
        <p className="text-lg text-muted-foreground">
          Join GrailSeeker as an artist or writer
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Palette className="w-8 h-8 mb-2 text-primary" />
            <CardTitle>Artists</CardTitle>
            <CardDescription>
              Create and sell original comic art, commission pieces, and variants
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Your own artist storefront</li>
              <li>• Direct sales to collectors</li>
              <li>• Featured artist spotlights</li>
              <li>• Commission management tools</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <PenTool className="w-8 h-8 mb-2 text-primary" />
            <CardTitle>Writers</CardTitle>
            <CardDescription>
              Launch crowdfunding campaigns for your comic projects
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Kickstarter-style campaigns</li>
              <li>• Built-in backer management</li>
              <li>• Stretch goals & rewards</li>
              <li>• Direct community engagement</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Apply Now</CardTitle>
          <CardDescription>
            Tell us about yourself and your work. We review all applications carefully.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ApplicationForm />
        </CardContent>
      </Card>
    </div>
  );
}
