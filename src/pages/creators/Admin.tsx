import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { isAdmin } from "@/lib/isAdmin";
import { AdminApplicationTable } from "@/components/creators/AdminApplicationTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdminUser, setIsAdminUser] = useState(false);

  useEffect(() => {
    // Wait for auth to finish loading before checking
    if (authLoading) return;
    
    if (!user) {
      navigate("/auth");
      return;
    }

    checkAdminAndLoad();
  }, [user, authLoading]);

  const checkAdminAndLoad = async () => {
    if (!user) return;

    const admin = await isAdmin(user.id);
    if (!admin) {
      navigate("/");
      return;
    }

    setIsAdminUser(true);
    loadApplications();
  };

  const loadApplications = async () => {
    try {
      const { data, error } = await supabase
        .from("creator_applications")
        .select(`
          *,
          profiles:user_id (
            username,
            email
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error("Error loading applications:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !isAdminUser) {
    return (
      <div className="container max-w-6xl mx-auto py-12">
        <p className="text-center text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const pending = applications.filter(a => a.status === "pending");
  const approved = applications.filter(a => a.status === "approved");
  const rejected = applications.filter(a => a.status === "rejected");

  return (
    <div className="container max-w-6xl mx-auto py-12 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Creator Applications Admin</h1>
        <p className="text-muted-foreground">Review and manage creator applications</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{pending.length}</CardTitle>
            <CardDescription>Pending Review</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{approved.length}</CardTitle>
            <CardDescription>Approved</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{rejected.length}</CardTitle>
            <CardDescription>Rejected</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({rejected.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending" className="mt-6">
          {pending.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No pending applications</p>
          ) : (
            <AdminApplicationTable applications={pending} onUpdate={loadApplications} />
          )}
        </TabsContent>

        <TabsContent value="approved" className="mt-6">
          {approved.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No approved applications</p>
          ) : (
            <AdminApplicationTable applications={approved} onUpdate={loadApplications} />
          )}
        </TabsContent>

        <TabsContent value="rejected" className="mt-6">
          {rejected.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No rejected applications</p>
          ) : (
            <AdminApplicationTable applications={rejected} onUpdate={loadApplications} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
