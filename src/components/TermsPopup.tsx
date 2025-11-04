import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, Shield, Scale } from "lucide-react";

interface TermsPopupProps {
  open: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export const TermsPopup = ({ open, onAccept, onDecline }: TermsPopupProps) => {
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

  const handleAccept = () => {
    if (acceptedTerms && acceptedPrivacy) {
      onAccept();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onDecline()}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Scale className="h-6 w-6" />
            Terms & Conditions
          </DialogTitle>
          <DialogDescription>
            Please review and accept our terms before continuing
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="space-y-4 text-sm">
            {/* Critical Warning */}
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="font-semibold text-destructive">
                    Important Legal Disclaimer
                  </p>
                  <p className="text-muted-foreground">
                    By using Grail Seeker, you acknowledge and accept all risks associated with 
                    buying, selling, and trading collectibles through our platform.
                  </p>
                </div>
              </div>
            </div>

            {/* Key Points */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Key Points You Must Understand:
              </h3>

              <div className="space-y-2 pl-2">
                <div className="border-l-2 border-amber-500 pl-3">
                  <p className="font-medium">Maximum Liability: $100</p>
                  <p className="text-muted-foreground text-xs">
                    Grail Seeker's total liability to you cannot exceed $100, regardless of claim type.
                  </p>
                </div>

                <div className="border-l-2 border-red-500 pl-3">
                  <p className="font-medium">No Meetup Liability</p>
                  <p className="text-muted-foreground text-xs">
                    We have ZERO responsibility for injuries, theft, fraud, or any incidents during in-person 
                    meetups. You meet others entirely at your own risk.
                  </p>
                </div>

                <div className="border-l-2 border-orange-500 pl-3">
                  <p className="font-medium">No Shipping Liability</p>
                  <p className="text-muted-foreground text-xs">
                    Lost, damaged, or stolen items during shipping are not our responsibility. We recommend 
                    purchasing shipping insurance for valuable items.
                  </p>
                </div>

                <div className="border-l-2 border-blue-500 pl-3">
                  <p className="font-medium">You Indemnify Us</p>
                  <p className="text-muted-foreground text-xs">
                    You agree to cover all legal costs and damages if we're sued because of your actions, 
                    disputes, or transactions on the platform.
                  </p>
                </div>

                <div className="border-l-2 border-purple-500 pl-3">
                  <p className="font-medium">Binding Arbitration</p>
                  <p className="text-muted-foreground text-xs">
                    Disputes must be resolved through individual arbitration, not court. You waive the right 
                    to class action lawsuits. (30-day opt-out available)
                  </p>
                </div>

                <div className="border-l-2 border-green-500 pl-3">
                  <p className="font-medium">Shipping Insurance Recommended</p>
                  <p className="text-muted-foreground text-xs">
                    For shipped items over $100, we strongly recommend purchasing insurance through your carrier. 
                    Sellers are responsible for obtaining insurance.
                  </p>
                </div>
              </div>
            </div>

            {/* Full Terms Link */}
            <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
              <p>
                This is a summary. Full terms and conditions apply.{" "}
                <Link to="/terms" target="_blank" className="underline hover:text-foreground font-medium">
                  Read complete Terms of Service
                </Link>
                {" "}and{" "}
                <Link to="/privacy" target="_blank" className="underline hover:text-foreground font-medium">
                  Privacy Policy
                </Link>
              </p>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col gap-3 sm:flex-col">
          {/* Acceptance Checkboxes */}
          <div className="space-y-3 w-full">
            <div className="flex items-start space-x-2">
              <Checkbox 
                id="accept-terms"
                checked={acceptedTerms}
                onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
              />
              <label
                htmlFor="accept-terms"
                className="text-sm leading-tight cursor-pointer"
              >
                I have read and agree to the{" "}
                <Link to="/terms" target="_blank" className="underline font-medium hover:text-primary">
                  Terms of Service
                </Link>
                , including the $100 liability cap, arbitration clause, and acknowledgment that Grail Seeker 
                has no responsibility for meetup injuries or shipping losses
              </label>
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox 
                id="accept-privacy"
                checked={acceptedPrivacy}
                onCheckedChange={(checked) => setAcceptedPrivacy(checked as boolean)}
              />
              <label
                htmlFor="accept-privacy"
                className="text-sm leading-tight cursor-pointer"
              >
                I have read and agree to the{" "}
                <Link to="/privacy" target="_blank" className="underline font-medium hover:text-primary">
                  Privacy Policy
                </Link>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 w-full">
            <Button 
              variant="outline" 
              onClick={onDecline}
              className="flex-1"
            >
              Decline
            </Button>
            <Button 
              onClick={handleAccept}
              disabled={!acceptedTerms || !acceptedPrivacy}
              className="flex-1"
            >
              Accept & Continue
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
