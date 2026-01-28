import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { debugLog } from "@/lib/debug";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Image as ImageIcon, Info, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ComicVinePicker } from "./ComicVinePicker";
import { PricingHelper } from "./scanner/PricingHelper";
import { GRADE_OPTIONS } from "@/types/draftItem";
import { AIConditionAssistant } from "./elite/AIConditionAssistant";
import { AdvancedVariantDetector } from "./elite/AdvancedVariantDetector";

// Restoration markers (CGC Purple Label criteria)
const RESTORATION_OPTIONS = [
  { value: "color_touch", label: "Color Touch", description: "Color added to cover or interior" },
  { value: "trimmed", label: "Trimmed", description: "Edges cut to improve appearance" },
  { value: "tape", label: "Tape", description: "Tape used for repairs" },
  { value: "tear_sealed", label: "Tear Sealed", description: "Tears sealed with glue or material" },
  { value: "piece_added", label: "Piece Added", description: "Missing piece replaced" },
  { value: "staple_replaced", label: "Staple Replaced", description: "Original staples replaced" },
  { value: "cleaned", label: "Cleaned / Pressed", description: "Professionally cleaned or pressed" },
  { value: "spine_roll_fix", label: "Spine Roll Fixed", description: "Spine roll corrected" },
];

// Common defects that buyers should know about
const DEFECT_OPTIONS = [
  { value: "cover_detached", label: "Cover Detached", description: "Cover is separated from staples" },
  { value: "cover_loose", label: "Cover Loose", description: "Cover detached but stable" },
  { value: "staple_detached", label: "Detached Staple", description: "One or more staples missing/loose" },
  { value: "tape_on_spine", label: "Tape on Spine", description: "Tape visible on spine" },
  { value: "tape_on_cover", label: "Tape on Cover", description: "Tape visible on cover" },
  { value: "ink_on_cover", label: "Ink on Cover", description: "Ink marks or writing on front cover" },
  { value: "ink_on_back_cover", label: "Ink on Back Cover", description: "Ink marks or writing on back cover" },
  { value: "ink_on_pages", label: "Ink on Pages", description: "Ink marks or writing on interior pages" },
  { value: "moisture_stain", label: "Moisture Stain", description: "Water damage or staining" },
  { value: "spine_split", label: "Spine Split", description: "Split along spine" },
  { value: "spine_roll", label: "Spine Roll", description: "Spine has rolled or curved" },
  { value: "cover_tics", label: "Cover Tics", description: "Small creases/tics on cover" },
  { value: "torn_pages", label: "Torn Pages", description: "Interior page tears" },
  { value: "missing_pages", label: "Missing Pages", description: "Pages missing from interior" },
  { value: "rusty_staples", label: "Rusty Staples", description: "Staples showing rust/migration" },
  { value: "foxing", label: "Foxing/Age Spots", description: "Brown spots from age/humidity" },
];

// Helper to build defect notes string for database storage
function buildDefectNotes(selectedDefects: string[], additionalNotes: string): string | null {
  const defectLabels = selectedDefects.map(value => {
    const option = DEFECT_OPTIONS.find(o => o.value === value);
    return option ? option.label : value;
  });
  
  const parts: string[] = [];
  if (defectLabels.length > 0) {
    parts.push(`Defects: ${defectLabels.join(', ')}`);
  }
  if (additionalNotes.trim()) {
    parts.push(additionalNotes.trim());
  }
  
  return parts.length > 0 ? parts.join('\n') : null;
}

// Helper to parse defect notes back into components
function parseDefectNotes(defectNotes: string | null): { selectedDefects: string[]; additionalNotes: string } {
  if (!defectNotes) return { selectedDefects: [], additionalNotes: '' };
  
  const lines = defectNotes.split('\n');
  const selectedDefects: string[] = [];
  const otherNotes: string[] = [];
  
  for (const line of lines) {
    if (line.startsWith('Defects: ')) {
      const defectLabels = line.replace('Defects: ', '').split(', ');
      for (const label of defectLabels) {
        const option = DEFECT_OPTIONS.find(o => o.label === label);
        if (option) selectedDefects.push(option.value);
      }
    } else {
      otherNotes.push(line);
    }
  }
  
  return { selectedDefects, additionalNotes: otherNotes.join('\n') };
}

