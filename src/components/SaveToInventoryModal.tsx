import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useModal } from "@/contexts/ModalContext";

interface ComicResult {
  id: number | null;
  name: string;
  issue_number: string;
  volume: string;
}

interface SaveToInventoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ocrText: string;
  comicvineResults: ComicResult[];
}

export function SaveToInventoryModal({ open, onOpenChange, ocrText, comicvineResults }: SaveToInventoryModalProps) {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { openModal } = useModal();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [issueNumber, setIssueNumber] = useState("");
  const [grade, setGrade] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [details, setDetails] = useState("");
  const [comicvineId, setComicvineId] = useState("");
  const [existingItem, setExistingItem] = useState<any>(null);

  useEffect(() => {
    if (open && ocrText) {
      // Auto-fill from OCR
      const firstResult = comicvineResults[0];
      if (firstResult) {
        setTitle(firstResult.name || "");
        setIssueNumber(firstResult.issue_number || "");
        setComicvineId(firstResult.id?.toString() || "");
      } else {
        const firstLine = ocrText.split('\n')[0].trim();
        setTitle(firstLine || "");
      }

      // Auto-detect CGC grade from OCR
      const cgcMatch = ocrText.match(/CGC\s+(\d+\.?\d*)/i);
      if (cgcMatch) {
        setGrade(cgcMatch[1]);
      }
    }
  }, [open, ocrText, comicvineResults]);

  useEffect(() => {
    if (open && user && title && issueNumber) {
      checkForDuplicate();
    }
  }, [open, user, title, issueNumber]);

  const checkForDuplicate = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('title', title)
        .eq('issue_number', issueNumber)
        .maybeSingle();

      setExistingItem(data);
    } catch (error) {
      console.error('Error checking for duplicate:', error);
    }
  };

  const handleSave = async () => {
    // Wait for auth to finish loading before checking user
    if (authLoading) {
      return;
    }

    if (!user) {
      toast.error("Please sign in to save to inventory");
      navigate("/auth");
      return;
    }

    if (!title) {
      toast.error("Title is required");
      return;
    }

    setLoading(true);

    try {
      const itemData = {
        user_id: user.id,
        title,
        issue_number: issueNumber || null,
        grade: grade || null,
        private_location: location || null,
        private_notes: notes || null,
        details: details || null,
        comicvine_issue_id: comicvineId || null,
      };

      if (existingItem) {
        // Update existing
        const { error } = await supabase
          .from('inventory_items')
          .update({
            grade: grade || existingItem.grade,
            private_location: location || existingItem.private_location,
            private_notes: notes || existingItem.private_notes,
            details: details || existingItem.details,
          })
          .eq('id', existingItem.id);

        if (error) throw error;
        toast.success("Updated existing inventory item", {
          action: {
            label: "View Inventory",
            onClick: () => navigate("/my-inventory"),
          },
        });
      } else {
        // Create new
        const { error } = await supabase
          .from('inventory_items')
          .insert(itemData);

        if (error) throw error;
        toast.success("Added to inventory!", {
          action: {
            label: "View Inventory",
            onClick: () => navigate("/my-inventory"),
          },
        });
        
        // Trigger social share modal for new items
        setTimeout(() => {
          openModal("socialShare", {
            itemTitle: title,
            itemValue: 0, // Can be enhanced with real value later
            onClose: () => {},
          });
        }, 500);
      }

      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error saving to inventory:', error);
      toast.error("Failed to save to inventory");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setIssueNumber("");
    setGrade("");
    setLocation("");
    setNotes("");
    setDetails("");
    setComicvineId("");
    setExistingItem(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {existingItem ? "Update Inventory Item" : "Save to My Inventory"}
          </DialogTitle>
          <DialogDescription>
            {existingItem
              ? "This item already exists. Update its location and notes."
              : "Add this comic to your private inventory with location and notes."
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Comic title"
              disabled={!!existingItem}
            />
          </div>

          <div>
            <Label htmlFor="issue">Issue Number</Label>
            <Input
              id="issue"
              value={issueNumber}
              onChange={(e) => setIssueNumber(e.target.value)}
              placeholder="#1"
              disabled={!!existingItem}
            />
          </div>

          <div>
            <Label htmlFor="grade">Grade (optional)</Label>
            <Input
              id="grade"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              placeholder="9.8, NM, etc."
            />
          </div>

          <div>
            <Label htmlFor="details">Details / Significance</Label>
            <Textarea
              id="details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="e.g., 1st appearance of the black suit, key issue, variant, signed, etc."
              rows={2}
            />
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3 text-sm text-muted-foreground">
              Private Fields (only you can see)
            </h3>

            <div className="space-y-3">
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Box A, Shelf 2, etc."
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Condition notes, purchase info, etc."
                  rows={3}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading || authLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || authLoading}>
            {(loading || authLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {existingItem ? "Update" : "Save to Inventory"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
