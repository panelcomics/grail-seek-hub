import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Repeat2, DollarSign } from "lucide-react";

interface TradeToggleCardProps {
  itemId: string;
  initialForSale?: boolean;
  initialForTrade?: boolean;
  initialListedPrice?: number;
  initialInSearchOf?: string;
  initialTradeNotes?: string;
  onUpdate?: () => void;
}

export const TradeToggleCard = ({
  itemId,
  initialForSale = false,
  initialForTrade = false,
  initialListedPrice,
  initialInSearchOf = "",
  initialTradeNotes = "",
  onUpdate,
}: TradeToggleCardProps) => {
  const [forSale, setForSale] = useState(initialForSale);
  const [forTrade, setForTrade] = useState(initialForTrade);
  const [listedPrice, setListedPrice] = useState(initialListedPrice?.toString() || "");
  const [inSearchOf, setInSearchOf] = useState(initialInSearchOf);
  const [tradeNotes, setTradeNotes] = useState(initialTradeNotes);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (forTrade && !inSearchOf.trim()) {
      toast.error("Please add what you're looking for (In Search Of)");
      return;
    }

    setSaving(true);
    try {
      const updates: any = {
        is_for_trade: forTrade,
        in_search_of: forTrade ? inSearchOf.trim() : null,
        trade_notes: forTrade ? tradeNotes.trim() : null,
        listing_status: forSale ? "listed" : "not_listed",
        listed_price: forSale && listedPrice ? parseFloat(listedPrice) : null,
      };

      const { error } = await supabase
        .from("inventory_items")
        .update(updates)
        .eq("id", itemId);

      if (error) throw error;

      toast.success("Listing updated!");
      onUpdate?.();
    } catch (error: any) {
      console.error("Error updating listing:", error);
      toast.error(error.message || "Failed to update listing");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Listing Options</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* For Sale Toggle */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <Label htmlFor="for-sale" className="text-base font-semibold">
                List for Sale
              </Label>
            </div>
            <Switch
              id="for-sale"
              checked={forSale}
              onCheckedChange={setForSale}
            />
          </div>
          {forSale && (
            <div>
              <Label htmlFor="price">Price *</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={listedPrice}
                onChange={(e) => setListedPrice(e.target.value)}
                placeholder="0.00"
                className="mt-1"
              />
            </div>
          )}
        </div>

        {/* For Trade Toggle */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Repeat2 className="h-5 w-5 text-primary" />
              <Label htmlFor="for-trade" className="text-base font-semibold">
                List for Trade
              </Label>
            </div>
            <Switch
              id="for-trade"
              checked={forTrade}
              onCheckedChange={setForTrade}
            />
          </div>
          {forTrade && (
            <>
              <div>
                <Label htmlFor="in-search-of">In Search Of *</Label>
                <Input
                  id="in-search-of"
                  value={inSearchOf}
                  onChange={(e) => setInSearchOf(e.target.value)}
                  placeholder="Example: ASM #129 (mid-grade), Hulk #181, or similar keys"
                  className="mt-1"
                  required={forTrade}
                />
              </div>
              <div>
                <Label htmlFor="trade-notes">Trade Notes (optional)</Label>
                <Textarea
                  id="trade-notes"
                  value={tradeNotes}
                  onChange={(e) => setTradeNotes(e.target.value)}
                  placeholder="Prefer Marvel keys 1960s–1980s. No facsimiles."
                  rows={3}
                  className="mt-1"
                />
              </div>
            </>
          )}
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? "Saving..." : "Save Listing Options"}
        </Button>
      </CardContent>
    </Card>
  );
};
