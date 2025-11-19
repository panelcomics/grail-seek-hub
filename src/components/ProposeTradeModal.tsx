import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface ProposeTradeModalProps {
  open: boolean;
  onClose: () => void;
  listingId: string;
  listingTitle: string;
  sellerId: string;
}

export function ProposeTradeModal({
  open,
  onClose,
  listingId,
  listingTitle,
  sellerId,
}: ProposeTradeModalProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [cashExtra, setCashExtra] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Please sign in to propose a trade");
      return;
    }

    if (!message.trim()) {
      toast.error("Please add a message describing your trade offer");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("trade_offers").insert({
        buyer_id: user.id,
        seller_id: sellerId,
        listing_id: listingId,
        message: message.trim(),
        cash_extra: cashExtra ? parseFloat(cashExtra) : 0,
      });

      if (error) throw error;

      // Create notification for seller
      await supabase.from("notifications").insert({
        user_id: sellerId,
        type: "trade_offer",
        message: `New trade offer on ${listingTitle}`,
        link: `/trade-offers`,
      });

      toast.success("Trade offer sent successfully!");
      setMessage("");
      setCashExtra("");
      onClose();
    } catch (error: any) {
      console.error("Error sending trade offer:", error);
      toast.error(error.message || "Failed to send trade offer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Propose a Trade</DialogTitle>
          <DialogDescription>
            Send a trade offer for {listingTitle}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="message">Describe your trade offer *</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="I have Amazing Spider-Man #300 NM and would like to trade for..."
              required
              rows={5}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="cashExtra">Cash on top? (optional)</Label>
            <Input
              id="cashExtra"
              type="number"
              min="0"
              step="0.01"
              value={cashExtra}
              onChange={(e) => setCashExtra(e.target.value)}
              placeholder="0.00"
              className="mt-1"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Sending..." : "Send Offer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
