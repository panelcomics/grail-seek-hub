import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { calculateMarketplaceFeeWithCustomRate, formatCents, formatFeeRate } from "@/lib/fees";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface ListItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inventoryItem: any;
  onSuccess: () => void;
}

export function ListItemModal({ open, onOpenChange, inventoryItem, onSuccess }: ListItemModalProps) {
  const { user } = useAuth();
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [customFeeRate, setCustomFeeRate] = useState<number | null>(null);
  const [isFoundingSeller, setIsFoundingSeller] = useState(false);

  useEffect(() => {
    const fetchSellerFee = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('custom_fee_rate, is_founding_seller')
          .eq('user_id', user.id)
          .single();

        if (!error && data) {
          setCustomFeeRate(data.custom_fee_rate);
          setIsFoundingSeller(data.is_founding_seller || false);
        }
      } catch (error) {
        console.error('Error fetching seller fee:', error);
      }
    };

    if (open) {
      fetchSellerFee();
    }
  }, [user?.id, open]);

  const priceCents = Math.round(parseFloat(price || "0") * 100);
  const { fee_cents, payout_cents } = calculateMarketplaceFeeWithCustomRate(priceCents, customFeeRate);

  const handleList = async () => {
    if (!price || parseFloat(price) <= 0) {
      toast.error("Please enter a valid price");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("listings")
        .insert({
          inventory_item_id: inventoryItem.id,
          user_id: inventoryItem.user_id || inventoryItem.owner_id,
          price_cents: priceCents,
          fee_cents,
          payout_cents,
          quantity: 1,
          status: "active",
          title: inventoryItem.title,
          issue_number: inventoryItem.issue_number,
        } as any);

      if (error) throw error;

      await supabase.from("event_logs").insert({
        user_id: inventoryItem.user_id || inventoryItem.owner_id,
        event: "listing_created",
        meta: { inventory_item_id: inventoryItem.id, price_cents: priceCents },
      });

      toast.success("Item listed for sale!");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error listing item:", error);
      toast.error(error.message || "Failed to list item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>List Item for Sale</DialogTitle>
          <DialogDescription>
            Set your price and review the fees before listing
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold">{inventoryItem?.title}</h3>
            {inventoryItem?.issue_number && (
              <p className="text-sm text-muted-foreground">Issue #{inventoryItem.issue_number}</p>
            )}
          </div>

          <div>
            <Label htmlFor="price">Sale Price</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {isFoundingSeller 
                ? "Your seller fee: 2% GrailSeeker fee + Stripe processing" 
                : "Your seller fee: 3.75% GrailSeeker fee + Stripe processing"}
            </p>
          </div>

          {priceCents > 0 && (
            <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
              <div className="flex justify-between">
                <span>Sale Price:</span>
                <span className="font-medium">{formatCents(priceCents)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total selling fee:</span>
                <span>-{formatCents(fee_cents)}</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-2">
                <span>Your Payout:</span>
                <span className="text-primary">{formatCents(payout_cents)}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleList} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            List for Sale
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
