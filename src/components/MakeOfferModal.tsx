import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface MakeOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  listingId: string;
  itemTitle: string;
}

export const MakeOfferModal = ({
  isOpen,
  onClose,
  listingId,
  itemTitle,
}: MakeOfferModalProps) => {
  const [offerAmount, setOfferAmount] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = parseFloat(offerAmount);
    if (!offerAmount || isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid offer amount");
      return;
    }

    if (message.length > 500) {
      toast.error("Message must be 500 characters or less");
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Please log in to make an offer");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('submit-offer', {
        body: {
          listingId,
          offerAmount: amount,
          message: message.trim() || null,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success("Offer sent to seller!");
        onClose();
        setOfferAmount("");
        setMessage("");
      } else {
        toast.error(data?.error || "Failed to send offer");
      }
    } catch (error: any) {
      console.error("Error sending offer:", error);
      toast.error("Failed to send offer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Make an Offer</DialogTitle>
          <DialogDescription>
            Send an offer for {itemTitle}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="offerAmount">Offer Amount *</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="offerAmount"
                type="number"
                min="1"
                step="0.01"
                value={offerAmount}
                onChange={(e) => setOfferAmount(e.target.value)}
                placeholder="0.00"
                className="pl-7"
                required
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="message">Message (optional)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a message to the seller..."
              rows={3}
              className="mt-1"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {message.length}/500 characters
            </p>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              style={{ backgroundColor: '#F44336' }}
              className="hover:opacity-90"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                'Submit Offer'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
