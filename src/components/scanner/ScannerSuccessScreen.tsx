/**
 * SCANNER SUCCESS SCREEN
 * ==========================================================================
 * Book Ready to List - success state with optional quick-list pricing
 * ==========================================================================
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, DollarSign, ScanLine, List, Zap, ChevronDown, ChevronUp } from "lucide-react";
import { SCANNER_COPY } from "@/types/scannerState";
import { ComicVinePick } from "@/types/comicvine";
import { PricingHelper } from "./PricingHelper";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ScannerSuccessScreenProps {
  match: ComicVinePick | null;
  previewImage?: string | null;
  onSetPrice: () => void;
  onQuickList: (price: string, shipping: string) => void;
  onScanAnother: () => void;
  onGoToListings: () => void;
}

export function ScannerSuccessScreen({
  match,
  previewImage,
  onSetPrice,
  onQuickList,
  onScanAnother,
  onGoToListings,
}: ScannerSuccessScreenProps) {
  const copy = SCANNER_COPY.success;
  const [price, setPrice] = useState("");
  const [shipping, setShipping] = useState("5.00");
  const [showQuickPrice, setShowQuickPrice] = useState(true);

  const handleQuickList = () => {
    if (!price || parseFloat(price) <= 0) {
      return;
    }
    onQuickList(price, shipping);
  };

  const canQuickList = price && parseFloat(price) > 0;

  return (
    <Card>
      <CardHeader className="text-center pb-3">
        <div className="mx-auto w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-3">
          <CheckCircle2 className="w-6 h-6 text-green-500" />
        </div>
        <CardTitle className="text-xl">{copy.header}</CardTitle>
        <CardDescription>{copy.subtext}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Match Preview */}
        {match && (
          <div className="flex gap-4 p-4 bg-muted/50 rounded-lg">
            {/* Cover thumbnail */}
            <div className="w-16 h-22 flex-shrink-0 rounded-md overflow-hidden bg-muted border">
              {(match.coverUrl || match.thumbUrl || previewImage) ? (
                <img
                  src={match.coverUrl || match.thumbUrl || previewImage || ""}
                  alt={match.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                  No cover
                </div>
              )}
            </div>

            {/* Match details */}
            <div className="flex-1 space-y-1">
              <h3 className="font-semibold line-clamp-2">
                {match.volumeName || match.title}
              </h3>
              {match.issue && (
                <p className="text-sm text-muted-foreground">
                  Issue #{match.issue}
                </p>
              )}
              {match.year && (
                <p className="text-sm text-muted-foreground">{match.year}</p>
              )}
            </div>
          </div>
        )}

        {/* Quick Price Section - Collapsible */}
        <Collapsible open={showQuickPrice} onOpenChange={setShowQuickPrice}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full flex items-center justify-between p-3 h-auto border border-dashed border-primary/30 hover:border-primary/50 hover:bg-primary/5">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                <span className="font-medium">Quick List</span>
              </div>
              {showQuickPrice ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 space-y-3">
            {/* Price & Shipping Inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="quick-price" className="text-sm">
                  Price ($)
                </Label>
                <Input
                  id="quick-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="quick-shipping" className="text-sm">
                  Shipping ($)
                </Label>
                <Input
                  id="quick-shipping"
                  type="number"
                  step="0.01"
                  min="0"
                  value={shipping}
                  onChange={(e) => setShipping(e.target.value)}
                  placeholder="5.00"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Pricing Helper */}
            {match && (
              <PricingHelper
                title={match.volumeName || match.title || ""}
                issueNumber={match.issue}
                onPriceSelect={(selectedPrice) => setPrice(selectedPrice.toFixed(2))}
              />
            )}

            {/* Quick List Button */}
            <Button
              onClick={handleQuickList}
              disabled={!canQuickList}
              className="w-full"
              size="lg"
            >
              <Zap className="w-4 h-4 mr-2" />
              List for ${price || "0.00"} + ${shipping} Shipping
            </Button>
          </CollapsibleContent>
        </Collapsible>

        {/* Action buttons */}
        <div className="space-y-2">
          <Button onClick={onSetPrice} variant="outline" className="w-full" size="lg">
            <DollarSign className="w-4 h-4 mr-2" />
            Add More Details
          </Button>
          <Button onClick={onScanAnother} variant="outline" className="w-full">
            <ScanLine className="w-4 h-4 mr-2" />
            {copy.secondaryButton}
          </Button>
          <button
            onClick={onGoToListings}
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2 flex items-center justify-center gap-2"
          >
            <List className="w-4 h-4" />
            {copy.tertiaryButton}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
