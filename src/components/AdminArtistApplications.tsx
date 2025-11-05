import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Check, X, ExternalLink, Paintbrush } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ArtistApplication {
  id: string;
  user_id: string;
  artist_name: string;
  portfolio_url: string | null;
  instagram_url: string | null;
  sample_images: string[];
  coa_signature_url: string | null;
  confirmed_creator: boolean;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

export const AdminArtistApplications = () => {
  const [applications, setApplications] = useState<ArtistApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from("artist_applications")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error("Error fetching applications:", error);
      toast.error("Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (applicationId: string, userId: string) => {
    setProcessingId(applicationId);
    try {
      // Update application status
      const { error: appError } = await supabase
        .from("artist_applications")
        .update({
          status: "approved",
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
          reviewed_at: new Date().toISOString(),
          admin_notes: adminNotes,
        })
        .eq("id", applicationId);

      if (appError) throw appError;

      // Set verified_artist flag
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ verified_artist: true })
        .eq("user_id", userId);

      if (profileError) throw profileError;

      toast.success("Application approved! User is now a Verified Artist.");
      setAdminNotes("");
      await fetchApplications();
    } catch (error) {
      console.error("Error approving application:", error);
      toast.error("Failed to approve application");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeny = async (applicationId: string) => {
    if (!adminNotes.trim()) {
      toast.error("Please provide a reason for denial");
      return;
    }

    setProcessingId(applicationId);
    try {
      const { error } = await supabase
        .from("artist_applications")
        .update({
          status: "denied",
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
          reviewed_at: new Date().toISOString(),
          admin_notes: adminNotes,
        })
        .eq("id", applicationId);

      if (error) throw error;

      toast.success("Application denied");
      setAdminNotes("");
      await fetchApplications();
    } catch (error) {
      console.error("Error denying application:", error);
      toast.error("Failed to deny application");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Paintbrush className="h-5 w-5" />
            Artist Verification Applications
          </CardTitle>
          <CardDescription>
            Review and approve artist verification requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {applications.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No applications found
              </p>
            ) : (
              applications.map((app) => (
                <Card key={app.id} className={
                  app.status === "approved" ? "border-green-200" :
                  app.status === "denied" ? "border-red-200" : ""
                }>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{app.artist_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Applied: {new Date(app.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant={
                          app.status === "pending" ? "default" :
                          app.status === "approved" ? "default" :
                          "destructive"
                        }>
                          {app.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {app.portfolio_url && (
                          <div>
                            <strong>Portfolio:</strong>
                            <a href={app.portfolio_url} target="_blank" rel="noopener noreferrer" className="ml-2 text-primary hover:underline">
                              <ExternalLink className="h-3 w-3 inline" /> View
                            </a>
                          </div>
                        )}
                        {app.instagram_url && (
                          <div>
                            <strong>Instagram:</strong>
                            <a href={app.instagram_url} target="_blank" rel="noopener noreferrer" className="ml-2 text-primary hover:underline">
                              <ExternalLink className="h-3 w-3 inline" /> View
                            </a>
                          </div>
                        )}
                      </div>

                      <div>
                        <strong className="text-sm">Sample Artwork:</strong>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {app.sample_images.map((url, idx) => (
                            <Dialog key={idx}>
                              <DialogTrigger asChild>
                                <img
                                  src={url}
                                  alt={`Sample ${idx + 1}`}
                                  className="w-full h-32 object-cover rounded cursor-pointer hover:opacity-80"
                                />
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl">
                                <img src={url} alt={`Sample ${idx + 1}`} className="w-full" />
                              </DialogContent>
                            </Dialog>
                          ))}
                        </div>
                      </div>

                      {app.coa_signature_url && (
                        <div>
                          <Button variant="outline" size="sm" asChild>
                            <a href={app.coa_signature_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3 mr-1" />
                              View COA/Signature
                            </a>
                          </Button>
                        </div>
                      )}

                      {app.admin_notes && (
                        <div className="p-3 bg-muted rounded text-sm">
                          <strong>Admin Notes:</strong> {app.admin_notes}
                        </div>
                      )}

                      {app.status === "pending" && (
                        <div className="space-y-3 pt-4 border-t">
                          <div>
                            <Label htmlFor={`notes-${app.id}`}>Admin Notes (optional for approval, required for denial)</Label>
                            <Textarea
                              id={`notes-${app.id}`}
                              value={adminNotes}
                              onChange={(e) => setAdminNotes(e.target.value)}
                              placeholder="Add review notes..."
                              rows={2}
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleApprove(app.id, app.user_id)}
                              disabled={processingId === app.id}
                            >
                              {processingId === app.id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="mr-2 h-4 w-4" />
                              )}
                              Approve
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeny(app.id)}
                              disabled={processingId === app.id}
                            >
                              {processingId === app.id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <X className="mr-2 h-4 w-4" />
                              )}
                              Deny
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
