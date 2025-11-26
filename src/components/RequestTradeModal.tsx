import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface RequestTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  listingId: string;
  itemTitle: string;
}

export const RequestTradeModal = ({
  isOpen,
  onClose,
  listingId,
  itemTitle,
}: RequestTradeModalProps) => {
  const [offerTitle, setOfferTitle] = useState("");
  const [offerIssue, setOfferIssue] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!offerTitle.trim()) {
      toast.error("Please enter the comic you're offering");
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
        toast.error("Please log in to request a trade");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('submit-trade-request', {
        body: {
          listingId,
          offerTitle: offerTitle.trim(),
          offerIssue: offerIssue.trim() || null,
          message: message.trim() || null,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success("Trade request sent!");
        onClose();
        setOfferTitle("");
        setOfferIssue("");
        setMessage("");
      } else {
        toast.error(data?.error || "Failed to send trade request");
      }
    } catch (error: any) {
      console.error("Error sending trade request:", error);
      toast.error("Failed to send trade request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request a Trade</DialogTitle>
          <DialogDescription>
            Propose a comic-for-comic trade for {itemTitle}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="offerTitle">Your Offer (comic title) *</Label>
            <Input
              id="offerTitle"
              type="text"
              value={offerTitle}
              onChange={(e) => setOfferTitle(e.target.value)}
              placeholder="e.g., Amazing Spider-Man"
              className="mt-1"
              required
            />
          </div>

          <div>
            <Label htmlFor="offerIssue">Issue # (optional)</Label>
            <Input
              id="offerIssue"
              type="text"
              value={offerIssue}
              onChange={(e) => setOfferIssue(e.target.value)}
              placeholder="e.g., 300"
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="message">Message to Seller (optional)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add any additional details about the trade..."
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
                'Send Trade Request'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
