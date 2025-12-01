import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { RoleBadge } from "@/components/creators/RoleBadge";
import { ApplicationStatusCard } from "@/components/creators/ApplicationStatusCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Palette, Rocket, Store } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [application, setApplication] = useState<any>(null);
  const [roles, setRoles] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
    } catch (error) {
      console.error("Error loading data:", error);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Creator Dashboard</h1>
          <p className="text-muted-foreground">Manage your creator account</p>
        </div>
        <RoleBadge isArtist={roles?.is_artist} isWriter={roles?.is_writer} />
      </div>

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
          <CardHeader>
            <CardTitle>Profile & Portfolio</CardTitle>
            <CardDescription>Update your creator information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <h3 className="font-medium mb-2">Bio</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {application.bio}
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
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
