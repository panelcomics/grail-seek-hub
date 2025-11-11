import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Image as ImageIcon, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PrefillData {
  title?: string;
  series?: string;
  issueNumber?: string;
  publisher?: string;
  year?: string | number;
  grade?: string;
  notes?: string;
  description?: string;
  comicvineId?: string | number;
  comicvineCoverUrl?: string; // Reference cover from ComicVine
}

interface ScannerListingFormProps {
  imageUrl: string; // User's captured/uploaded image (empty string if from search)
  initialData?: PrefillData;
  confidence?: number | null; // Optional confidence score for display
}

export function ScannerListingForm({ imageUrl, initialData = {}, confidence }: ScannerListingFormProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  // Form state - all editable
  const [title, setTitle] = useState(initialData.title || initialData.series || "");
  const [series, setSeries] = useState(initialData.series || "");
  const [issueNumber, setIssueNumber] = useState(initialData.issueNumber || "");
  const [publisher, setPublisher] = useState(initialData.publisher || "");
  const [year, setYear] = useState(initialData.year?.toString() || "");
  const [grade, setGrade] = useState(initialData.grade || "");
  const [condition, setCondition] = useState("NM");
  const [notes, setNotes] = useState(initialData.notes || initialData.description || "");

  const hasConfidentMatch = confidence !== null && confidence !== undefined && confidence >= 65;
  const showReferenceCover = initialData.comicvineCoverUrl && imageUrl;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Please sign in to create a listing");
      navigate("/auth");
      return;
    }

    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    setSubmitting(true);

    try {
      // Upload user's image to Supabase Storage
      const imageBlob = await fetch(imageUrl).then(r => r.blob());
      const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("comic-photos")
        .upload(fileName, imageBlob, {
          contentType: "image/jpeg",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("comic-photos")
        .getPublicUrl(fileName);

      // Create inventory item with user's image as primary
      const inventoryData: any = {
        user_id: user.id,
        title: title.trim(),
        series: series.trim() || title.trim(),
        issue_number: issueNumber.trim() || null,
        publisher: publisher.trim() || null,
        year: year ? parseInt(year) : null,
        grade: grade.trim() || null,
        condition: condition,
        details: notes.trim() || null,
        comicvine_issue_id: initialData.comicvineId ? parseInt(initialData.comicvineId.toString()) : null,
        images: {
          front: publicUrl, // User's image is the primary image
          comicvine_reference: initialData.comicvineCoverUrl || null, // Store reference separately
        },
        listing_status: "not_listed",
      };

      const { data: inventoryItem, error: inventoryError } = await supabase
        .from("inventory_items")
        .insert(inventoryData)
        .select()
        .single();

      if (inventoryError) throw inventoryError;

      toast.success("Comic added to your inventory!", {
        description: "You can now list it for sale or trade",
        action: {
          label: "View Inventory",
          onClick: () => navigate("/my-inventory"),
        },
      });

      // Navigate to the new inventory item
      navigate(`/my-inventory`);

    } catch (error: any) {
      console.error("Error creating listing:", error);
      toast.error("Failed to save comic", {
        description: error.message || "Please try again",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>
          {hasConfidentMatch ? "Review & Complete Listing" : "Create Listing Manually"}
        </CardTitle>
        <CardDescription>
          {hasConfidentMatch 
            ? `We found a match (${Math.round(confidence!)}% confidence). Review and edit the details below.`
            : "We couldn't confidently identify this comic. Fill in the details below - all fields are editable."
          }
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image Display Section */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* User's Image - Primary (if provided) */}
            {imageUrl && (
              <div className="space-y-2">
                <Label className="text-base font-semibold">Your Photo (Primary Listing Image)</Label>
                <div className="relative aspect-[2/3] bg-muted rounded-lg overflow-hidden border-4 border-primary/30 shadow-lg">
                  <img
                    src={imageUrl}
                    alt="Your comic photo"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-semibold shadow-lg">
                    <ImageIcon className="inline w-3 h-3 mr-1" />
                    Your Photo
                  </div>
                </div>
              </div>
            )}

            {/* ComicVine Reference Cover - If Available */}
            {showReferenceCover && (
              <div className="space-y-2">
                <Label className="text-base font-semibold text-muted-foreground">
                  {imageUrl ? "ComicVine Reference Cover" : "Reference Cover"}
                </Label>
                <div className="aspect-[2/3] bg-muted rounded-lg overflow-hidden border-2 border-border opacity-70">
                  <img
                    src={initialData.comicvineCoverUrl}
                    alt="ComicVine reference"
                    className="h-full w-full object-cover"
                  />
                </div>
                {imageUrl && (
                  <Alert className="mt-2">
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      This is for reference only. Your photo above will be the listing image.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>

          {/* Form Fields - All Editable */}
          <div className="space-y-4 pt-4 border-t">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Title / Series Name *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Amazing Spider-Man"
                  required
                />
              </div>

              <div>
                <Label htmlFor="issueNumber">Issue Number</Label>
                <Input
                  id="issueNumber"
                  value={issueNumber}
                  onChange={(e) => setIssueNumber(e.target.value)}
                  placeholder="e.g., 300"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="publisher">Publisher</Label>
                <Input
                  id="publisher"
                  value={publisher}
                  onChange={(e) => setPublisher(e.target.value)}
                  placeholder="e.g., Marvel Comics"
                />
              </div>

              <div>
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="e.g., 1984"
                  min="1900"
                  max={new Date().getFullYear()}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="grade">Grade (if graded)</Label>
                <Input
                  id="grade"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  placeholder="e.g., CGC 9.8, CBCS 9.6"
                />
              </div>

              <div>
                <Label htmlFor="condition">Condition</Label>
                <Select value={condition} onValueChange={setCondition}>
                  <SelectTrigger id="condition">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MT">Mint (MT)</SelectItem>
                    <SelectItem value="NM">Near Mint (NM)</SelectItem>
                    <SelectItem value="VF">Very Fine (VF)</SelectItem>
                    <SelectItem value="FN">Fine (FN)</SelectItem>
                    <SelectItem value="VG">Very Good (VG)</SelectItem>
                    <SelectItem value="GD">Good (GD)</SelectItem>
                    <SelectItem value="FR">Fair (FR)</SelectItem>
                    <SelectItem value="PR">Poor (PR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes / Description</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Key issue, first appearances, condition notes, etc."
                rows={4}
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/scanner")}
              disabled={submitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="flex-1"
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save to Inventory
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
