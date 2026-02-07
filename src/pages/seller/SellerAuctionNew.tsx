import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuctionWizardBasics } from "@/components/auction/wizard/AuctionWizardBasics";
import { AuctionWizardCloseRules } from "@/components/auction/wizard/AuctionWizardCloseRules";
import { AuctionWizardLots } from "@/components/auction/wizard/AuctionWizardLots";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AuctionEventDraft,
  AuctionEventType,
  DEFAULT_CLOSE_SCHEDULE,
  MockLot,
  AuctionCloseSchedule,
} from "@/config/auctionEventTypes";

const STEPS = ["Basics", "Close Rules", "Lots"];

export default function SellerAuctionNew() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const [name, setName] = useState("");
  const [type, setType] = useState<AuctionEventType>("event");
  const [description, setDescription] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");

  const [closeSchedule, setCloseSchedule] = useState<AuctionCloseSchedule>(DEFAULT_CLOSE_SCHEDULE);
  const [lots, setLots] = useState<MockLot[]>([]);

  const draft: AuctionEventDraft = {
    id: `draft-${Date.now()}`,
    name: name || "Untitled Event",
    type,
    description,
    coverImageUrl,
    closeSchedule,
    lots,
    status: "draft",
  };

  return (
    <>
      <Helmet>
        <title>Create Auction Event | Seller Dashboard | GrailSeeker</title>
      </Helmet>

      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-6">
        <button
          onClick={() => navigate("/seller/auctions")}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Auction Events
        </button>

        <h1 className="text-2xl font-bold text-foreground">
          Create Auction Event
        </h1>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {STEPS.map((label, i) => (
            <button
              key={label}
              onClick={() => setStep(i)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                i === step
                  ? "bg-primary text-primary-foreground"
                  : i < step
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <span className="w-4 h-4 rounded-full border flex items-center justify-center text-[10px] font-bold border-current">
                {i + 1}
              </span>
              {label}
            </button>
          ))}
        </div>

        {/* Step content */}
        {step === 0 && (
          <AuctionWizardBasics
            name={name}
            onNameChange={setName}
            type={type}
            onTypeChange={setType}
            description={description}
            onDescriptionChange={setDescription}
            coverImageUrl={coverImageUrl}
            onCoverImageUrlChange={setCoverImageUrl}
          />
        )}
        {step === 1 && (
          <AuctionWizardCloseRules
            schedule={closeSchedule}
            onChange={setCloseSchedule}
          />
        )}
        {step === 2 && (
          <AuctionWizardLots
            lots={lots}
            onChange={setLots}
            closeSchedule={closeSchedule}
          />
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          <Button
            variant="outline"
            size="sm"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            Previous
          </Button>

          <div className="flex gap-2">
            {step < STEPS.length - 1 ? (
              <Button size="sm" onClick={() => setStep((s) => s + 1)}>
                Next
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    window.open(`/auctions`, "_blank")
                  }
                >
                  View Public Preview
                </Button>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="sm" disabled>
                        Save Draft (Disabled)
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">
                        Preview mode — saving will be enabled when auctions go live.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
