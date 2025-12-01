import { Button } from "@/components/ui/button";
import { Rocket, TrendingUp } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: "rocket" | "trending";
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  title = "No campaigns yet",
  description = "Be the first to launch a project and bring your comic vision to life!",
  icon = "rocket",
  actionLabel,
  onAction
}: EmptyStateProps) {
  const Icon = icon === "rocket" ? Rocket : TrendingUp;

  return (
    <div className="text-center py-16 px-4">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
        <Icon className="w-10 h-10 text-primary" />
      </div>
      
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-md mx-auto mb-6">
        {description}
      </p>
      
      {actionLabel && onAction && (
        <Button onClick={onAction} size="lg">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
