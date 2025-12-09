import { Crown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

interface UpgradeToEliteTeaserProps {
  feature?: string;
  compact?: boolean;
}

export function UpgradeToEliteTeaser({ feature, compact = false }: UpgradeToEliteTeaserProps) {
  const navigate = useNavigate();

  if (compact) {
    return (
      <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
        <Crown className="h-4 w-4 text-primary shrink-0" />
        <p className="text-sm text-muted-foreground flex-1">
          {feature ? `${feature} requires` : 'This feature requires'} Elite membership.
        </p>
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => navigate('/plans')}
          className="shrink-0"
        >
          Upgrade
        </Button>
      </div>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Crown className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-xl">Unlock with Elite</CardTitle>
        <CardDescription>
          {feature 
            ? `${feature} is an Elite-only feature`
            : 'This feature requires an Elite membership'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center pt-2">
        <ul className="text-sm text-muted-foreground mb-4 space-y-1">
          <li className="flex items-center justify-center gap-2">
            <Sparkles className="h-3 w-3 text-primary" />
            Priority access to Deal Finder
          </li>
          <li className="flex items-center justify-center gap-2">
            <Sparkles className="h-3 w-3 text-primary" />
            Unlimited saved searches
          </li>
          <li className="flex items-center justify-center gap-2">
            <Sparkles className="h-3 w-3 text-primary" />
            Early access to AI tools
          </li>
        </ul>
        <Button onClick={() => navigate('/plans')} className="gap-2">
          <Crown className="h-4 w-4" />
          Upgrade to Elite – $9.99/mo
        </Button>
      </CardContent>
    </Card>
  );
}
