import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Scan, Zap, TrendingUp, ChevronRight } from "lucide-react";

interface AiScannerTourProps {
  open: boolean;
  onComplete: (dontShowAgain: boolean) => void;
}

const tourSteps = [
  {
    icon: Scan,
    title: "Snap a photo",
    description: "Use your camera or upload images from your library. Our AI instantly identifies comics and cards.",
    highlight: "AI-powered recognition",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: Zap,
    title: "Get instant values",
    description: "See real-time market prices and comparable sales in seconds. No manual lookups needed.",
    highlight: "Market data powered by AI",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  {
    icon: TrendingUp,
    title: "Build your portfolio",
    description: "Save scanned items to track collection value over time and spot price trends.",
    highlight: "Track your collection",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
];

export default function AiScannerTour({ open, onComplete }: AiScannerTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete(dontShowAgain);
    }
  };

  const handleSkip = () => {
    onComplete(dontShowAgain);
  };

  const step = tourSteps[currentStep];
  const Icon = step.icon;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="max-w-md p-0 gap-0 overflow-hidden border-2 [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Step Content */}
        <div className="p-8 pb-6">
          {/* Icon */}
          <div className={`inline-flex h-20 w-20 items-center justify-center rounded-2xl ${step.bgColor} mb-6`}>
            <Icon className={`h-10 w-10 ${step.color}`} />
          </div>

          {/* Step indicator */}
          <div className="flex gap-1.5 mb-6">
            {tourSteps.map((_, index) => (
              <div
                key={index}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  index === currentStep
                    ? "bg-primary"
                    : index < currentStep
                    ? "bg-primary/50"
                    : "bg-muted"
                }`}
              />
            ))}
          </div>

          {/* Content */}
          <div className="space-y-3 mb-8">
            <Badge variant="secondary" className="mb-2">
              {step.highlight}
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight">{step.title}</h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              {step.description}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-muted/30 px-8 py-6 space-y-4">
          {/* Don't show again checkbox - only on last step */}
          {currentStep === tourSteps.length - 1 && (
            <div className="flex items-start space-x-2">
              <Checkbox 
                id="dont-show-again"
                checked={dontShowAgain}
                onCheckedChange={(checked) => setDontShowAgain(checked as boolean)}
              />
              <label
                htmlFor="dont-show-again"
                className="text-sm leading-tight cursor-pointer text-muted-foreground"
              >
                Don't show this tour again
              </label>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Step {currentStep + 1} of {tourSteps.length}
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={handleSkip}
                className="text-muted-foreground"
              >
                Skip
              </Button>
              <Button onClick={handleNext} className="gap-2">
                {currentStep < tourSteps.length - 1 ? (
                  <>
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </>
                ) : (
                  "Start Scanning"
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
