import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Image as ImageIcon, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ComicVinePicker } from "./ComicVinePicker";
import { PricingHelper } from "./scanner/PricingHelper";
import { GRADE_OPTIONS } from "@/types/draftItem";

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
  const [condition, setCondition] = useState("NM");
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
      
      // Extract key notes from all available text
      const fullText = [
        selectedPick.deck || '',
        selectedPick.description || '',
        selectedPick.characters || '',
        selectedPick.keyNotes || ''
      ].join(' ');
      
      const extracted = extractKeyNotes(fullText);
      if (extracted) {
        setKeyDetails(extracted);
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
        images: {
          primary: imageUrl || null,
          others: selectedCover ? [selectedCover] : []
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

      if (inventoryError) throw inventoryError;

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
                      <SelectItem value="CBCS">CBCS</SelectItem>
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
                borderColor: draft.keyIssue ? 'hsl(var(--destructive))' : 'hsl(var(--border))',
                backgroundColor: draft.keyIssue ? 'hsl(var(--destructive) / 0.15)' : 'hsl(var(--muted) / 0.3)',
                fontWeight: draft.keyIssue ? '700' : '500'
              }}>
              <div className="flex-1">
                <Label htmlFor="key-issue" className="text-base font-bold cursor-pointer" style={{ color: draft.keyIssue ? 'hsl(var(--destructive))' : 'inherit' }}>
                  Key Issue
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  First appearance, origin story, death, or other significant event
                </p>
              </div>
              <Switch
                id="key-issue"
                checked={draft.keyIssue}
                onCheckedChange={(checked) => updateDraft({ keyIssue: checked })}
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
                    <SelectContent>
                      <SelectItem value="First Appearance">First Appearance</SelectItem>
                      <SelectItem value="Origin">Origin</SelectItem>
                      <SelectItem value="Death">Death</SelectItem>
                      <SelectItem value="Major Key">Major Key</SelectItem>
                      <SelectItem value="Minor Key">Minor Key</SelectItem>
                      <SelectItem value="Cameo">Cameo</SelectItem>
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
