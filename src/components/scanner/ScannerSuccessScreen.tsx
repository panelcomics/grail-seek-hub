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
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, DollarSign, ScanLine, List, Zap, ChevronDown, ChevronUp } from "lucide-react";
import { SCANNER_COPY } from "@/types/scannerState";
import { ComicVinePick } from "@/types/comicvine";
import { PricingHelper } from "./PricingHelper";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// Condition options for raw books
const RAW_CONDITION_OPTIONS = [
  { value: "MT", label: "Mint (MT) - 10.0" },
  { value: "NM/MT", label: "Near Mint/Mint (NM/MT) - 9.8" },
  { value: "NM+", label: "Near Mint+ (NM+) - 9.6" },
  { value: "NM", label: "Near Mint (NM) - 9.4" },
  { value: "NM-", label: "Near Mint- (NM-) - 9.2" },
  { value: "VF/NM", label: "Very Fine/Near Mint (VF/NM) - 9.0" },
  { value: "VF+", label: "Very Fine+ (VF+) - 8.5" },
  { value: "VF", label: "Very Fine (VF) - 8.0" },
  { value: "VF-", label: "Very Fine- (VF-) - 7.5" },
  { value: "FN/VF", label: "Fine/Very Fine (FN/VF) - 7.0" },
  { value: "FN+", label: "Fine+ (FN+) - 6.5" },
  { value: "FN", label: "Fine (FN) - 6.0" },
  { value: "FN-", label: "Fine- (FN-) - 5.5" },
  { value: "VG+", label: "Very Good+ (VG+) - 5.0" },
  { value: "VG/FN", label: "Very Good/Fine (VG/FN) - 4.5" },
  { value: "VG", label: "Very Good (VG) - 4.0" },
  { value: "VG-", label: "Very Good- (VG-) - 3.5" },
  { value: "GD/VG", label: "Good/Very Good (GD/VG) - 3.0" },
  { value: "GD+", label: "Good+ (GD+) - 2.5" },
  { value: "GD", label: "Good (GD) - 2.0" },
  { value: "GD-", label: "Good- (GD-) - 1.8" },
  { value: "FR", label: "Fair (FR) - 1.5" },
  { value: "PR", label: "Poor (PR) - 0.5" },
];

// Slab grade options
const SLAB_GRADE_OPTIONS = [
  "10.0", "9.9", "9.8", "9.6", "9.4", "9.2", "9.0",
  "8.5", "8.0", "7.5", "7.0", "6.5", "6.0",
  "5.5", "5.0", "4.5", "4.0", "3.5", "3.0",
  "2.5", "2.0", "1.8", "1.5", "1.0", "0.5"
];

// Grading companies
const GRADING_COMPANIES = [
  { value: "CGC", label: "CGC" },
  { value: "CGC JSA", label: "CGC JSA" },
  { value: "CBCS", label: "CBCS" },
  { value: "PSA", label: "PSA" },
  { value: "PGX", label: "PGX" },
];

export interface QuickListData {
  price: string;
  shipping: string;
  condition: string | null;
  isSlab: boolean;
  gradingCompany: string | null;
  grade: string | null;
}

interface ScannerSuccessScreenProps {
  match: ComicVinePick | null;
  previewImage?: string | null;
  onSetPrice: () => void;
  onQuickList: (data: QuickListData) => void;
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
  
  // Condition/Grading state
  const [condition, setCondition] = useState<string>("");
  const [isSlab, setIsSlab] = useState(false);
  const [gradingCompany, setGradingCompany] = useState<string>("CGC");
  const [grade, setGrade] = useState<string>("");

  const handleQuickList = () => {
    if (!price || parseFloat(price) <= 0) {
      return;
    }
    onQuickList({
      price,
      shipping,
      condition: isSlab ? null : (condition || null),
      isSlab,
      gradingCompany: isSlab ? gradingCompany : null,
      grade: isSlab ? grade : null,
    });
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
            {/* Slab Toggle */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <Label htmlFor="quick-slab" className="text-sm font-medium cursor-pointer">
                Graded Slab?
              </Label>
              <Switch
                id="quick-slab"
                checked={isSlab}
                onCheckedChange={setIsSlab}
              />
            </div>

            {/* Condition/Grade Selection */}
            {isSlab ? (
              // Slab: Grading Company + Grade
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="quick-grading-company" className="text-sm">
                    Grading Company
                  </Label>
                  <Select value={gradingCompany} onValueChange={setGradingCompany}>
                    <SelectTrigger id="quick-grading-company" className="mt-1">
                      <SelectValue placeholder="Select company" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {GRADING_COMPANIES.map((company) => (
                        <SelectItem key={company.value} value={company.value}>
                          {company.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="quick-grade" className="text-sm">
                    Grade
                  </Label>
                  <Select value={grade} onValueChange={setGrade}>
                    <SelectTrigger id="quick-grade" className="mt-1">
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50 max-h-60">
                      {SLAB_GRADE_OPTIONS.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              // Raw: Condition dropdown
              <div>
                <Label htmlFor="quick-condition" className="text-sm">
                  Condition
                </Label>
                <Select value={condition} onValueChange={setCondition}>
                  <SelectTrigger id="quick-condition" className="mt-1">
                    <SelectValue placeholder="Select condition (optional)" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50 max-h-60">
                    {RAW_CONDITION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

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
            Add More Details / Photos
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
