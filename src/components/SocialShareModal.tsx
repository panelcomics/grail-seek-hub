import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Share2, Mail, Plus } from "lucide-react";
import { ShareButton } from "./ShareButton";

interface SocialShareModalProps {
  open: boolean;
  onClose: () => void;
  itemTitle: string;
  itemValue?: number;
  feeTier?: string;
}

export const SocialShareModal = ({ 
  open, 
  onClose, 
  itemTitle, 
  itemValue,
  feeTier 
}: SocialShareModalProps) => {
  const getFeeMessage = () => {
    if (!itemValue) return "";
    if (itemValue <= 50) return "Free to trade (under $50)!";
    if (itemValue <= 100) return "This fits $2.50 each fee tier";
    if (itemValue <= 250) return "This fits $6 each fee tier";
    if (itemValue <= 500) return "This fits $11 each fee tier";
    return "This fits higher value tier";
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Share this Grail? 🎉</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            You just added <span className="font-semibold text-foreground">{itemTitle}</span>!
          </p>
          
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
            <p className="text-sm font-medium mb-2">Invite a friend to swap!</p>
            <p className="text-xs text-muted-foreground">
              {getFeeMessage()}
            </p>
          </div>

          <div className="flex gap-2">
            <ShareButton 
              url={`/browse`}
              title={`Check out ${itemTitle} on GrailSeeker!`}
              variant="default"
              size="default"
            />
            
            <Button variant="outline" size="default" asChild>
              <a href={`mailto:?subject=Check out my grail on GrailSeeker&body=I just added ${itemTitle} to my collection!`}>
                <Mail className="h-4 w-4 mr-2" />
                Email
              </a>
            </Button>
          </div>

          <Button onClick={onClose} variant="secondary" className="w-full gap-2">
            <Plus className="h-4 w-4" />
            Add More Grails
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
