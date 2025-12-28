// Crowdfunding creator update timeline — additive, trust-focused
import { useState } from "react";
import { Calendar, FileText, Package, Truck, Rocket, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";

type UpdateType = "launch" | "progress" | "preview" | "production" | "shipping";

interface Update {
  id: string;
  title: string;
  body_markdown: string;
  created_at: string;
  update_type?: UpdateType;
  image_url?: string;
}

interface CreatorUpdateTimelineProps {
  updates: Update[];
  className?: string;
}

const updateTypeConfig: Record<UpdateType, { label: string; icon: React.ReactNode }> = {
  launch: { label: "Launch Update", icon: <Rocket className="h-3 w-3" /> },
  progress: { label: "Progress Update", icon: <FileText className="h-3 w-3" /> },
  preview: { label: "Preview", icon: <FileText className="h-3 w-3" /> },
  production: { label: "Production Update", icon: <Package className="h-3 w-3" /> },
  shipping: { label: "Shipping Update", icon: <Truck className="h-3 w-3" /> },
};

function UpdateEntry({ update }: { update: Update }) {
  const [expanded, setExpanded] = useState(false);
  const typeConfig = update.update_type ? updateTypeConfig[update.update_type] : null;
  
  // Determine if body is long enough to warrant expansion
  const isLongBody = update.body_markdown.length > 200;
  const displayBody = isLongBody && !expanded 
    ? update.body_markdown.slice(0, 200) + "..."
    : update.body_markdown;

  return (
    <div className="relative pl-6 pb-6 border-l border-border/50 last:border-l-transparent last:pb-0">
      {/* Timeline dot */}
      <div className="absolute left-0 top-0 -translate-x-1/2 w-3 h-3 rounded-full bg-primary/20 border-2 border-primary" />
      
      <div className="space-y-2">
        {/* Date + Type */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(new Date(update.created_at), "MMM d, yyyy")}
          </span>
          {typeConfig && (
            <Badge variant="secondary" className="text-xs font-normal flex items-center gap-1">
              {typeConfig.icon}
              {typeConfig.label}
            </Badge>
          )}
        </div>

        {/* Title */}
        <h4 className="font-semibold text-foreground">{update.title}</h4>

        {/* Body */}
        <div className="text-sm text-muted-foreground whitespace-pre-wrap">
          {displayBody}
        </div>

        {/* Expand/Collapse */}
        {isLongBody && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3 w-3 mr-1" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 mr-1" />
                Read more
              </>
            )}
          </Button>
        )}

        {/* Optional image */}
        {update.image_url && (
          <div className="mt-3 rounded-lg overflow-hidden border">
            <img
              src={update.image_url}
              alt={update.title}
              className="w-full h-auto max-h-64 object-cover"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function CreatorUpdateTimeline({ updates, className }: CreatorUpdateTimelineProps) {
  // If no updates, show empty state
  if (!updates || updates.length === 0) {
    return (
      <Card className={cn("border-border/50", className)}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Creator Updates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm">Creator updates will appear here.</p>
            <p className="text-xs mt-1 text-muted-foreground/70">
              Backers will be notified as the campaign progresses.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-border/50", className)}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Creator Updates</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-0">
          {updates.map((update) => (
            <UpdateEntry key={update.id} update={update} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