// Full condition options with plus/minus grades
const CONDITION_OPTIONS = [
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
  { value: "FR/GD", label: "Fair/Good (FR/GD) - 1.0" },
  { value: "PR", label: "Poor (PR) - 0.5" },
];

interface ComicVinePick {
  id: number;
  resource: 'issue' | 'volume';
  title: string;
  issue: string | null;
  year: number | null;
  publisher?: string | null;
  volumeName?: string | null;
  volumeId?: number | null;
  variantDescription?: string | null;
  thumbUrl: string;
  coverUrl: string;
  writer?: string | null;
  artist?: string | null;
  coverArtist?: string | null;
  score: number;
  isReprint: boolean;
  description?: string;
  deck?: string;
  characters?: string;
  keyNotes?: string;
}

interface PrefillData {
  picks?: ComicVinePick[];
}

interface ScannerListingFormProps {
  imageUrl: string; // User's captured/uploaded image
  initialData?: PrefillData;
  confidence?: number | null;
  comicvineResults?: ComicVinePick[];
  selectedPick?: ComicVinePick | null;
}

/**
 * Extract key issue notes from text
 */
function extractKeyNotes(text: string): string | null {
  const keyPatterns = [
    /1st\s+(?:appearance|app\.?)\s+(?:of\s+)?([^.,;]+)/gi,
    /first\s+appearance\s+(?:of\s+)?([^.,;]+)/gi,
    /origin\s+(?:of\s+)?([^.,;]+)/gi,
    /debut\s+(?:of\s+)?([^.,;]+)/gi,
    /introduces?\s+([^.,;]+)/gi,
  ];

  const keyNotes: string[] = [];
  for (const pattern of keyPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match[1]) {
        const note = match[1].trim().replace(/<[^>]+>/g, '').substring(0, 80);
        if (note && !keyNotes.some(n => n.toLowerCase() === note.toLowerCase())) {
          keyNotes.push(note);
        }
      }
    }
  }

  return keyNotes.length > 0 ? keyNotes.join('; ') : null;
}

