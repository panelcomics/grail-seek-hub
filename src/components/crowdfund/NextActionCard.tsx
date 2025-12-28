// Crowdfunding creator dashboard — next action card
import { PenLine, MessageSquarePlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NextActionCardProps {
  hasUpdates: boolean;
  onPostUpdate: () => void;
  className?: string;
}

export function NextActionCard({ hasUpdates, onPostUpdate, className }: NextActionCardProps) {
  return (
    <Card className={cn("border-primary/20 bg-primary/5", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Next Step</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <p className="text-sm text-muted-foreground">
          {hasUpdates 
            ? "Keep backers informed" 
            : "Post your first update"
          }
        </p>
        <Button onClick={onPostUpdate} className="w-full" size="sm">
          {hasUpdates ? (
            <>
              <MessageSquarePlus className="h-4 w-4 mr-2" />
              Post Update
            </>
          ) : (
            <>
              <PenLine className="h-4 w-4 mr-2" />
              Add Update
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
