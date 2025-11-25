import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MarkSoldOffPlatformModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string;
  itemTitle: string;
  onSuccess: () => void;
}

const CHANNEL_OPTIONS = [
  { value: "facebook_group", label: "Facebook Group" },
  { value: "instagram", label: "Instagram" },
  { value: "local_show", label: "Local Show / In-Person" },
  { value: "other", label: "Other" },
];

export function MarkSoldOffPlatformModal({
  open,
  onOpenChange,
  itemId,
  itemTitle,
  onSuccess,
}: MarkSoldOffPlatformModalProps) {
  const [channel, setChannel] = useState("");
  const [loading, setLoading] = useState(false);

  const handleMarkSold = async () => {
    if (!channel) {
      toast.error("Please select a channel");
      return;
    }

    setLoading(true);
    try {
      // Update inventory item to mark as sold off-platform
      const { error: inventoryError } = await supabase
        .from("inventory_items")
        .update({
          sold_off_platform: true,
          sold_off_platform_date: new Date().toISOString(),
          sold_off_platform_channel: channel,
          listing_status: "sold_off_platform",
          for_sale: false,
          for_auction: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", itemId);

      if (inventoryError) throw inventoryError;

      // Deactivate any associated listings
      const { error: listingsError } = await supabase
        .from("listings")
        .update({ status: "sold_off_platform" })
        .eq("inventory_item_id", itemId)
        .in("status", ["active", "live", "listed"]);

      if (listingsError) {
        console.error("Error deactivating listings:", listingsError);
      }

      toast.success("Item marked as sold off-platform");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error marking item as sold:", error);
      toast.error("Failed to mark item as sold");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Mark as Sold Off-Platform</DialogTitle>
          <DialogDescription>
            This will mark "{itemTitle}" as sold outside of GrailSeeker. No platform fees will be charged.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="channel">Where was this sold?</Label>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger id="channel">
                <SelectValue placeholder="Select a channel" />
              </SelectTrigger>
              <SelectContent>
                {CHANNEL_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-muted-foreground space-y-1">
            <p>This action will:</p>
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              <li>Remove the listing from public search results</li>
              <li>Keep the listing visible in your inventory history</li>
              <li>Not charge any GrailSeeker fees</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleMarkSold} disabled={loading || !channel}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Mark as Sold
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
