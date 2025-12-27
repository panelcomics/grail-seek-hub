/**
 * SCANNER CONFIRM SCREEN
 * ==========================================================================
 * Quick Check Before Listing - editable fields
 * ==========================================================================
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save } from "lucide-react";
import { SCANNER_COPY } from "@/types/scannerState";
import { ComicVinePick } from "@/types/comicvine";

interface ConfirmData {
  title: string;
  issueNumber: string;
  year: string;
  variant: string;
  publisher: string;
}

interface ScannerConfirmScreenProps {
  match: ComicVinePick | null;
  previewImage?: string | null;
  onSave: (data: ConfirmData) => void;
  onBack: () => void;
}

export function ScannerConfirmScreen({
  match,
  previewImage,
  onSave,
  onBack,
}: ScannerConfirmScreenProps) {
  const copy = SCANNER_COPY.confirm;

  const [formData, setFormData] = useState<ConfirmData>({
    title: "",
    issueNumber: "",
    year: "",
    variant: "",
    publisher: "",
  });

  // Initialize form from match data
  useEffect(() => {
    if (match) {
      setFormData({
        title: match.volumeName || match.title || "",
        issueNumber: match.issue || "",
        year: match.year?.toString() || "",
        variant: match.variantDescription || "",
        publisher: match.publisher || "",
      });
    }
  }, [match]);

  const handleChange = (field: keyof ConfirmData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    onSave(formData);
  };

  return (
    <Card>
      <CardHeader className="text-center pb-3">
        <CardTitle className="text-xl">{copy.header}</CardTitle>
        <CardDescription>{copy.subtext}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Preview Image */}
        {(previewImage || match?.coverUrl) && (
          <div className="flex justify-center mb-4">
            <div className="w-20 h-28 rounded-md overflow-hidden bg-muted border">
              <img
                src={previewImage || match?.coverUrl || ""}
                alt="Comic cover"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        {/* Editable Fields */}
        <div className="space-y-3">
          <div>
            <Label htmlFor="title" className="text-sm">
              Series Title
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
              placeholder="e.g., Amazing Spider-Man"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="issueNumber" className="text-sm">
                Issue #
              </Label>
              <Input
                id="issueNumber"
                value={formData.issueNumber}
                onChange={(e) => handleChange("issueNumber", e.target.value)}
                placeholder="e.g., 300"
              />
            </div>
            <div>
              <Label htmlFor="year" className="text-sm">
                Year
              </Label>
              <Input
                id="year"
                value={formData.year}
                onChange={(e) => handleChange("year", e.target.value)}
                placeholder="e.g., 1988"
                type="number"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="variant" className="text-sm">
              Variant (if any)
            </Label>
            <Input
              id="variant"
              value={formData.variant}
              onChange={(e) => handleChange("variant", e.target.value)}
              placeholder="e.g., Newsstand Edition"
            />
          </div>

          <div>
            <Label htmlFor="publisher" className="text-sm">
              Publisher
            </Label>
            <Input
              id="publisher"
              value={formData.publisher}
              onChange={(e) => handleChange("publisher", e.target.value)}
              placeholder="e.g., Marvel Comics"
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-2 pt-2">
          <Button onClick={handleSubmit} className="w-full" size="lg">
            <Save className="w-4 h-4 mr-2" />
            {copy.primaryButton}
          </Button>
          <Button onClick={onBack} variant="outline" className="w-full">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {copy.secondaryButton}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
