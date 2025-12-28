// Crowdfunding confidence + momentum layers (additive, safe-mode)
import { Shield, User, CheckCircle2, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface CreatorTrustCardProps {
  creatorUsername?: string;
  isVerifiedCreator?: boolean;
  isActiveSeller?: boolean;
  hasCompletedListings?: boolean;
  isEarlyCreator?: boolean;
  className?: string;
}

/**
 * Creator Trust Card - shows creator credibility signals
 * Rules:
 * - No numbers required
 * - No hype language
 * - No guarantees
 * - No exclusivity pressure
 */
export function CreatorTrustCard({
  creatorUsername,
  isVerifiedCreator = false,
  isActiveSeller = false,
  hasCompletedListings = false,
  isEarlyCreator = false,
  className,
}: CreatorTrustCardProps) {
  // Build trust signals array
  const trustSignals: Array<{ icon: React.ReactNode; text: string }> = [];

  if (isVerifiedCreator) {
    trustSignals.push({
      icon: <Shield className="h-4 w-4 text-primary" />,
      text: "Verified Creator on GrailSeeker",
    });
  }

  if (isActiveSeller) {
    trustSignals.push({
      icon: <User className="h-4 w-4 text-primary" />,
      text: "Active seller on GrailSeeker",
    });
  }

  if (hasCompletedListings) {
    trustSignals.push({
      icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
      text: "Previously completed listings",
    });
  }

  if (isEarlyCreator) {
    trustSignals.push({
      icon: <Sparkles className="h-4 w-4 text-amber-500" />,
      text: "Early creator on the platform",
    });
  }

  // Don't render if no trust signals
  if (trustSignals.length === 0) {
    return null;
  }

  return (
    <Card className={cn("border-border/50", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Creator Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {trustSignals.map((signal, index) => (
          <div key={index} className="flex items-center gap-2.5">
            {signal.icon}
            <span className="text-sm">{signal.text}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
