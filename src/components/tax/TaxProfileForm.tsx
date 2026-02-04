/**
 * Tax Profile Form
 * DATA COLLECTION ONLY - Collects legal name, SSN/EIN, address
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { User, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { TaxProfile } from "@/hooks/useSellerTaxData";

interface TaxProfileFormProps {
  profile: TaxProfile;
  onSave: (profile: Partial<TaxProfile>) => Promise<{ success: boolean; error?: string }>;
  saving: boolean;
  loading?: boolean;
}

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC"
];

export function TaxProfileForm({ profile, onSave, saving, loading }: TaxProfileFormProps) {
  const [formData, setFormData] = useState<TaxProfile>(profile);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setFormData(profile);
  }, [profile]);

  const handleChange = (field: keyof TaxProfile, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await onSave(formData);
    if (result.success) {
      toast.success("Tax information saved successfully");
      setIsDirty(false);
    } else {
      toast.error(result.error || "Failed to save tax information");
    }
  };

  // Mask SSN/EIN for display (show last 4 only)
  const maskTaxId = (value: string) => {
    if (!value || value.length < 4) return value;
    return "•".repeat(value.length - 4) + value.slice(-4);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Tax Profile
        </CardTitle>
        <CardDescription>
          This information is used to prepare for potential future tax reporting requirements.
          GrailSeeker does not file tax forms on your behalf at this time.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-950/30">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            <strong>Information Collection Only</strong> — This data is stored securely and will not be submitted to any tax authorities automatically.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="legalName">Legal Name *</Label>
              <Input
                id="legalName"
                value={formData.legalName}
                onChange={(e) => handleChange("legalName", e.target.value)}
                placeholder="As shown on tax return"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name (optional)</Label>
              <Input
                id="businessName"
                value={formData.businessName}
                onChange={(e) => handleChange("businessName", e.target.value)}
                placeholder="If different from legal name"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="taxClassification">Tax Classification</Label>
              <Select
                value={formData.taxClassification}
                onValueChange={(value) => handleChange("taxClassification", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select classification" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual / Sole Proprietor</SelectItem>
                  <SelectItem value="business">Business Entity</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxId">SSN or EIN</Label>
              <Input
                id="taxId"
                type="password"
                value={formData.taxId}
                onChange={(e) => handleChange("taxId", e.target.value)}
                placeholder="XXX-XX-XXXX or XX-XXXXXXX"
                autoComplete="off"
              />
              {profile.taxId && (
                <p className="text-xs text-muted-foreground">
                  Saved: {maskTaxId(profile.taxId)}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="addressLine1">Street Address</Label>
            <Input
              id="addressLine1"
              value={formData.addressLine1}
              onChange={(e) => handleChange("addressLine1", e.target.value)}
              placeholder="Street address"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="addressLine2">Address Line 2</Label>
            <Input
              id="addressLine2"
              value={formData.addressLine2}
              onChange={(e) => handleChange("addressLine2", e.target.value)}
              placeholder="Apt, suite, unit, etc. (optional)"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2 col-span-2 md:col-span-1">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleChange("city", e.target.value)}
                placeholder="City"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Select
                value={formData.state}
                onValueChange={(value) => handleChange("state", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="State" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="zipCode">ZIP Code</Label>
              <Input
                id="zipCode"
                value={formData.zipCode}
                onChange={(e) => handleChange("zipCode", e.target.value)}
                placeholder="12345"
                maxLength={10}
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={saving || !isDirty}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Tax Information
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
