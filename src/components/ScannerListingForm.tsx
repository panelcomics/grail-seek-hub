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
import { Loader2, Image as ImageIcon, Info, Upload, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ComicVinePicker } from "./ComicVinePicker";
import { PricingHelper } from "./scanner/PricingHelper";
import { extractKeyNotes } from "@/lib/scanHistoryUtils";
import { ImageManagement } from "./ImageManagement";
import { useSellerFee } from "@/hooks/useSellerFee";
import { FEE_DISPLAY_TEXT } from "@/config/feesConfig";

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
  score: number;
  isReprint: boolean;
}

interface PrefillData {
  picks?: ComicVinePick[];
}

interface ScannerListingFormProps {
  imageUrl: string; // User's captured/uploaded image (empty string if from search)
  initialData?: PrefillData;
  confidence?: number | null; // Optional confidence score for display
  comicvineResults?: ComicVinePick[]; // Top 3 results from scan (for backup)
  selectedPick?: ComicVinePick | null; // Pre-selected pick from parent component
}

export function ScannerListingForm({ imageUrl, initialData = {}, confidence, comicvineResults, selectedPick }: ScannerListingFormProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isFoundingSeller, feeRate } = useSellerFee(user?.id);
  const [submitting, setSubmitting] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [pricingData, setPricingData] = useState<any>(null);

  // Form state - all editable (FEATURE_MANUAL_OVERRIDE always enabled)
  const [title, setTitle] = useState("");
  const [series, setSeries] = useState("");
  const [issueNumber, setIssueNumber] = useState("");
  const [publisher, setPublisher] = useState("");
  const [year, setYear] = useState("");
  const [grade, setGrade] = useState("");
  const [condition, setCondition] = useState("NM");
  const [notes, setNotes] = useState("");
  const [selectedCover, setSelectedCover] = useState<string | null>(null);
  const [comicvineId, setComicvineId] = useState<number | null>(null);
  const [volumeId, setVolumeId] = useState<number | null>(null);
  const [variantInfo, setVariantInfo] = useState<string>("");
  const [variantType, setVariantType] = useState<string>("");
  const [variantDetails, setVariantDetails] = useState<string>("");
  const [variantNotes, setVariantNotes] = useState<string>("");
  const [isKey, setIsKey] = useState<boolean>(false);
  const [keyType, setKeyType] = useState<string>("");
  const [writer, setWriter] = useState<string>("");
  const [artist, setArtist] = useState<string>("");
  const [coverArtist, setCoverArtist] = useState<string>("");
  const [keyNotes, setKeyNotes] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [shippingPrice, setShippingPrice] = useState<string>("5.00");
  const [isSlab, setIsSlab] = useState<boolean>(false);
  const [gradingCompany, setGradingCompany] = useState<string>("CGC");
  const [certificationNumber, setCertificationNumber] = useState<string>("");
  const [savedItemId, setSavedItemId] = useState<string | null>(null); // Track saved item for multi-image
  const [listingImages, setListingImages] = useState<any[]>([]);
  const [pendingImages, setPendingImages] = useState<File[]>([]); // Track images before save

  // Auto-fill fields if a pick was pre-selected by parent
  useEffect(() => {
    if (selectedPick) {
      // Use series/volume name as the main title (not the story title)
      const seriesName = selectedPick.volumeName || selectedPick.title;
      setTitle(seriesName);
      setSeries(""); // Keep series empty - user can fill manually if needed
      setIssueNumber(selectedPick.issue || "");
      setPublisher(selectedPick.publisher || "");
      setYear(selectedPick.year?.toString() || "");
      setSelectedCover(selectedPick.coverUrl);
      setComicvineId(selectedPick.id);
      setVolumeId(selectedPick.volumeId || null);
      // Store the ComicVine story title in variant info (e.g. "Invasion!", "Where Do You Plant a Thorn?")
      setVariantInfo(selectedPick.title !== seriesName ? selectedPick.title : (selectedPick.variantDescription || ""));
      // Set writer and artist from ComicVine
      setWriter(selectedPick.writer || "");
      setArtist(selectedPick.artist || "");
      // NOTE: ComicVine doesn't provide a separate "cover artist" field in their API
      // Users will need to manually enter cover artist if it differs from interior artist
      
      // Extract key notes if available (will be passed from parent with full description)
      const description = (selectedPick as any).description;
      if (description) {
        setKeyNotes(extractKeyNotes(description));
      }

      // Fetch pricing for the selected pick
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
          console.warn('[ScannerListingForm] Pricing fetch failed:', e);
        } finally {
          setLoadingPricing(false);
        }
      })();
    }
  }, [selectedPick]); // Only run when selectedPick changes

  const hasPicks = Boolean(comicvineResults?.length) && !selectedPick; // Only show picker if no pick was pre-selected
  const showReferenceCover = selectedCover && imageUrl;

  // FEATURE_PICK_AUTOFILL: Autofill all fields when a pick is selected (from embedded picker)
  const handleComicVineSelect = async (pick: ComicVinePick) => {
    // Use series/volume name as the main title (not the story title)
    const seriesName = pick.volumeName || pick.title;
    setTitle(seriesName);
    setSeries(""); // Keep series empty - user can fill manually if needed
    setIssueNumber(pick.issue || "");
    setPublisher(pick.publisher || "");
    setYear(pick.year?.toString() || "");
    setSelectedCover(pick.coverUrl);
    setComicvineId(pick.id);
    setVolumeId(pick.volumeId || null);
    // Store the ComicVine story title in variant info (e.g. "Invasion!", "Where Do You Plant a Thorn?")
    setVariantInfo(pick.title !== seriesName ? pick.title : (pick.variantDescription || ""));
    // Set writer and artist from ComicVine
    setWriter(pick.writer || "");
    setArtist(pick.artist || "");
    setShowPicker(false);
    
    toast.success("Match applied", {
      description: `Using ${pick.title} ${pick.issue ? `#${pick.issue}` : ''}`
    });

    // FEATURE_PRICING_PIPELINE: Fetch pricing data after pick confirmation
    // This runs in background and doesn't block the UI
    (async () => {
      try {
        setLoadingPricing(true);
        console.log('[ScannerListingForm] Fetching pricing data...');
        
        const { data: pricingResult, error: pricingError } = await supabase.functions.invoke('pricing-pipeline', {
          body: {
            title: pick.title,
            issue: pick.issue,
            year: pick.year,
            publisher: pick.publisher,
            grade: grade || null,
            comicvineId: pick.id
          }
        });

        if (!pricingError && pricingResult?.ok) {
          setPricingData(pricingResult.pricing);
          console.log('[ScannerListingForm] Pricing data received:', pricingResult.pricing);
          
          if (pricingResult.pricing?.median) {
            toast.info("Pricing data loaded", {
              description: `Market value: $${pricingResult.pricing.median}`
            });
          }
        }
      } catch (e) {
        console.warn('[ScannerListingForm] Pricing fetch failed:', e);
        // Don't show error toast - pricing is optional
      } finally {
        setLoadingPricing(false);
      }
    })();
  };

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
      // Use the imageUrl that was already uploaded to external Supabase
      // No need to re-upload since Scanner already handled it
      const finalImageUrl = imageUrl; // Already uploaded to external Supabase

      // Create inventory item with user's image as primary
      // IMPORTANT: title should be the series name, not the ComicVine story title
      const inventoryData: any = {
        user_id: user.id,
        title: title.trim(), // This is the main title (e.g., "Marvel Super Heroes Secret Wars")
        series: series.trim() || null, // Optional series name - only if user fills it
        issue_number: issueNumber.trim() || null,
        publisher: publisher.trim() || null,
        year: year ? parseInt(year) : null,
        grade: grade.trim() || null, // e.g., "9.8" or "VF/NM"
        condition: condition,
        details: notes.trim() || null, // User's notes/description
        comicvine_issue_id: comicvineId ? comicvineId.toString() : null,
        comicvine_volume_id: volumeId ? volumeId.toString() : null,
        variant_description: variantInfo || null, // ComicVine story title goes here (e.g., "Invasion!")
        variant_type: variantType || null, // User-selected variant type
        variant_details: variantDetails.trim() || null, // Additional variant details
        variant_notes: variantNotes.trim() || null, // Free-form variant notes
        is_key: isKey,
        key_type: isKey ? (keyType || null) : null,
        volume_name: series.trim() || null, // Optional volume name
        scanner_confidence: confidence || null,
        scanner_last_scanned_at: new Date().toISOString(),
        images: {
          front: finalImageUrl, // User's image from external Supabase
          comicvine_reference: selectedCover || null, // Store reference separately
        },
        listing_status: "not_listed",
        // ComicVine metadata
        writer: writer.trim() || null,
        artist: artist.trim() || null,
        cover_artist: coverArtist.trim() || null,
        // CGC/Slab info
        is_slab: isSlab,
        grading_company: isSlab ? gradingCompany : null,
        cgc_grade: isSlab ? grade.trim() : null,
        certification_number: isSlab ? certificationNumber.trim() : null,
        // Pricing
        listed_price: price ? parseFloat(price) : null,
        shipping_price: shippingPrice ? parseFloat(shippingPrice) : null,
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

      // Save the item ID and upload pending images
      setSavedItemId(inventoryItem.id);
      
      // Upload pending images if any
      if (pendingImages.length > 0) {
        const { uploadViaProxy } = await import("@/lib/uploadImage");
        for (let i = 0; i < pendingImages.length; i++) {
          const file = pendingImages[i];
          const { publicUrl, previewUrl } = await uploadViaProxy(file);
          
          await supabase.from("listing_images").insert({
            listing_id: inventoryItem.id,
            url: publicUrl,
            thumbnail_url: previewUrl || publicUrl,
            is_primary: i === 0, // First is primary
            sort_order: i,
          });
        }
      }
      
      await fetchListingImages(inventoryItem.id);

      toast.success("Comic added to your inventory!", {
        description: "Redirecting to manage your book..."
      });

      // Navigate to the inventory item edit page after 1 second
      setTimeout(() => {
        navigate(`/inventory/${inventoryItem.id}`);
      }, 1000);

    } catch (error: any) {
      console.error("Error creating listing:", error);
      toast.error("Failed to save comic", {
        description: error.message || "Please try again",
      });
    } finally {
      setSubmitting(false);
    }
  };

  async function fetchListingImages(itemId: string) {
    try {
      const { data, error } = await supabase
        .from("listing_images")
        .select("*")
        .eq("listing_id", itemId)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setListingImages(data || []);
    } catch (error) {
      console.error("Error fetching listing images:", error);
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Create Listing</CardTitle>
        <CardDescription>
          {hasPicks 
            ? "Select a match or enter details manually - all fields are editable."
            : "Fill in the details below - all fields are editable."
          }
        </CardDescription>
        
        {/* ComicVine Unavailable Warning */}
        {!hasPicks && !selectedPick && confidence === null && (
          <Alert className="mt-2">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              ComicVine data unavailable. No problem — you can still create your listing by filling in the fields below.
            </AlertDescription>
          </Alert>
        )}
      </CardHeader>

      <CardContent>
        {/* ComicVine Unavailable Warning */}
        {!hasPicks && !selectedPick && confidence === null && (
          <Alert className="mb-6">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              ComicVine data unavailable. No problem — you can still create your listing by filling in the fields below.
            </AlertDescription>
          </Alert>
        )}
        
        {/* ComicVine Picker - Show if we have picks */}
        {hasPicks && (
          <div className="mb-6">
            <ComicVinePicker
              picks={comicvineResults || []}
              onSelect={handleComicVineSelect}
            />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image Display Section */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* User's Image - Primary (if provided) */}
            {imageUrl && (
              <div className="space-y-2">
                <Label className="text-base font-semibold">Your Photo (Primary Listing Image)</Label>
                <div className="relative w-full max-w-xs mx-auto bg-muted rounded-lg overflow-hidden border-4 border-primary/30 shadow-lg">
                  <div className="aspect-[2/3] relative max-h-[320px] sm:max-h-none">
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

            {/* ComicVine Reference Cover - If Available */}
            {showReferenceCover && (
              <div className="space-y-2">
                <Label className="text-base font-semibold text-muted-foreground">
                  {imageUrl ? "ComicVine Reference Cover" : "Reference Cover"}
                </Label>
                <div className="w-full max-w-xs mx-auto bg-muted rounded-lg overflow-hidden border-2 border-border opacity-70">
                  <div className="aspect-[2/3] relative max-h-[320px] sm:max-h-none">
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
                      This is for reference only. Your photo above will be the listing image.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>

          {/* Form Fields - All Editable */}
          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-2 mb-4">
              <Label className="text-base font-semibold">Preview</Label>
              <div className="text-sm">
                {title && <span className="font-bold">{title}</span>}
                {issueNumber && <span className="font-bold"> #{issueNumber}</span>}
                {publisher && <span className="text-muted-foreground"> • {publisher}</span>}
                {year && <span className="text-muted-foreground"> ({year})</span>}
              </div>
            </div>
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

            {/* Credits Section */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-sm font-medium text-muted-foreground">Credits (Optional)</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="writer">Writer</Label>
                  <Input
                    id="writer"
                    value={writer}
                    onChange={(e) => setWriter(e.target.value)}
                    placeholder="e.g., Stan Lee"
                  />
                </div>
                <div>
                  <Label htmlFor="artist">Artist</Label>
                  <Input
                    id="artist"
                    value={artist}
                    onChange={(e) => setArtist(e.target.value)}
                    placeholder="e.g., Jack Kirby"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="coverArtist">Cover Artist (Optional)</Label>
                <Input
                  id="coverArtist"
                  value={coverArtist}
                  onChange={(e) => setCoverArtist(e.target.value)}
                  placeholder="e.g., Alex Ross, J. Scott Campbell"
                />
              </div>
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
            
            {/* Graded Slab Section */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center space-x-2">
                <Switch
                  id="isSlab"
                  checked={isSlab}
                  onCheckedChange={setIsSlab}
                />
                <Label htmlFor="isSlab" className="font-semibold">Professionally Graded (CGC/CBCS/etc.)</Label>
              </div>
              
              {isSlab && (
                <div className="grid md:grid-cols-3 gap-4 pl-6">
                  <div>
                    <Label htmlFor="gradingCompany">Company</Label>
                    <Select value={gradingCompany} onValueChange={setGradingCompany}>
                      <SelectTrigger id="gradingCompany">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
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
                      <SelectContent>
                        <SelectItem value="10.0">10.0</SelectItem>
                        <SelectItem value="9.9">9.9</SelectItem>
                        <SelectItem value="9.8">9.8</SelectItem>
                        <SelectItem value="9.6">9.6</SelectItem>
                        <SelectItem value="9.4">9.4</SelectItem>
                        <SelectItem value="9.2">9.2</SelectItem>
                        <SelectItem value="9.0">9.0</SelectItem>
                        <SelectItem value="8.5">8.5</SelectItem>
                        <SelectItem value="8.0">8.0</SelectItem>
                        <SelectItem value="7.5">7.5</SelectItem>
                        <SelectItem value="7.0">7.0</SelectItem>
                        <SelectItem value="6.5">6.5</SelectItem>
                        <SelectItem value="6.0">6.0</SelectItem>
                        <SelectItem value="5.5">5.5</SelectItem>
                        <SelectItem value="5.0">5.0</SelectItem>
                        <SelectItem value="4.5">4.5</SelectItem>
                        <SelectItem value="4.0">4.0</SelectItem>
                        <SelectItem value="3.5">3.5</SelectItem>
                        <SelectItem value="3.0">3.0</SelectItem>
                        <SelectItem value="2.5">2.5</SelectItem>
                        <SelectItem value="2.0">2.0</SelectItem>
                        <SelectItem value="1.5">1.5</SelectItem>
                        <SelectItem value="1.0">1.0</SelectItem>
                        <SelectItem value="0.5">0.5</SelectItem>
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

          {/* Variant & Key Details Section */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-lg font-semibold">Variant & Key Details (Optional)</h3>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="variantType">Variant Type</Label>
                <Select value={variantType} onValueChange={setVariantType}>
                  <SelectTrigger id="variantType">
                    <SelectValue placeholder="Select variant type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Direct">Direct</SelectItem>
                    <SelectItem value="Newsstand">Newsstand</SelectItem>
                    <SelectItem value="Price Variant">Price Variant</SelectItem>
                    <SelectItem value="Canadian">Canadian</SelectItem>
                    <SelectItem value="Mark Jewelers">Mark Jewelers</SelectItem>
                    <SelectItem value="2nd Print">2nd Print</SelectItem>
                    <SelectItem value="3rd Print">3rd Print</SelectItem>
                    <SelectItem value="Facsimile">Facsimile</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="variantDetails">Variant Details</Label>
                <Input
                  id="variantDetails"
                  value={variantDetails}
                  onChange={(e) => setVariantDetails(e.target.value)}
                  placeholder="e.g., Cover B, 1:25 ratio"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="variantNotes">Variant Notes</Label>
              <Textarea
                id="variantNotes"
                value={variantNotes}
                onChange={(e) => setVariantNotes(e.target.value)}
                placeholder="e.g., Campbell Virgin Variant, Diamond Retailer Incentive"
                rows={2}
              />
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isKey"
                  checked={isKey}
                  onChange={(e) => setIsKey(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="isKey" className="font-semibold cursor-pointer">
                  Key Issue
                </Label>
              </div>

              {isKey && (
                <div>
                  <Label htmlFor="keyType">Key Type</Label>
                  <Select value={keyType} onValueChange={setKeyType}>
                    <SelectTrigger id="keyType">
                      <SelectValue placeholder="Select key type..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Major Key">Major Key</SelectItem>
                      <SelectItem value="Minor Key">Minor Key</SelectItem>
                      <SelectItem value="First Appearance">First Appearance</SelectItem>
                      <SelectItem value="Cameo">Cameo</SelectItem>
                      <SelectItem value="Origin">Origin</SelectItem>
                      <SelectItem value="Death">Death</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* Key Notes */}
          {keyNotes && (
            <div className="space-y-2">
              <Label htmlFor="keyNotes">Key Issue Notes</Label>
              <Textarea
                id="keyNotes"
                value={keyNotes}
                onChange={(e) => setKeyNotes(e.target.value)}
                placeholder="First appearance of..."
                className="min-h-[60px]"
              />
            </div>
          )}

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

          {/* Price & Shipping */}
          <div className="space-y-3 pt-4 border-t">
            <h3 className="text-lg font-semibold">Pricing (Optional)</h3>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
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
                {price && parseFloat(price) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {isFoundingSeller ? "2%" : "3.75%"} platform fee ({FEE_DISPLAY_TEXT.FOUNDING_RATE})
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
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
          </div>

          {/* Multi-image upload - Available BEFORE and AFTER save */}
          <div className="space-y-3 pt-6 border-t">
            <Label className="text-base font-semibold">Additional Photos (Optional)</Label>
            <p className="text-sm text-muted-foreground">
              Add up to 8 photos: front, back, spine, defects, etc.
            </p>
            
            {savedItemId ? (
              <ImageManagement
                listingId={savedItemId}
                images={listingImages}
                onImagesChange={() => fetchListingImages(savedItemId)}
                maxImages={8}
              />
            ) : (
              <div className="space-y-4">
                {pendingImages.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {pendingImages.map((file, idx) => (
                      <Card key={idx} className="relative p-2">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Preview ${idx + 1}`}
                          className="w-full aspect-square object-cover rounded"
                        />
                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            className="w-full"
                            onClick={() => setPendingImages(pendingImages.filter((_, i) => i !== idx))}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
                
                {pendingImages.length < 8 && (
                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => document.getElementById('pending-file-upload')?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Add Photos ({pendingImages.length}/8)
                    </Button>
                    <input
                      id="pending-file-upload"
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        if (pendingImages.length + files.length > 8) {
                          toast.error(`Max 8 photos. You can add ${8 - pendingImages.length} more.`);
                          return;
                        }
                        setPendingImages([...pendingImages, ...files]);
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Submit Button - Simplified to just Cancel + Save */}
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
              Save
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
