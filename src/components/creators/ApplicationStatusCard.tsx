import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, XCircle } from "lucide-react";

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
      description: "Your application is being reviewed by our team. We'll notify you via email once a decision is made."
    },
    approved: {
      icon: CheckCircle,
      label: "Approved",
      variant: "default" as const,
      description: "Congratulations! Your application has been approved. You can now access creator features."
    },
    rejected: {
      icon: XCircle,
      label: "Not Approved",
      variant: "destructive" as const,
      description: "Your application was not approved at this time. You may reapply in the future."
    }
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <StatusIcon className="w-5 h-5" />
              Application Status
            </CardTitle>
            <CardDescription>
              Applied for: {roleRequested.charAt(0).toUpperCase() + roleRequested.slice(1)}
            </CardDescription>
          </div>
          <Badge variant={config.variant}>{config.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{config.description}</p>
        
        {adminNotes && status === "rejected" && (
          <div className="p-3 rounded-lg bg-muted">
            <p className="text-sm font-medium mb-1">Note from team:</p>
            <p className="text-sm text-muted-foreground">{adminNotes}</p>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Submitted {new Date(createdAt).toLocaleDateString()}
        </p>
      </CardContent>
    </Card>
  );
}
