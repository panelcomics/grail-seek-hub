import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Scan, Zap, Truck, ChevronRight } from "lucide-react";

interface OnboardingProps {
  open: boolean;
  onComplete: () => void;
}

const onboardingSteps = [
  {
    icon: Scan,
    title: "Add Your First Grail!",
    description: "Scan or upload a comic/book → get instant value → list for swaps. Free under $50.",
    highlight: "Start building your collection",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: Zap,
    title: "Instant Value & Smart Fees",
    description: "See real-time market values. Trade fees based on total value: $2-$100 per trade pair for items under $250",
    highlight: "Transparent pricing",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  {
    icon: Truck,
    title: "Invite Friends, Get Bonus Matches",
    description: "Share your grails and invite friends to unlock more swap opportunities. The more you add, the more you match!",
    highlight: "Grow your network",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
];

export default function Onboarding({ open, onComplete }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const step = onboardingSteps[currentStep];
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
            {onboardingSteps.map((_, index) => (
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
        <div className="border-t bg-muted/30 px-8 py-6 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Step {currentStep + 1} of {onboardingSteps.length}
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
              {currentStep < onboardingSteps.length - 1 ? (
                <>
                  Next
                  <ChevronRight className="h-4 w-4" />
                </>
              ) : (
                "Scan Now"
              )}
            </Button>
            {currentStep === onboardingSteps.length - 1 && (
              <Button onClick={handleSkip} variant="outline" className="gap-2">
                Browse Grails
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
