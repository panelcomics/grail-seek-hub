import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Shield, CheckCircle2 } from "lucide-react";

interface RiskAssessment {
  id: string;
  risk_level: "low" | "medium" | "high";
  reasons: string[] | null;
  payout_hold: boolean;
  created_at: string;
}

interface OrderRiskBadgeProps {
  riskAssessment: RiskAssessment | null;
  compact?: boolean;
}

const RISK_CONFIG = {
  low: {
    label: "Low Risk",
    variant: "outline" as const,
    icon: CheckCircle2,
    color: "text-green-600",
  },
  medium: {
    label: "Medium Risk",
    variant: "secondary" as const,
    icon: Shield,
    color: "text-amber-600",
  },
  high: {
    label: "High Risk",
    variant: "destructive" as const,
    icon: AlertTriangle,
    color: "text-red-600",
  },
};

export function OrderRiskBadge({ riskAssessment, compact = false }: OrderRiskBadgeProps) {
  if (!riskAssessment) {
    return null;
  }

  const config = RISK_CONFIG[riskAssessment.risk_level];
  const Icon = config.icon;

  if (compact) {
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${config.color}`}>
      <Icon className="h-4 w-4" />
      <span className="text-sm font-medium">{config.label}</span>
    </div>
  );
}

interface OrderRiskCardProps {
  riskAssessment: RiskAssessment | null;
}

export function OrderRiskCard({ riskAssessment }: OrderRiskCardProps) {
  if (!riskAssessment || riskAssessment.risk_level === "low") {
    return null;
  }

  const config = RISK_CONFIG[riskAssessment.risk_level];
  const Icon = config.icon;

  return (
    <Card className={`border-${riskAssessment.risk_level === "high" ? "destructive" : "warning"}/50`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Icon className={`h-4 w-4 ${config.color}`} />
          Risk Assessment
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Badge variant={config.variant}>{config.label}</Badge>
          
          {riskAssessment.payout_hold && (
            <p className="text-sm text-muted-foreground">
              <strong>Payout on hold</strong> pending verification.
            </p>
          )}

          {riskAssessment.reasons && riskAssessment.reasons.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground mb-1">Reasons:</p>
              <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                {riskAssessment.reasons.map((reason, index) => (
                  <li key={index}>{reason}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
