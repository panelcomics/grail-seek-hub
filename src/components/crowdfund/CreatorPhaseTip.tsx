// Crowdfunding creator in-product tips — additive, non-intrusive
import { Lightbulb, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CampaignPhase } from "@/hooks/useCampaignPhaseTips";

interface CreatorPhaseTipProps {
  tipCopy: string;
  ctaLabel: string;
  dismissLabel: string;
  phase: CampaignPhase;
  onAction: () => void;
  onDismiss: () => void;
}

export function CreatorPhaseTip({
  tipCopy,
  ctaLabel,
  dismissLabel,
  onAction,
  onDismiss,
}: CreatorPhaseTipProps) {
  return (
    <Card className="border-primary/20 bg-primary/5 relative">
      <button
        onClick={onDismiss}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss tip"
      >
        <X className="h-4 w-4" />
      </button>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-primary/10 shrink-0">
            <Lightbulb className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground leading-relaxed mb-3">
              {tipCopy}
            </p>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={onAction}>
                {ctaLabel}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onDismiss}
                className="text-muted-foreground"
              >
                {dismissLabel}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
