// Crowdfunding creator launch tips — 48-hour guidance copy
import { Lightbulb, Clock, MessageSquare, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

interface LaunchTipsPanelProps {
  className?: string;
  variant?: "full" | "compact";
}

export function LaunchTipsPanel({ className, variant = "full" }: LaunchTipsPanelProps) {
  if (variant === "compact") {
    return (
      <Card className={cn("border-primary/20 bg-primary/5", className)}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">First 48 Hours Matter</p>
              <p className="text-xs text-muted-foreground">
                Post your first update within 24 hours to build backer confidence.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-border/50", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          Launch Tips
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          The first two days aren't about hitting your goal — they're about showing backers you're present and ready.
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="first-update" className="border-b-0">
            <AccordionTrigger className="text-sm py-3 hover:no-underline">
              <div className="flex items-center gap-2 text-left">
                <Clock className="h-4 w-4 text-primary shrink-0" />
                <span>First Update (Within 24 Hours)</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pl-6 space-y-3">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Suggested Title
                </p>
                <p className="text-sm bg-muted/50 rounded px-3 py-2">
                  "Campaign Is Live — Thanks for the Early Support"
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Suggested Copy
                </p>
                <p className="text-sm bg-muted/50 rounded px-3 py-2 whitespace-pre-wrap">
                  Thanks for checking out the project and for the early support.{"\n\n"}
                  I'll be sharing previews, progress updates, and next steps here as the campaign moves forward.{"\n\n"}
                  Appreciate everyone who's following along.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="second-update" className="border-b-0">
            <AccordionTrigger className="text-sm py-3 hover:no-underline">
              <div className="flex items-center gap-2 text-left">
                <MessageSquare className="h-4 w-4 text-primary shrink-0" />
                <span>Second Update (24-48 Hours)</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pl-6 space-y-3">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Suggested Title
                </p>
                <p className="text-sm bg-muted/50 rounded px-3 py-2">
                  "What's Coming Next"
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Suggested Copy
                </p>
                <p className="text-sm bg-muted/50 rounded px-3 py-2 whitespace-pre-wrap">
                  Over the next few days, I'll be sharing more previews and details on production and delivery.{"\n\n"}
                  If you have questions, feel free to check back here — updates will be posted as things progress.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="avoid" className="border-b-0">
            <AccordionTrigger className="text-sm py-3 hover:no-underline">
              <div className="flex items-center gap-2 text-left">
                <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>What to Avoid Early</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pl-6">
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-center gap-2">
                  <span className="text-destructive">✗</span>
                  "We're behind"
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-destructive">✗</span>
                  "Only X% funded"
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-destructive">✗</span>
                  "Please share urgently"
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-destructive">✗</span>
                  "Running out of time"
                </li>
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
