import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, XCircle, Palette, PenTool } from "lucide-react";

interface ApplicationStatusCardProps {
  status: "pending" | "approved" | "rejected";
  roleRequested: string;
  createdAt: string;
  adminNotes?: string;
}

export function ApplicationStatusCard({ 
  status, 
  roleRequested, 
  createdAt,
  adminNotes 
}: ApplicationStatusCardProps) {
  const statusConfig = {
    pending: {
      icon: Clock,
      label: "Under Review",
      variant: "secondary" as const,
      bgClass: "bg-muted/50",
      description: "✅ Application received! We'll review this shortly and reach out if we need anything else.",
      subText: "Most creators hear back quickly."
    },
    approved: {
      icon: CheckCircle,
      label: "Approved",
      variant: "default" as const,
      bgClass: "bg-emerald-500/10 border-emerald-500/30",
      description: "🎉 You're approved! You can now create listings, run events, and sell directly on GrailSeeker.",
      subText: null
    },
    rejected: {
      icon: XCircle,
      label: "Not Approved",
      variant: "destructive" as const,
      bgClass: "bg-destructive/10 border-destructive/30",
      description: "Your application was not approved at this time. You may reapply in the future.",
      subText: null
    }
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  // Role icon helper
  const getRoleIcon = () => {
    const role = roleRequested?.toLowerCase();
    if (role === 'artist' || role === 'cover_artist') {
      return <Palette className="w-4 h-4" />;
    }
    if (role === 'writer') {
      return <PenTool className="w-4 h-4" />;
    }
    return null;
  };

  return (
    <Card className={config.bgClass}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <StatusIcon className="w-5 h-5" />
              Application Status
            </CardTitle>
            <CardDescription className="flex items-center gap-1.5 mt-1">
              {getRoleIcon()}
              Applied for: {roleRequested.charAt(0).toUpperCase() + roleRequested.slice(1).replace(/_/g, ' ')}
            </CardDescription>
          </div>
          <Badge variant={config.variant} className="text-sm px-3 py-1">
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Success confirmation for pending */}
        {status === "pending" && (
          <div className="flex items-start gap-3 p-4 bg-background rounded-lg border">
            <CheckCircle className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground mb-1">{config.description}</p>
              {config.subText && (
                <p className="text-sm text-muted-foreground">{config.subText}</p>
              )}
            </div>
          </div>
        )}

        {status !== "pending" && (
          <p className="text-sm text-muted-foreground">{config.description}</p>
        )}
        
        {adminNotes && status === "rejected" && (
          <div className="p-3 rounded-lg bg-background border">
            <p className="text-sm font-medium mb-1">Feedback from our team:</p>
            <p className="text-sm text-muted-foreground">{adminNotes}</p>
          </div>
        )}

        {adminNotes && status === "approved" && (
          <div className="p-3 rounded-lg bg-background border">
            <p className="text-sm font-medium mb-1">Welcome note:</p>
            <p className="text-sm text-muted-foreground">{adminNotes}</p>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Submitted on {new Date(createdAt).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      </CardContent>
    </Card>
  );
}