export function ScannerListingForm({ 
  imageUrl, 
  initialData = {}, 
  confidence, 
  comicvineResults, 
  selectedPick 
}: ScannerListingFormProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [pricingData, setPricingData] = useState<any>(null);

  // Form state - DraftItem model
  const [title, setTitle] = useState("");
  const [series, setSeries] = useState("");
  const [issueNumber, setIssueNumber] = useState("");
  const [publisher, setPublisher] = useState("");
  const [year, setYear] = useState("");
  const [writer, setWriter] = useState("");
  const [artist, setArtist] = useState("");
  const [coverArtist, setCoverArtist] = useState("");
  const [condition, setCondition] = useState(""); // No default - encourage manual grading
  const [isSlab, setIsSlab] = useState(false);
  const [gradingCompany, setGradingCompany] = useState("CGC");
  const [grade, setGrade] = useState("");
  const [certificationNumber, setCertificationNumber] = useState("");
  const [isKey, setIsKey] = useState(false);
  const [keyDetails, setKeyDetails] = useState("");
  const [keyType, setKeyType] = useState("");
  const [variantType, setVariantType] = useState("");
  const [variantDetails, setVariantDetails] = useState("");
  const [variantNotes, setVariantNotes] = useState("");
  const [notes, setNotes] = useState("");
  const [price, setPrice] = useState("");
  const [shippingPrice, setShippingPrice] = useState("5.00");
  const [selectedCover, setSelectedCover] = useState<string | null>(null);
  const [comicvineId, setComicvineId] = useState<number | null>(null);
  const [volumeId, setVolumeId] = useState<number | null>(null);
  
  // Restoration markers (CGC purple label style)
  const [restorationMarkers, setRestorationMarkers] = useState<string[]>([]);
  
  // Defect notes for buyer awareness
  const [selectedDefects, setSelectedDefects] = useState<string[]>([]);
  const [defectNotes, setDefectNotes] = useState("");

  // Auto-fill from selected ComicVine pick
  useEffect(() => {
    if (selectedPick) {
      const seriesName = selectedPick.volumeName || selectedPick.title;
      setTitle(seriesName);
      setSeries(seriesName);
      setIssueNumber(selectedPick.issue || "");
      setPublisher(selectedPick.publisher || "");
      setYear(selectedPick.year?.toString() || "");
      setSelectedCover(selectedPick.coverUrl);
      setComicvineId(selectedPick.id);
      setVolumeId(selectedPick.volumeId || null);
      
      // Set ALL creator credits
      setWriter(selectedPick.writer || "");
      setArtist(selectedPick.artist || "");
      setCoverArtist(selectedPick.coverArtist || "");
      
      // PRIORITY 1: Use pre-extracted keyNotes from ComicVine API (already cleaned)
      // PRIORITY 2: Fall back to local regex extraction from description/deck
      let keyNotesValue = selectedPick.keyNotes?.trim() || null;
      
      if (!keyNotesValue) {
        // Only run local extraction if edge function didn't provide keyNotes
        const fullText = [
          selectedPick.deck || '',
          selectedPick.description || '',
          selectedPick.characters || ''
        ].join(' ');
        keyNotesValue = extractKeyNotes(fullText);
      }
      
      if (keyNotesValue) {
        console.log('[KEY-NOTES] Auto-populated key details:', keyNotesValue);
        setKeyDetails(keyNotesValue);
        setIsKey(true);
        setKeyType("Key issue");
      }

      // Fetch pricing
      (async () => {
        try {
          setLoadingPricing(true);
          const { data: pricingResult, error: pricingError } = await supabase.functions.invoke('pricing-pipeline', {
            body: {
              title: selectedPick.title,
              issue: selectedPick.issue,
              year: selectedPick.year,
              publisher: selectedPick.publisher,
              grade: grade || null,
              comicvineId: selectedPick.id
            }
          });

          if (!pricingError && pricingResult?.ok) {
            setPricingData(pricingResult.pricing);
            if (pricingResult.pricing?.median) {
              toast.info("Pricing data loaded", {
                description: `Market value: $${pricingResult.pricing.median}`
              });
            }
          }
        } catch (e) {
          console.warn('[Scanner] Pricing fetch failed:', e);
        } finally {
          setLoadingPricing(false);
        }
      })();
    }
  }, [selectedPick]);

  const hasPicks = Boolean(comicvineResults?.length) && !selectedPick;
  const showReferenceCover = selectedCover && imageUrl;

  const handleComicVineSelect = async (pick: ComicVinePick) => {
    const seriesName = pick.volumeName || pick.title;
    setTitle(seriesName);
    setSeries(seriesName);
    setIssueNumber(pick.issue || "");
    setPublisher(pick.publisher || "");
    setYear(pick.year?.toString() || "");
    setSelectedCover(pick.coverUrl);
    setComicvineId(pick.id);
    setVolumeId(pick.volumeId || null);
    
    // Set ALL creator credits
    setWriter(pick.writer || "");
    setArtist(pick.artist || "");
    setCoverArtist(pick.coverArtist || "");
    
    // Extract key notes
    const fullText = [
      pick.deck || '',
      pick.description || '',
      pick.characters || '',
      pick.keyNotes || ''
    ].join(' ');
    
    const extracted = extractKeyNotes(fullText);
    if (extracted) {
      setKeyDetails(extracted);
      setIsKey(true);
      setKeyType("Key issue");
    }
    
    setShowPicker(false);
    toast.success("Match applied");

    // Fetch pricing
    (async () => {
      try {
        setLoadingPricing(true);
        const { data: pricingResult } = await supabase.functions.invoke('pricing-pipeline', {
          body: {
            title: pick.title,
            issue: pick.issue,
            year: pick.year,
            publisher: pick.publisher,
            grade: grade || null,
            comicvineId: pick.id
          }
        });

        if (pricingResult?.ok) {
          setPricingData(pricingResult.pricing);
        }
      } catch (e) {
        console.warn('[Scanner] Pricing failed:', e);
      } finally {
        setLoadingPricing(false);
      }
    })();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Please sign in");
      navigate("/auth");
      return;
    }

    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    // CRITICAL VALIDATION: Prevent saving without image URL
    if (!imageUrl || imageUrl.trim() === '') {
      console.error('[SCANNER-FORM] ❌ BLOCKED SAVE: No image URL provided', { imageUrl });
      toast.error("Image upload in progress - please wait");
      return;
    }

    debugLog('[SCANNER-FORM] 📸 Starting inventory save with image URL:', {
      imageUrl,
      urlLength: imageUrl.length,
      isValidUrl: imageUrl.startsWith('http')
    });

    setSubmitting(true);

    try {
      // Create inventory item using DraftItem structure
      const inventoryData: any = {
        user_id: user.id,
        
        // Core metadata
        title: title.trim(),
        series: series.trim() || title.trim(),
        issue_number: issueNumber.trim() || null,
        publisher: publisher.trim() || null,
        year: year ? parseInt(year) : null,
        
        // ComicVine IDs
        volume_id: volumeId ? volumeId.toString() : null,
        issue_id: comicvineId ? comicvineId.toString() : null,
        comicvine_volume_id: volumeId ? volumeId.toString() : null,
        comicvine_issue_id: comicvineId ? comicvineId.toString() : null,
        
        // Creator credits
        writer: writer.trim() || null,
        artist: artist.trim() || null,
        cover_artist: coverArtist.trim() || null,
        
        // Condition
        condition: condition || null,
        
        // Grading
        is_slab: isSlab,
        grading_company: isSlab ? gradingCompany : null,
        grade: isSlab ? grade : null,
        cgc_grade: isSlab ? grade : null,
        certification_number: isSlab ? certificationNumber.trim() : null,
        
        // Key issue
        key_issue: isKey,
        is_key: isKey,
        key_details: keyDetails.trim() || null,
        key_type: isKey ? (keyType || "Key issue") : null,
        
        // Images - ALWAYS { primary, others } format
        // CRITICAL: Only user-uploaded photos in images structure
        // ComicVine cover should NOT appear as a user photo
        images: {
          primary: imageUrl || null,
          others: [] // Never include ComicVine reference cover
        },
        
        // Variant
        variant_type: variantType || null,
        variant_details: variantDetails.trim() || null,
        variant_notes: variantNotes.trim() || null,
        
        // Pricing
        listed_price: price ? parseFloat(price) : null,
        shipping_price: shippingPrice ? parseFloat(shippingPrice) : null,
        
        // Status
        listing_status: "not_listed",
        for_sale: false,
        is_for_trade: false,
        
        // Notes
        details: notes.trim() || null,
        private_notes: null,
        private_location: null,
        
        // Restoration markers
        restoration_markers: restorationMarkers.length > 0 ? restorationMarkers : [],
        
        // Defects - build comprehensive defect_notes string
        defect_notes: buildDefectNotes(selectedDefects, defectNotes),
        
        // Scanner metadata
        scanner_confidence: confidence || null,
        scanner_last_scanned_at: new Date().toISOString(),
      };

      // Add pricing data if available
      if (pricingData) {
        inventoryData.pricing_source = 'ebay';
        inventoryData.pricing_low = pricingData.floor || null;
        inventoryData.pricing_mid = pricingData.median || null;
        inventoryData.pricing_high = pricingData.high || null;
        inventoryData.pricing_currency = pricingData.currency || 'USD';
        inventoryData.pricing_last_refreshed_at = new Date().toISOString();
      }

      const { data: inventoryItem, error: inventoryError } = await supabase
        .from("inventory_items")
        .insert(inventoryData)
        .select()
        .single();

      if (inventoryError) {
        console.error('[SCANNER-FORM] ❌ Inventory insert failed:', inventoryError);
        throw inventoryError;
      }

      debugLog('[SCANNER-FORM] ✅ Inventory saved successfully', {
        id: inventoryItem.id,
        title: inventoryItem.title,
        imagesPrimary: (inventoryItem.images as any)?.primary,
        imagesOthers: (inventoryItem.images as any)?.others,
        hasImage: !!(inventoryItem.images as any)?.primary
      });

      toast.success("Comic added to your inventory!");

      // Navigate to inventory edit page
      setTimeout(() => {
        navigate(`/inventory/${inventoryItem.id}`);
      }, 1000);

    } catch (error: any) {
      console.error("Error saving comic:", error);
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
        <CardTitle>Create Listing</CardTitle>
        <CardDescription>
          {hasPicks 
            ? "Select a match or enter details manually."
            : "Fill in the details below."
          }
        </CardDescription>
        
        {!hasPicks && !selectedPick && confidence === null && (
          <Alert className="mt-2">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              ComicVine unavailable. You can still create your listing manually.
            </AlertDescription>
          </Alert>
        )}
      </CardHeader>

      <CardContent>
        {/* ComicVine Picker */}
        {hasPicks && (
          <div className="mb-6">
            <ComicVinePicker
              picks={comicvineResults || []}
              onSelect={handleComicVineSelect}
            />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Images Section */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* User's Photo (Primary) */}
            {imageUrl && (
              <div className="space-y-2">
                <Label className="text-base font-semibold">Your Photo (Primary)</Label>
                <div className="relative w-full max-w-xs mx-auto bg-muted rounded-lg overflow-hidden border-4 border-primary/30 shadow-lg">
                  <div className="aspect-[2/3] relative max-h-[320px]">
                    <img
                      src={imageUrl}
                      alt="Your comic photo"
                      className="absolute inset-0 w-full h-full object-contain p-2"
                    />
                  </div>
                  <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-semibold shadow-lg">
                    <ImageIcon className="inline w-3 h-3 mr-1" />
                    Your Photo
                  </div>
                </div>
              </div>
            )}

            {/* ComicVine Reference */}
            {showReferenceCover && (
              <div className="space-y-2">
                <Label className="text-base font-semibold text-muted-foreground">
                  ComicVine Reference
                </Label>
                <div className="w-full max-w-xs mx-auto bg-muted rounded-lg overflow-hidden border-2 border-border opacity-70">
                  <div className="aspect-[2/3] relative max-h-[320px]">
                    <img
                      src={selectedCover}
                      alt="ComicVine reference"
                      className="absolute inset-0 w-full h-full object-contain p-2"
                    />
                  </div>
                </div>
                {imageUrl && (
                  <Alert className="mt-2">
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Reference only. Your photo is the listing image.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="space-y-2 pt-4 border-t">
            <Label className="text-base font-semibold">Preview</Label>
            <div className="text-sm">
              {title && <span className="font-bold">{title}</span>}
              {issueNumber && <span className="font-bold"> #{issueNumber}</span>}
              {publisher && <span className="text-muted-foreground"> • {publisher}</span>}
              {year && <span className="text-muted-foreground"> ({year})</span>}
            </div>
          </div>

          {/* Core Fields */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="title">Title / Series Name *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Amazing Spider-Man"
                required
              />
            </div>

            <div>
              <Label htmlFor="issueNumber">Issue #</Label>
              <Input
                id="issueNumber"
                value={issueNumber}
                onChange={(e) => setIssueNumber(e.target.value)}
                placeholder="300"
              />
            </div>

            <div>
              <Label htmlFor="publisher">Publisher</Label>
              <Input
                id="publisher"
                value={publisher}
                onChange={(e) => setPublisher(e.target.value)}
                placeholder="Marvel Comics"
              />
            </div>

            <div>
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="1984"
                min="1900"
                max={new Date().getFullYear()}
              />
            </div>

            <div>
              <Label htmlFor="condition">Condition</Label>
              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger id="condition">
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <ScrollArea className="h-[280px]">
                    {CONDITION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="py-3">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Restoration / Defects Section */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <Label className="text-sm font-medium">Restoration / Defects (if any)</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Check any that apply — affects grading and value (CGC Purple Label criteria)
            </p>
            <div className="grid grid-cols-2 gap-3">
              {RESTORATION_OPTIONS.map((option) => (
                <div
                  key={option.value}
                  className={`flex items-start space-x-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                    restorationMarkers.includes(option.value)
                      ? 'border-amber-500 bg-amber-500/10'
                      : 'border-border hover:border-muted-foreground/30'
                  }`}
                  onClick={() => {
                    setRestorationMarkers(prev =>
                      prev.includes(option.value)
                        ? prev.filter(v => v !== option.value)
                        : [...prev, option.value]
                    );
                  }}
                >
                  <Checkbox
                    id={option.value}
                    checked={restorationMarkers.includes(option.value)}
                    onCheckedChange={(checked) => {
                      setRestorationMarkers(prev =>
                        checked
                          ? [...prev, option.value]
                          : prev.filter(v => v !== option.value)
                      );
                    }}
                    className="mt-0.5"
                  />
                  <div className="grid gap-0.5 leading-none">
                    <label
                      htmlFor={option.value}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {option.label}
                    </label>
                    <p className="text-xs text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {restorationMarkers.length > 0 && (
              <Alert className="border-amber-500/50 bg-amber-500/10">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <AlertDescription className="text-xs">
                  This book has restoration markers and may receive a qualified/restored grade label.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Defects Section - Important for buyers */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <Label className="text-sm font-medium">Known Defects (if any)</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Select any visible defects — these will be prominently displayed to buyers
            </p>
            <div className="grid grid-cols-2 gap-3">
              {DEFECT_OPTIONS.map((option) => (
                <div
                  key={option.value}
                  className={`flex items-start space-x-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                    selectedDefects.includes(option.value)
                      ? 'border-destructive bg-destructive/10'
                      : 'border-border hover:border-muted-foreground/30'
                  }`}
                  onClick={() => {
                    setSelectedDefects(prev =>
                      prev.includes(option.value)
                        ? prev.filter(v => v !== option.value)
                        : [...prev, option.value]
                    );
                  }}
                >
                  <Checkbox
                    id={`defect-${option.value}`}
                    checked={selectedDefects.includes(option.value)}
                    onCheckedChange={(checked) => {
                      setSelectedDefects(prev =>
                        checked
                          ? [...prev, option.value]
                          : prev.filter(v => v !== option.value)
                      );
                    }}
                    className="mt-0.5"
                  />
                  <div className="grid gap-0.5 leading-none">
                    <label
                      htmlFor={`defect-${option.value}`}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {option.label}
                    </label>
                    <p className="text-xs text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Additional defect notes */}
            <div className="pt-2">
              <Label htmlFor="defectNotes" className="text-sm">Additional Defect Details</Label>
              <Textarea
                id="defectNotes"
                value={defectNotes}
                onChange={(e) => setDefectNotes(e.target.value)}
                placeholder="Describe any additional defects not listed above..."
                rows={2}
                className="mt-1"
              />
            </div>
            
            {selectedDefects.length > 0 && (
              <Alert variant="destructive" className="border-destructive/50">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  ⚠️ Defects will be prominently displayed on your listing to protect buyers.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Creator Credits */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-sm font-medium text-muted-foreground">Credits (Optional)</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="writer">Writer</Label>
                <Input
                  id="writer"
                  value={writer}
                  onChange={(e) => setWriter(e.target.value)}
                  placeholder="Stan Lee"
                />
              </div>
              <div>
                <Label htmlFor="artist">Artist</Label>
                <Input
                  id="artist"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder="Jack Kirby"
                />
              </div>
              <div>
                <Label htmlFor="coverArtist">Cover Artist</Label>
                <Input
                  id="coverArtist"
                  value={coverArtist}
                  onChange={(e) => setCoverArtist(e.target.value)}
                  placeholder="Alex Ross"
                />
              </div>
            </div>
          </div>

          {/* Graded Slab Section */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between py-3 px-4 rounded-lg border-2 transition-all"
              style={{
                borderColor: isSlab ? 'hsl(var(--destructive))' : 'hsl(var(--border))',
                backgroundColor: isSlab ? 'hsl(var(--destructive) / 0.15)' : 'hsl(var(--muted) / 0.3)',
                fontWeight: isSlab ? '700' : '500'
              }}>
              <div className="flex-1">
                <Label htmlFor="isSlab" className="text-base font-bold cursor-pointer" style={{ color: isSlab ? 'hsl(var(--destructive))' : 'inherit' }}>
                  Professionally Graded / Graded Slab
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  This comic is professionally graded by CGC, CBCS, or PGX
                </p>
              </div>
              <Switch
                id="isSlab"
                checked={isSlab}
                onCheckedChange={setIsSlab}
                className="data-[state=checked]:bg-destructive"
              />
            </div>
            
            {isSlab && (
              <div className="grid md:grid-cols-3 gap-4 pl-6">
                <div>
                  <Label htmlFor="gradingCompany">Company</Label>
                  <Select value={gradingCompany} onValueChange={setGradingCompany}>
                    <SelectTrigger id="gradingCompany">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="CGC">CGC</SelectItem>
                      <SelectItem value="CGC JSA">CGC JSA</SelectItem>
                      <SelectItem value="CBCS">CBCS</SelectItem>
                      <SelectItem value="PSA">PSA</SelectItem>
                      <SelectItem value="PGX">PGX</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="grade">Grade</Label>
                  <Select value={grade} onValueChange={setGrade}>
                    <SelectTrigger id="grade">
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {GRADE_OPTIONS.map((g) => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="certificationNumber">Cert #</Label>
                  <Input
                    id="certificationNumber"
                    value={certificationNumber}
                    onChange={(e) => setCertificationNumber(e.target.value)}
                    placeholder="1234567890"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Key Issue Section */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between py-3 px-4 rounded-lg border-2 transition-all"
              style={{
                borderColor: isKey ? 'hsl(var(--destructive))' : 'hsl(var(--border))',
                backgroundColor: isKey ? 'hsl(var(--destructive) / 0.15)' : 'hsl(var(--muted) / 0.3)',
                fontWeight: isKey ? '700' : '500'
              }}>
              <div className="flex-1">
                <Label htmlFor="key-issue" className="text-base font-bold cursor-pointer" style={{ color: isKey ? 'hsl(var(--destructive))' : 'inherit' }}>
                  Key Issue
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  First appearance, origin story, death, or other significant event
                </p>
              </div>
              <Switch
                id="key-issue"
                checked={isKey}
                onCheckedChange={setIsKey}
                className="data-[state=checked]:bg-destructive"
              />
            </div>

            {isKey && (
              <div className="space-y-4 pl-6">
                <div>
                  <Label htmlFor="keyType">Key Type</Label>
                  <Select value={keyType} onValueChange={setKeyType}>
                    <SelectTrigger id="keyType">
                      <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="First Appearance">First Appearance</SelectItem>
                      <SelectItem value="Cameo Appearance">Cameo Appearance</SelectItem>
                      <SelectItem value="Origin Story">Origin Story</SelectItem>
                      <SelectItem value="Death">Death of Character</SelectItem>
                      <SelectItem value="First Cover">First Cover Appearance</SelectItem>
                      <SelectItem value="First Team">First Team Appearance</SelectItem>
                      <SelectItem value="First Solo">First Solo Title</SelectItem>
                      <SelectItem value="Major Key">Major Key</SelectItem>
                      <SelectItem value="Minor Key">Minor Key</SelectItem>
                      <SelectItem value="Low Print Run">Low Print Run</SelectItem>
                      <SelectItem value="Newsstand">Newsstand Edition</SelectItem>
                      <SelectItem value="Wedding">Wedding Issue</SelectItem>
                      <SelectItem value="Crossover">Major Crossover</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="keyDetails">Key Details</Label>
                  <Textarea
                    id="keyDetails"
                    value={keyDetails}
                    onChange={(e) => setKeyDetails(e.target.value)}
                    placeholder="1st appearance of Krang, Bebop, Rocksteady"
                    rows={2}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Variant Section */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-sm font-medium text-muted-foreground">Variant Details (Optional)</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="variantType">Variant Type</Label>
                <Select value={variantType} onValueChange={setVariantType}>
                  <SelectTrigger id="variantType">
                    <SelectValue placeholder="Select variant type (optional)" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="variant_cover">Variant Cover</SelectItem>
                    <SelectItem value="newsstand">Newsstand</SelectItem>
                    <SelectItem value="direct">Direct</SelectItem>
                    <SelectItem value="price_variant">Price Variant</SelectItem>
                    <SelectItem value="uk_price_variant">U.K. Price Variant</SelectItem>
                    <SelectItem value="2nd_print">2nd Print</SelectItem>
                    <SelectItem value="3rd_print">3rd Print</SelectItem>
                    <SelectItem value="incentive">Incentive</SelectItem>
                    <SelectItem value="con_exclusive">Convention Exclusive</SelectItem>
                    <SelectItem value="store_exclusive">Store Exclusive</SelectItem>
                    <SelectItem value="limited">Limited Edition</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="variantDetails">Variant Details</Label>
                <Input
                  id="variantDetails"
                  value={variantDetails}
                  onChange={(e) => setVariantDetails(e.target.value)}
                  placeholder="Cover B, 1:25 ratio"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="variantNotes">Variant Notes</Label>
              <Textarea
                id="variantNotes"
                value={variantNotes}
                onChange={(e) => setVariantNotes(e.target.value)}
                placeholder="Additional variant information"
                rows={2}
              />
            </div>
          </div>

          {/* AI Condition Assistant (Elite Feature) */}
          {imageUrl && (
            <div className="pt-4 border-t">
              <AIConditionAssistant
                imageUrl={imageUrl}
                onAssessmentComplete={(assessment) => {
                  if (assessment.conditionNotes) {
                    setNotes(prev => prev ? `${prev}\n\n${assessment.conditionNotes}` : assessment.conditionNotes);
                  }
                }}
              />
            </div>
          )}

          {/* Advanced Variant Detector (Elite Feature) */}
          {imageUrl && (
            <div className="pt-4 border-t">
              <AdvancedVariantDetector
                imageUrl={imageUrl}
                title={title}
                issueNumber={issueNumber}
                onAnalysisComplete={(analysis) => {
                  if (analysis.variantName && !variantDetails) {
                    setVariantDetails(analysis.variantName);
                  }
                  if (analysis.printNumber && !variantType) {
                    setVariantType(analysis.printNumber === '1' ? 'direct' : `${analysis.printNumber}nd_print`);
                  }
                }}
              />
            </div>
          )}

          {/* Notes */}
          <div className="pt-4 border-t">
            <Label htmlFor="notes">Notes / Description</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Condition notes, defects, etc."
              rows={4}
            />
          </div>

          {/* Pricing Section */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-base font-semibold">Pricing (Optional)</h3>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">Sale Price ($)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <Label htmlFor="shippingPrice">Shipping ($)</Label>
                <Input
                  id="shippingPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={shippingPrice}
                  onChange={(e) => setShippingPrice(e.target.value)}
                  placeholder="5.00"
                />
              </div>
            </div>
            
            {title && (
              <PricingHelper
                title={title}
                issueNumber={issueNumber}
                grade={grade}
                onPriceSelect={(selectedPrice) => setPrice(selectedPrice.toFixed(2))}
              />
            )}
          </div>

          {/* Footer Buttons - Only Cancel + Save */}
          <div className="flex gap-3 pt-6 border-t">
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
