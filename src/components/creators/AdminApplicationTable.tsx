import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface Application {
  id: string;
  user_id: string;
  role_requested: string;
  portfolio_links: string[];
  bio: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  profiles?: {
    username: string;
    email: string;
  };
}

interface AdminApplicationTableProps {
  applications: Application[];
  onUpdate: () => void;
}

export function AdminApplicationTable({ applications, onUpdate }: AdminApplicationTableProps) {
  const { user } = useAuth();
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  const handleApprove = async (app: Application, role: "artist" | "writer" | "both") => {
    if (!user) return;
    
    setProcessing(true);
    try {
      // Update application status
      const { error: appError } = await supabase
        .from("creator_applications")
        .update({ 
          status: "approved",
          admin_notes: adminNotes || null
        })
        .eq("id", app.id);

      if (appError) throw appError;

      // Create or update creator_roles
      const roleData = {
        user_id: app.user_id,
        is_artist: role === "artist" || role === "both",
        is_writer: role === "writer" || role === "both",
        approved_at: new Date().toISOString(),
        approved_by: user.id
      };

      const { error: roleError } = await supabase
        .from("creator_roles")
        .upsert(roleData);

      if (roleError) throw roleError;

      // Trigger email notification
      await supabase.functions.invoke("creator-notify", {
        body: {
          type: "approved",
          userId: app.user_id,
          roleRequested: app.role_requested
        }
      });

      toast.success("Application approved successfully!");
      setSelectedApp(null);
      setAdminNotes("");
      onUpdate();
    } catch (error: any) {
      console.error("Error approving application:", error);
      toast.error("Failed to approve application");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (app: Application) => {
    if (!adminNotes.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from("creator_applications")
        .update({ 
          status: "rejected",
          admin_notes: adminNotes
        })
        .eq("id", app.id);

      if (error) throw error;

      // Trigger email notification
      await supabase.functions.invoke("creator-notify", {
        body: {
          type: "rejected",
          userId: app.user_id,
          adminNotes: adminNotes
        }
      });

      toast.success("Application rejected");
      setSelectedApp(null);
      setAdminNotes("");
      onUpdate();
    } catch (error: any) {
      console.error("Error rejecting application:", error);
      toast.error("Failed to reject application");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Applicant</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {applications.map((app) => (
            <TableRow key={app.id}>
              <TableCell>
                <div>
                  <p className="font-medium">{app.profiles?.username || "Unknown"}</p>
                  <p className="text-sm text-muted-foreground">{app.profiles?.email}</p>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {app.role_requested.charAt(0).toUpperCase() + app.role_requested.slice(1)}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={app.status === "pending" ? "secondary" : app.status === "approved" ? "default" : "destructive"}>
                  {app.status}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(app.created_at).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setSelectedApp(app);
                    setAdminNotes(app.admin_notes || "");
                  }}
                >
                  Review
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!selectedApp} onOpenChange={() => setSelectedApp(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Application Review</DialogTitle>
            <DialogDescription>
              {selectedApp?.profiles?.username} - {selectedApp?.role_requested}
            </DialogDescription>
          </DialogHeader>

          {selectedApp && (
            <div className="space-y-6">
              <div>
                <h3 className="font-medium mb-2">Bio</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {selectedApp.bio}
                </p>
              </div>

              <div>
                <h3 className="font-medium mb-2">Portfolio Links</h3>
                <div className="space-y-1">
                  {selectedApp.portfolio_links.map((link, i) => (
                    <a
                      key={i}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="w-4 h-4" />
                      {link}
                    </a>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2">Admin Notes (optional)</h3>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes for the applicant..."
                  rows={3}
                />
              </div>

              {selectedApp.status === "pending" && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleApprove(selectedApp, selectedApp.role_requested as any)}
                    disabled={processing}
                    className="flex-1"
                  >
                    Approve ({selectedApp.role_requested})
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleReject(selectedApp)}
                    disabled={processing}
                    className="flex-1"
                  >
                    Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
