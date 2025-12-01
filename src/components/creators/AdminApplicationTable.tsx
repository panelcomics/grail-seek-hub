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
  full_name: string | null;
  email: string | null;
  creator_type: string | null;
  role_requested: string | null;
  portfolio_links: string[];
  social_links: any;
  sample_files: string[];
  bio: string | null;
  requested_access: any[];
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

  const handleApprove = async (app: Application) => {
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

      // Determine roles from creator_type and requested_access
      const creatorType = app.creator_type || app.role_requested || 'artist';
      const isArtist = creatorType === 'artist' || creatorType === 'cover_artist' || 
                       app.requested_access?.includes('original_art');
      const isWriter = creatorType === 'writer' || creatorType === 'grailfunding_creator' ||
                       app.requested_access?.includes('grailfunding');

      // Create or update creator_roles
      const roleData = {
        user_id: app.user_id,
        is_artist: isArtist,
        is_writer: isWriter,
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
          fullName: app.full_name,
          email: app.email,
          creatorType: app.creator_type || app.role_requested
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
          fullName: app.full_name,
          email: app.email,
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
            <TableHead>Email</TableHead>
            <TableHead>Creator Type</TableHead>
            <TableHead>Requested Access</TableHead>
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
                  <p className="font-medium">{app.full_name || app.profiles?.username || "Unknown"}</p>
                  <p className="text-sm text-muted-foreground">@{app.profiles?.username}</p>
                </div>
              </TableCell>
              <TableCell>
                <p className="text-sm">{app.email || app.profiles?.email}</p>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="capitalize">
                  {(app.creator_type || app.role_requested || '').replace(/_/g, ' ')}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {app.requested_access?.map((access, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {access.replace(/_/g, ' ')}
                    </Badge>
                  )) || <span className="text-sm text-muted-foreground">-</span>}
                </div>
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Application Review</DialogTitle>
            <DialogDescription>
              {selectedApp?.full_name || selectedApp?.profiles?.username} - {(selectedApp?.creator_type || selectedApp?.role_requested || '').replace(/_/g, ' ')}
            </DialogDescription>
          </DialogHeader>

          {selectedApp && (
            <div className="space-y-6">
              <div>
                <h3 className="font-medium mb-2">Applicant Info</h3>
                <div className="space-y-1 text-sm">
                  <p><strong>Full Name:</strong> {selectedApp.full_name || 'Not provided'}</p>
                  <p><strong>Email:</strong> {selectedApp.email || selectedApp.profiles?.email}</p>
                  <p><strong>Username:</strong> @{selectedApp.profiles?.username}</p>
                  <p><strong>Creator Type:</strong> {(selectedApp.creator_type || selectedApp.role_requested || '').replace(/_/g, ' ')}</p>
                  <p><strong>Submitted:</strong> {new Date(selectedApp.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2">Requested Access</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedApp.requested_access?.map((access, idx) => (
                    <Badge key={idx} variant="secondary">
                      {access.replace(/_/g, ' ')}
                    </Badge>
                  )) || <span className="text-sm text-muted-foreground">None specified</span>}
                </div>
              </div>

              {selectedApp.bio && (
                <div>
                  <h3 className="font-medium mb-2">Bio</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedApp.bio}
                  </p>
                </div>
              )}

              <div>
                <h3 className="font-medium mb-2">Portfolio Links</h3>
                <div className="space-y-1">
                  {selectedApp.portfolio_links?.map((link, i) => (
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

              {selectedApp.social_links && Object.keys(selectedApp.social_links).filter(k => selectedApp.social_links[k]).length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">Social Media</h3>
                  <div className="space-y-1">
                    {Object.entries(selectedApp.social_links).map(([platform, url]) => (
                      url && (
                        <a
                          key={platform}
                          href={url as string}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-primary hover:underline capitalize"
                        >
                          <ExternalLink className="w-4 h-4" />
                          {platform}: {url as string}
                        </a>
                      )
                    ))}
                  </div>
                </div>
              )}

              {selectedApp.sample_files && selectedApp.sample_files.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">Sample Files</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedApp.sample_files.map((file, idx) => (
                      <a
                        key={idx}
                        href={file}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:underline p-2 border rounded"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View Sample {idx + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}

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
                    onClick={() => handleApprove(selectedApp)}
                    disabled={processing}
                    className="flex-1"
                  >
                    {processing ? "Processing..." : "Approve Application"}
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
