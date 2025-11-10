import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Flag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ReportListingButtonProps {
  listingId: string;
  variant?: "default" | "ghost" | "outline";
}

export function ReportListingButton({ listingId, variant = "ghost" }: ReportListingButtonProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Please log in to report listings");
      return;
    }

    if (!reason) {
      toast.error("Please select a reason");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("moderation_flags").insert({
        listing_id: listingId,
        reporter_id: user.id,
        reason: `${reason}${details ? `: ${details}` : ""}`,
      });

      if (error) throw error;

      toast.success("Report submitted successfully");
      setOpen(false);
      setReason("");
      setDetails("");
    } catch (error: any) {
      console.error("Error submitting report:", error);
      toast.error(error.message || "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size="sm">
          <Flag className="h-4 w-4 mr-2" />
          Report
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report Listing</DialogTitle>
          <DialogDescription>
            Help us keep the marketplace safe by reporting suspicious or inappropriate listings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="reason">Reason *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="reason">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fake">Counterfeit/Fake Item</SelectItem>
                <SelectItem value="scam">Suspected Scam</SelectItem>
                <SelectItem value="inappropriate">Inappropriate Content</SelectItem>
                <SelectItem value="misleading">Misleading Description</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="details">Additional Details (Optional)</Label>
            <Textarea
              id="details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Provide more information about the issue..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting || !reason}>
              {submitting ? "Submitting..." : "Submit Report"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
