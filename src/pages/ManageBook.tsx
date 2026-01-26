import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

// Full condition options for raw comics (matches ScannerListingForm)
const CONDITION_OPTIONS = [
  { value: "MT", label: "Mint (MT) - 10.0" },
  { value: "NM+", label: "Near Mint+ (NM+) - 9.6" },
  { value: "NM", label: "Near Mint (NM) - 9.4" },
  { value: "NM-", label: "Near Mint- (NM-) - 9.2" },
  { value: "VF+", label: "Very Fine+ (VF+) - 8.5" },
  { value: "VF", label: "Very Fine (VF) - 8.0" },
  { value: "VF-", label: "Very Fine- (VF-) - 7.5" },
  { value: "FN+", label: "Fine+ (FN+) - 6.5" },
  { value: "FN", label: "Fine (FN) - 6.0" },
  { value: "FN-", label: "Fine- (FN-) - 5.5" },
  { value: "VG+", label: "Very Good+ (VG+) - 5.0" },
  { value: "VG", label: "Very Good (VG) - 4.0" },
  { value: "VG-", label: "Very Good- (VG-) - 3.5" },
  { value: "GD+", label: "Good+ (GD+) - 2.5" },
  { value: "GD", label: "Good (GD) - 2.0" },
  { value: "GD-", label: "Good- (GD-) - 1.8" },
  { value: "FR", label: "Fair (FR) - 1.5" },
  { value: "FR/GD", label: "Fair/Good (FR/GD) - 1.0" },
  { value: "PR", label: "Poor (PR) - 0.5" },
];
import { ArrowLeft, Loader2, ExternalLink, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { debugLog } from "@/lib/debug";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { InventoryImageManager } from "@/components/InventoryImageManager";
import { Separator } from "@/components/ui/separator";
import { MarkSoldOffPlatformModal } from "@/components/MarkSoldOffPlatformModal";
import { GRADE_OPTIONS } from "@/types/draftItem";
import { RotateCw, RotateCcw } from "lucide-react";
import { getRotationTransform, rotateLeft, rotateRight } from "@/lib/imageRotation";
import { useSellerOnboarding } from "@/hooks/useSellerOnboarding";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Common defects that buyers should know about
const DEFECT_OPTIONS = [
  { value: "cover_detached", label: "Cover Detached", description: "Cover is separated from staples" },
  { value: "cover_loose", label: "Cover Loose", description: "Cover detached but stable" },
  { value: "staple_detached", label: "Detached Staple", description: "One or more staples missing/loose" },
  { value: "tape_on_spine", label: "Tape on Spine", description: "Tape visible on spine" },
  { value: "tape_on_cover", label: "Tape on Cover", description: "Tape visible on cover" },
  { value: "ink_on_cover", label: "Ink/Writing on Cover", description: "Ink marks, writing, or stamps" },
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

export default function ManageBook() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [item, setItem] = useState<any>(null);
  const [activeListing, setActiveListing] = useState<any>(null);
  const [markSoldModalOpen, setMarkSoldModalOpen] = useState(false);
  const [imageRotation, setImageRotation] = useState<number>(0);
  const { needsOnboarding, loading: onboardingLoading } = useSellerOnboarding();
  
  // Defects state
  const [selectedDefects, setSelectedDefects] = useState<string[]>([]);
  const [defectAdditionalNotes, setDefectAdditionalNotes] = useState("");

  // Form state for all fields
  const [formData, setFormData] = useState({
    // Comic Details
    title: "",
    issue_number: "",
    series: "",
    publisher: "",
    year: "",
    cover_date: "",
    condition: "",
    details: "",
    variant_type: "",
    variant_details: "",
    variant_notes: "",
    is_key: false,
    key_type: "",
    writer: "",
    artist: "",
    cover_artist: "",
    is_slab: false,
    cgc_grade: "",
    grading_company: "CGC",
    certification_number: "",
    
    // Signature fields
    is_signed: false,
    signature_type: "",
    signed_by: "",
    signature_date: "",
    
    // Pricing & Condition
    listed_price: "",
    shipping_price: "",
    
    // Sell & Trade
    for_sale: false,
    for_auction: false,
    is_for_trade: false,
    in_search_of: "",
    trade_notes: "",
    
    // Private
    private_notes: "",
    private_location: "",
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchItem();
  }, [id, authLoading]);

  const fetchItem = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("id", id)
        .eq("user_id", user?.id)
        .single();

      if (error) throw error;
      
      if (data.user_id !== user?.id) {
        toast.error("You don't own this item");
        navigate("/my-collection");
        return;
      }

      setItem(data);
      
      // Set rotation from database
      setImageRotation(data.primary_image_rotation || 0);
      
      // Populate form - ensure ALL fields are mapped from database
      setFormData({
        title: data.title || "",
        issue_number: data.issue_number || "",
        series: data.series || "",
        publisher: data.publisher || "",
        year: data.year?.toString() || "",
        cover_date: data.cover_date || "",
        condition: data.condition || "",
        details: data.key_details || data.details || "",  // Try key_details first, fallback to details
        variant_type: data.variant_type || "",
        variant_details: data.variant_details || data.variant_description || "",  // Fallback to variant_description
        variant_notes: data.variant_notes || "",
        is_key: data.is_key || data.key_issue || false,  // Support both field names
        key_type: data.key_type || "",
        writer: data.writer || "",
        artist: data.artist || "",
        cover_artist: data.cover_artist || "",
        is_slab: data.is_slab || false,
        cgc_grade: data.cgc_grade || data.grade || "",  // CRITICAL: Fallback to grade column
        grading_company: data.grading_company || "CGC",
        certification_number: data.certification_number || "",
        // Signature fields
        is_signed: data.is_signed || false,
        signature_type: data.signature_type || "",
        signed_by: data.signed_by || "",
        signature_date: data.signature_date || "",
        listed_price: data.listed_price?.toString() || "",
        shipping_price: data.shipping_price?.toString() || "",
        for_sale: data.for_sale || false,
        for_auction: data.for_auction || false,
        is_for_trade: data.is_for_trade || false,
        in_search_of: data.in_search_of || "",
        trade_notes: data.trade_notes || "",
        private_notes: data.private_notes || "",
        private_location: data.private_location || data.storage_location || "",  // Fallback to storage_location
      });
      
      // Load defect notes
      const parsedDefects = parseDefectNotes(data.defect_notes);
      setSelectedDefects(parsedDefects.selectedDefects);
      setDefectAdditionalNotes(parsedDefects.additionalNotes);
      
      await fetchActiveListing(id);
    } catch (error) {
      console.error("Error fetching item:", error);
      toast.error("Failed to load item");
      navigate("/my-collection");
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveListing = async (itemId: string) => {
    try {
      const { data, error } = await supabase
        .from("listings")
        .select("id, status, type")
        .eq("inventory_item_id", itemId)
        .in("status", ["active", "live", "listed"])
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching active listing:", error);
      }
      
      setActiveListing(data);
    } catch (error) {
      console.error("Error fetching listing:", error);
    }
  };

  // Image management now uses inventory_items.images JSONB field directly

  const handleSave = async () => {
    if (!user || !item) return;

    debugLog("[INVENTORY-SAVE] 🔍 START", {
      itemId: item.id,
      itemTitle: formData.title || formData.series,
      for_sale: formData.for_sale,
      is_for_trade: formData.is_for_trade,
      images: item.images
    });

    setSaving(true);
    try {
      const updateData: any = {
        title: formData.title,
        issue_number: formData.issue_number || null,
        series: formData.series || null,
        publisher: formData.publisher || null,
        year: formData.year ? parseInt(formData.year) : null,
        cover_date: formData.cover_date || null,
        condition: formData.condition || null,
        details: null,  // No longer used - key info now properly saved to key_details
        variant_type: formData.variant_type || null,
        variant_details: formData.variant_details || null,
        variant_notes: formData.variant_notes || null,
        key_issue: formData.is_key,
        is_key: formData.is_key,
        key_details: formData.is_key ? formData.details : null,  // Save key info text from "Key Info / Details" field
        key_type: formData.is_key ? (formData.key_type || null) : null,
        writer: formData.writer || null,
        artist: formData.artist || null,
        cover_artist: formData.cover_artist || null,
        is_slab: formData.is_slab,
        grading_company: formData.is_slab ? formData.grading_company : null,
        cgc_grade: formData.is_slab ? formData.cgc_grade : null,
        grade: formData.is_slab ? formData.cgc_grade : null,
        certification_number: formData.certification_number || null,
        // Signature fields
        is_signed: formData.is_signed,
        signature_type: formData.is_signed ? formData.signature_type : null,
        signed_by: formData.is_signed ? formData.signed_by : null,
        signature_date: formData.is_signed ? formData.signature_date : null,
        listed_price: formData.listed_price ? parseFloat(formData.listed_price) : null,
        shipping_price: formData.shipping_price ? parseFloat(formData.shipping_price) : null,
        for_sale: formData.for_sale,
        for_auction: formData.for_auction,
        is_for_trade: formData.is_for_trade,
        in_search_of: formData.is_for_trade ? formData.in_search_of?.trim() : null,
        trade_notes: formData.is_for_trade ? formData.trade_notes?.trim() : null,
        private_notes: formData.private_notes || null,
        private_location: formData.private_location || null,
        storage_location: formData.private_location || null,
        listing_status: formData.for_sale ? "listed" : "not_listed",
        primary_image_rotation: imageRotation,
        defect_notes: buildDefectNotes(selectedDefects, defectAdditionalNotes),
        updated_at: new Date().toISOString(),
        // CRITICAL: DO NOT include 'images' field - it's managed separately
      };

      debugLog("[INVENTORY-SAVE] 📝 Updating inventory_items ONLY (never touches listings)", {
        fields: Object.keys(updateData),
        excludes: ['images']
      });

      const { error } = await supabase
        .from("inventory_items")
        .update(updateData)
        .eq("id", item.id);

      if (error) {
        console.error("[INVENTORY-SAVE] ❌ Update failed:", error);
        throw error;
      }

      debugLog("[INVENTORY-SAVE] ✅ inventory_items updated successfully");

      // Sync price/grade to linked listing if one exists
      const { data: linkedListing } = await supabase
        .from("listings")
        .select("id")
        .eq("inventory_item_id", item.id)
        .in("status", ["active", "live", "listed"])
        .maybeSingle();

      if (linkedListing) {
        debugLog("[INVENTORY-SAVE] 🔗 Syncing price/grade to linked listing", linkedListing.id);
        const listingUpdates: any = {};
        
        if (formData.listed_price) {
          listingUpdates.price_cents = Math.round(parseFloat(formData.listed_price) * 100);
          listingUpdates.price = parseFloat(formData.listed_price);
        }
        
        if (formData.is_slab && formData.cgc_grade) {
          listingUpdates.title = getDisplayTitle();
        }

        const { error: listingError } = await supabase
          .from("listings")
          .update(listingUpdates)
          .eq("id", linkedListing.id);

        if (listingError) {
          console.error("[INVENTORY-SAVE] ⚠️ Failed to sync to listing:", listingError);
        } else {
          debugLog("[INVENTORY-SAVE] ✅ Listing price/grade synced");
        }
      }

      toast.success("Book updated successfully");
      
      // Refresh item data after save
      await fetchItem();
      await fetchActiveListing(item.id);
      debugLog("[INVENTORY-SAVE] 🔍 COMPLETE");
    } catch (error: any) {
      console.error("[INVENTORY-SAVE] ❌ ERROR:", error);
      const errorMessage = error?.message 
        ? `Failed to update: ${error.message}` 
        : "Failed to update book";
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const getDisplayTitle = () => {
    const titlePart = formData.series || formData.title || "Untitled";
    const issuePart = formData.issue_number ? ` #${formData.issue_number}` : "";
    const gradePart = formData.is_slab && formData.cgc_grade 
      ? ` – ${formData.grading_company || "CGC"} ${formData.cgc_grade}` 
      : "";
    return `${titlePart}${issuePart}${gradePart}`;
  };

  if (loading || authLoading) {
    return (
      <main className="flex-1 container py-4 md:py-8">
        <div className="max-w-6xl mx-auto space-y-4 md:space-y-6">
          <Skeleton className="h-9 w-40" />
          <div className="flex justify-between items-start">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-9 w-32" />
          </div>
          <div className="grid md:grid-cols-[300px_1fr] gap-4 md:gap-6">
            <div className="space-y-4">
              <Skeleton className="aspect-[2/3] w-full rounded-lg" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!item) {
    return (
      <main className="flex-1 container py-8">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Book not found</h1>
          <Button onClick={() => navigate("/my-collection")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Collection
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 container py-4 md:py-8 px-3 md:px-6">
      <div className="max-w-6xl mx-auto space-y-4 md:space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/my-collection")}
          className="mb-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to My Collection
        </Button>

        <div className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">{getDisplayTitle()}</h1>
            {item.sold_off_platform && (
              <div className="mt-2 text-sm text-muted-foreground">
                Sold off-platform via {item.sold_off_platform_channel?.replace('_', ' ')} on{' '}
                {new Date(item.sold_off_platform_date).toLocaleDateString()}
              </div>
            )}
          </div>
          
          {!item.sold_off_platform && (
            <Button
              variant="outline"
              onClick={() => setMarkSoldModalOpen(true)}
              className="ml-4"
            >
              Mark Sold (Off-Platform)
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: Image Gallery */}
          <div className="space-y-4">
            {/* Primary Image Display */}
            {item.images && (item.images.primary || item.images.others?.length > 0) && (
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="relative aspect-[3/4] bg-muted rounded-lg overflow-hidden">
                    <img
                      src={
                        item.images.primary || 
                        item.images.others?.[0] || 
                        '/placeholder.svg'
                      }
                      alt={formData.title || "Book cover"}
                      className="w-full h-auto object-contain max-h-[600px] mx-auto transition-transform duration-200"
                      style={{
                        transform: getRotationTransform(imageRotation)
                      }}
                    />
                  </div>
                  
                  {/* Rotation Controls */}
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const newRotation = rotateLeft(imageRotation);
                        setImageRotation(newRotation);
                        // Auto-save rotation immediately
                        try {
                          await supabase
                            .from("inventory_items")
                            .update({ primary_image_rotation: newRotation })
                            .eq("id", item.id);
                          toast.success("Rotation saved");
                        } catch (error) {
                          toast.error("Failed to save rotation");
                        }
                      }}
                      className="flex items-center gap-1.5"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Rotate Left 90°
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const newRotation = rotateRight(imageRotation);
                        setImageRotation(newRotation);
                        // Auto-save rotation immediately
                        try {
                          await supabase
                            .from("inventory_items")
                            .update({ primary_image_rotation: newRotation })
                            .eq("id", item.id);
                          toast.success("Rotation saved");
                        } catch (error) {
                          toast.error("Failed to save rotation");
                        }
                      }}
                      className="flex items-center gap-1.5"
                    >
                      <RotateCw className="h-4 w-4" />
                      Rotate Right 90°
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Photo Management - Unified JSONB system */}
            <Card>
              <CardContent className="pt-6">
                <Label className="text-base font-semibold mb-3 block">Photos (up to 8)</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Add multiple photos: front, back, spine, defects, etc.
                </p>
                <InventoryImageManager
                  inventoryItemId={id!}
                  images={item.images || { primary: null, others: [] }}
                  onImagesChange={() => fetchItem()}
                  maxImages={8}
                />
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: Form Sections */}
          <div className="space-y-6">
            {/* SECTION A: Comic Details */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <h2 className="text-xl font-semibold mb-4">Comic Details</h2>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Amazing Spider-Man"
                    />
                  </div>

                  <div>
                    <Label htmlFor="issue_number">Issue #</Label>
                    <Input
                      id="issue_number"
                      value={formData.issue_number}
                      onChange={(e) => setFormData({ ...formData, issue_number: e.target.value })}
                      placeholder="129"
                    />
                  </div>

                  <div>
                    <Label htmlFor="series">Series</Label>
                    <Input
                      id="series"
                      value={formData.series}
                      onChange={(e) => setFormData({ ...formData, series: e.target.value })}
                      placeholder="Amazing Spider-Man"
                    />
                  </div>

                  <div>
                    <Label htmlFor="publisher">Publisher</Label>
                    <Input
                      id="publisher"
                      value={formData.publisher}
                      onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                      placeholder="Marvel"
                    />
                  </div>

                  <div>
                    <Label htmlFor="year">Year</Label>
                    <Input
                      id="year"
                      type="number"
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                      placeholder="1974"
                    />
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="cover_date">Cover Date</Label>
                    <Input
                      id="cover_date"
                      type="date"
                      value={formData.cover_date}
                      onChange={(e) => setFormData({ ...formData, cover_date: e.target.value })}
                    />
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="condition">Condition</Label>
                    <Select
                      value={formData.condition}
                      onValueChange={(value) => setFormData({ ...formData, condition: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent>
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

                  <div className="col-span-2">
                    <Label htmlFor="details">Key Info / Details</Label>
                    <Textarea
                      id="details"
                      value={formData.details}
                      onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                      placeholder="1st Punisher appearance, newsstand variant, etc."
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="writer">Writer</Label>
                    <Input
                      id="writer"
                      value={formData.writer}
                      onChange={(e) => setFormData({ ...formData, writer: e.target.value })}
                      placeholder="Stan Lee"
                    />
                  </div>

                  <div>
                    <Label htmlFor="artist">Artist</Label>
                    <Input
                      id="artist"
                      value={formData.artist}
                      onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
                      placeholder="John Romita Sr."
                    />
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="cover_artist">Cover Artist (Optional)</Label>
                    <Input
                      id="cover_artist"
                      value={formData.cover_artist}
                      onChange={(e) => setFormData({ ...formData, cover_artist: e.target.value })}
                      placeholder="Alex Ross, J. Scott Campbell, etc."
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 px-4 rounded-lg border-2 transition-all"
                    style={{
                      borderColor: formData.is_key ? 'hsl(var(--destructive))' : 'hsl(var(--border))',
                      backgroundColor: formData.is_key ? 'hsl(var(--destructive) / 0.15)' : 'hsl(var(--muted) / 0.3)',
                      fontWeight: formData.is_key ? '700' : '500'
                    }}>
                    <div className="flex-1">
                      <Label htmlFor="is_key" className="text-base font-bold cursor-pointer" style={{ color: formData.is_key ? 'hsl(var(--destructive))' : 'inherit' }}>
                        Key Issue
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        First appearance, origin story, death, or other significant event
                      </p>
                    </div>
                    <Switch
                      id="is_key"
                      checked={formData.is_key}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_key: checked })}
                      className="data-[state=checked]:bg-destructive"
                    />
                  </div>

                  {formData.is_key && (
                    <div>
                      <Label htmlFor="key_type">Key Type</Label>
                      <Select
                        value={formData.key_type}
                        onValueChange={(value) => setFormData({ ...formData, key_type: value })}
                      >
                        <SelectTrigger id="key_type">
                          <SelectValue placeholder="Select key type..." />
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
                  )}
                </div>

                <Separator />

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="variant_type">Variant Type</Label>
                    <Select
                      value={formData.variant_type}
                      onValueChange={(value) => setFormData({ ...formData, variant_type: value })}
                    >
                      <SelectTrigger>
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
                    <Label htmlFor="variant_details">Variant Details</Label>
                    <Input
                      id="variant_details"
                      value={formData.variant_details}
                      onChange={(e) => setFormData({ ...formData, variant_details: e.target.value })}
                      placeholder="1:25 ratio, convention exclusive, etc."
                    />
                  </div>

                  <div>
                    <Label htmlFor="variant_notes">Variant Notes</Label>
                    <Textarea
                      id="variant_notes"
                      value={formData.variant_notes}
                      onChange={(e) => setFormData({ ...formData, variant_notes: e.target.value })}
                      placeholder="Additional variant information"
                      rows={2}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 px-4 rounded-lg border-2 transition-all"
                    style={{
                      borderColor: formData.is_slab ? 'hsl(var(--destructive))' : 'hsl(var(--border))',
                      backgroundColor: formData.is_slab ? 'hsl(var(--destructive) / 0.15)' : 'hsl(var(--muted) / 0.3)',
                      fontWeight: formData.is_slab ? '700' : '500'
                    }}>
                    <div className="flex-1">
                      <Label htmlFor="is_slab" className="text-base font-bold cursor-pointer" style={{ color: formData.is_slab ? 'hsl(var(--destructive))' : 'inherit' }}>
                        Graded Slab
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        This comic is professionally graded by CGC, CBCS, or PGX
                      </p>
                    </div>
                    <Switch
                      id="is_slab"
                      checked={formData.is_slab}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_slab: checked })}
                      className="data-[state=checked]:bg-destructive"
                    />
                  </div>

                  {formData.is_slab && (
                    <>
                      <div>
                        <Label htmlFor="grading_company">Grading Company</Label>
                        <Select
                          value={formData.grading_company}
                          onValueChange={(value) => setFormData({ ...formData, grading_company: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-popover z-50">
                            <SelectItem value="CGC">CGC</SelectItem>
                            <SelectItem value="CBCS">CBCS</SelectItem>
                            <SelectItem value="PSA">PSA</SelectItem>
                            <SelectItem value="PGX">PGX</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="cgc_grade">Grade</Label>
                        <Select
                          value={formData.cgc_grade}
                          onValueChange={(value) => setFormData({ ...formData, cgc_grade: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select grade" />
                          </SelectTrigger>
                          <SelectContent>
                            {GRADE_OPTIONS.map((g) => (
                              <SelectItem key={g} value={g}>{g}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="certification_number">Certification Number</Label>
                        <Input
                          id="certification_number"
                          value={formData.certification_number}
                          onChange={(e) => setFormData({ ...formData, certification_number: e.target.value })}
                          placeholder="1234567890"
                        />
                      </div>
                    </>
                  )}
                </div>

                <Separator />

                {/* Signature Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 px-4 rounded-lg border-2 transition-all"
                    style={{
                      borderColor: formData.is_signed ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                      backgroundColor: formData.is_signed ? 'hsl(var(--primary) / 0.15)' : 'hsl(var(--muted) / 0.3)',
                      fontWeight: formData.is_signed ? '700' : '500'
                    }}>
                    <div className="flex-1">
                      <Label htmlFor="is_signed" className="text-base font-bold cursor-pointer" style={{ color: formData.is_signed ? 'hsl(var(--primary))' : 'inherit' }}>
                        Signed
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        This comic has a signature (slabbed or raw)
                      </p>
                    </div>
                    <Switch
                      id="is_signed"
                      checked={formData.is_signed}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_signed: checked })}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>

                  {formData.is_signed && (
                    <>
                      <div>
                        <Label htmlFor="signature_type">Signature Type</Label>
                        <Select
                          value={formData.signature_type}
                          onValueChange={(value) => setFormData({ ...formData, signature_type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select signature type" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover z-50">
                            <SelectItem value="CGC Signature Series">CGC Signature Series</SelectItem>
                            <SelectItem value="CBCS Signature Verified">CBCS Signature Verified</SelectItem>
                            <SelectItem value="Witnessed Signature">Witnessed Signature</SelectItem>
                            <SelectItem value="Unwitnessed / Raw Signature">Unwitnessed / Raw Signature</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="signed_by">Signed By</Label>
                        <Input
                          id="signed_by"
                          value={formData.signed_by}
                          onChange={(e) => setFormData({ ...formData, signed_by: e.target.value })}
                          placeholder="Stan Lee, Todd McFarlane, Jim Lee, etc."
                        />
                      </div>

                      <div>
                        <Label htmlFor="signature_date">Signature Date (optional)</Label>
                        <Input
                          id="signature_date"
                          value={formData.signature_date}
                          onChange={(e) => setFormData({ ...formData, signature_date: e.target.value })}
                          placeholder="04/25/2024"
                        />
                      </div>
                    </>
                  )}
                </div>
                
                <Separator />
                
                {/* Defects Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <Label className="text-base font-semibold text-gray-900">Known Defects</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
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
                          id={`defect-manage-${option.value}`}
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
                            htmlFor={`defect-manage-${option.value}`}
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
                  <div>
                    <Label htmlFor="defectAdditionalNotes" className="text-sm">Additional Defect Details</Label>
                    <Textarea
                      id="defectAdditionalNotes"
                      value={defectAdditionalNotes}
                      onChange={(e) => setDefectAdditionalNotes(e.target.value)}
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
              </CardContent>
            </Card>

            {/* SECTION B: Pricing & Condition */}
            <Card className="bg-white border border-border">
              <CardContent className="pt-6 space-y-4">
                <h2 className="text-xl font-semibold mb-4 text-gray-900">Pricing</h2>
                
                <div>
                  <Label htmlFor="listed_price" className="text-gray-900 font-medium">Sale Price ($)</Label>
                  <Input
                    className="bg-background border-input mt-1"
                    id="listed_price"
                    type="number"
                    step="0.01"
                    value={formData.listed_price}
                    onChange={(e) => setFormData({ ...formData, listed_price: e.target.value })}
                    placeholder="175.00"
                  />
                </div>

                <div>
                  <Label htmlFor="shipping_price" className="text-gray-900 font-medium">Shipping Price ($)</Label>
                  <Input
                    className="bg-background border-input mt-1"
                    id="shipping_price"
                    type="number"
                    step="0.01"
                    value={formData.shipping_price}
                    onChange={(e) => setFormData({ ...formData, shipping_price: e.target.value })}
                    placeholder="$0–25 typical"
                  />
                </div>
              </CardContent>
            </Card>

            {/* SECTION C: Sell & Trade Options */}
            <Card className="bg-white border border-border">
              <CardContent className="pt-6 space-y-4">
                <h2 className="text-xl font-semibold mb-4 text-gray-900">Sell & Trade Options</h2>
                
                <div className="flex items-center justify-between p-4 rounded-lg border border-gray-300 bg-gray-50">
                  <div className="flex-1">
                    <Label htmlFor="for_sale" className="text-base font-bold text-gray-900 cursor-pointer">
                      List for Sale
                    </Label>
                    {activeListing ? (
                      <p className="text-sm text-green-600 mt-1 font-medium">
                        ✓ Live — this book is listed for sale on the marketplace.
                      </p>
                    ) : formData.for_sale ? (
                      <p className="text-sm text-gray-600 mt-1">
                        Not live yet — save to publish this listing.
                      </p>
                    ) : (
                      <p className="text-sm text-gray-600 mt-1">
                        Turn this on and save to create a public listing.
                      </p>
                    )}
                  </div>
                  <Switch
                    id="for_sale"
                    checked={formData.for_sale}
                    onCheckedChange={(checked) => setFormData({ ...formData, for_sale: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-gray-300 bg-gray-50">
                  <Label htmlFor="for_auction" className="text-base font-semibold text-gray-900 cursor-pointer">
                    Auction
                  </Label>
                  <Switch
                    id="for_auction"
                    checked={formData.for_auction}
                    onCheckedChange={(checked) => setFormData({ ...formData, for_auction: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-gray-300 bg-gray-50">
                  <Label htmlFor="is_for_trade" className="text-base font-semibold text-gray-900 cursor-pointer">
                    Available for Trade
                  </Label>
                  <Switch
                    id="is_for_trade"
                    checked={formData.is_for_trade}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_for_trade: checked })}
                  />
                </div>

                {formData.is_for_trade && (
                  <>
                    <div>
                      <Label htmlFor="in_search_of">In Search Of</Label>
                      <Input
                        id="in_search_of"
                        value={formData.in_search_of}
                        onChange={(e) => setFormData({ ...formData, in_search_of: e.target.value })}
                        placeholder="What you're looking for in a trade"
                      />
                    </div>

                    <div>
                      <Label htmlFor="trade_notes">Trade Notes</Label>
                      <Textarea
                        id="trade_notes"
                        value={formData.trade_notes}
                        onChange={(e) => setFormData({ ...formData, trade_notes: e.target.value })}
                        placeholder="Additional trade information"
                        rows={3}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* SECTION D: Private Notes */}
            <Card className="bg-white border border-border">
              <CardContent className="pt-6 space-y-4">
                <h2 className="text-xl font-semibold mb-4 text-gray-900">Private Notes</h2>
                
                <div>
                  <Label htmlFor="private_location" className="text-gray-900 font-medium">Storage Location</Label>
                  <Input
                    className="bg-background border-input mt-1"
                    id="private_location"
                    value={formData.private_location}
                    onChange={(e) => setFormData({ ...formData, private_location: e.target.value })}
                    placeholder="Box 3, Shelf A, etc."
                  />
                </div>

                <div>
                  <Label htmlFor="private_notes" className="text-gray-900 font-medium">Private Notes</Label>
                  <Textarea
                    className="bg-background border-input mt-1"
                    id="private_notes"
                    value={formData.private_notes}
                    onChange={(e) => setFormData({ ...formData, private_notes: e.target.value })}
                    placeholder="Personal notes (not visible to buyers)"
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons - Sticky on mobile */}
            <div className="sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm p-4 -mx-4 md:static md:bg-transparent md:p-0 md:mx-0 border-t md:border-t-0">
              <div className="flex gap-3 max-w-6xl mx-auto">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
                  size="lg"
                  variant="default"
                >
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save Changes
                </Button>
                
                {activeListing ? (
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/listing/${activeListing.id}`)}
                    size="lg"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View Live Listing
                  </Button>
                ) : formData.for_sale && !item.sold_off_platform ? (
                  <Button
                    variant="default"
                    onClick={async () => {
                      // Check if seller has completed full setup (Stripe + Shipping)
                      if (!onboardingLoading && needsOnboarding) {
                        toast.info("Complete your seller setup (payouts + shipping address) to create listings");
                        navigate(`/seller-setup?returnTo=/inventory/${id}`);
                        return;
                      }
                      
                      if (!formData.listed_price || parseFloat(formData.listed_price) <= 0) {
                        toast.error("Please set a sale price before listing");
                        return;
                      }
                      
                      try {
                        setSaving(true);
                        debugLog("[RELIST] Starting relist flow - saving inventory first");
                        
                        // CRITICAL: Save ALL inventory fields first before creating listing
                        // This ensures slab data, key issue data, images, etc. are persisted
                        const inventoryUpdate: any = {
                          title: formData.title,
                          issue_number: formData.issue_number || null,
                          series: formData.series || null,
                          publisher: formData.publisher || null,
                          year: formData.year ? parseInt(formData.year) : null,
                          cover_date: formData.cover_date || null,
                          condition: formData.condition || null,
                          variant_type: formData.variant_type || null,
                          variant_details: formData.variant_details || null,
                          variant_notes: formData.variant_notes || null,
                          key_issue: formData.is_key,
                          is_key: formData.is_key,
                          key_details: formData.is_key ? formData.details : null,
                          key_type: formData.is_key ? (formData.key_type || null) : null,
                          writer: formData.writer || null,
                          artist: formData.artist || null,
                          cover_artist: formData.cover_artist || null,
                          // CRITICAL: Save all slab fields
                          is_slab: formData.is_slab,
                          grading_company: formData.is_slab ? formData.grading_company : null,
                          cgc_grade: formData.is_slab ? formData.cgc_grade : null,
                          grade: formData.is_slab ? formData.cgc_grade : null,
                          certification_number: formData.is_slab ? formData.certification_number : null,
                          // Pricing
                          listed_price: formData.listed_price ? parseFloat(formData.listed_price) : null,
                          shipping_price: formData.shipping_price ? parseFloat(formData.shipping_price) : null,
                          // Sale/Trade flags
                          for_sale: formData.for_sale,
                          for_auction: formData.for_auction,
                          is_for_trade: formData.is_for_trade,
                          in_search_of: formData.is_for_trade ? formData.in_search_of?.trim() : null,
                          trade_notes: formData.is_for_trade ? formData.trade_notes?.trim() : null,
                          // Private fields
                          private_notes: formData.private_notes || null,
                          private_location: formData.private_location || null,
                          storage_location: formData.private_location || null,
                          listing_status: "listed",
                          primary_image_rotation: imageRotation,
                          updated_at: new Date().toISOString(),
                        };
                        
                        debugLog("[RELIST] Saving inventory with fields:", Object.keys(inventoryUpdate));
                        
                        const { error: inventoryError } = await supabase
                          .from("inventory_items")
                          .update(inventoryUpdate)
                          .eq("id", item.id);
                        
                        if (inventoryError) {
                          console.error("[RELIST] Inventory save failed:", inventoryError);
                          throw inventoryError;
                        }
                        
                        debugLog("[RELIST] Inventory saved, checking for existing sold listing to reactivate");
                        
                        // Check if there's an existing sold/inactive listing to reactivate
                        const { data: existingListing } = await supabase
                          .from("listings")
                          .select("id, status")
                          .eq("inventory_item_id", item.id)
                          .in("status", ["sold", "inactive", "ended"])
                          .maybeSingle();
                        
                        const priceInCents = Math.round(parseFloat(formData.listed_price) * 100);
                        const shippingInDollars = formData.shipping_price ? parseFloat(formData.shipping_price) : 0;
                        const displayTitle = formData.is_slab && formData.cgc_grade
                          ? `${formData.series || formData.title || "Untitled"}${formData.issue_number ? ` #${formData.issue_number}` : ""} – ${formData.grading_company || "CGC"} ${formData.cgc_grade}`
                          : formData.title || formData.series;
                        
                        let finalListing;
                        
                        if (existingListing) {
                          debugLog("[RELIST] Reactivating existing listing:", existingListing.id);
                          // Reactivate existing listing with updated data
                          const { data: updatedListing, error: updateError } = await supabase
                            .from("listings")
                            .update({
                              status: "active",
                              type: formData.for_auction ? "auction" : "buy_now",
                              title: displayTitle,
                              issue_number: formData.issue_number || null,
                              volume_name: formData.series || null,
                              price_cents: priceInCents,
                              shipping_price: shippingInDollars,
                              image_url: item.images?.primary || null,
                              details: formData.details || null,
                              condition_notes: formData.condition || null,
                              updated_at: new Date().toISOString(),
                            })
                            .eq("id", existingListing.id)
                            .select()
                            .single();
                          
                          if (updateError) throw updateError;
                          finalListing = updatedListing;
                        } else {
                          debugLog("[RELIST] Creating new listing");
                          // Create new listing
                          const { data: newListing, error: listingError } = await supabase
                            .from("listings")
                            .insert({
                              user_id: user!.id,
                              inventory_item_id: item.id,
                              type: formData.for_auction ? "auction" : "buy_now",
                              title: displayTitle,
                              issue_number: formData.issue_number || null,
                              volume_name: formData.series || null,
                              price_cents: priceInCents,
                              shipping_price: shippingInDollars,
                              image_url: item.images?.primary || null,
                              status: "active",
                              details: formData.details || null,
                              condition_notes: formData.condition || null,
                            })
                            .select()
                            .single();
                          
                          if (listingError) throw listingError;
                          finalListing = newListing;
                        }
                        
                        debugLog("[RELIST] Success! Listing ID:", finalListing.id);
                        toast.success(existingListing ? "Item relisted successfully!" : "Listing created successfully!");
                        setActiveListing(finalListing);
                        navigate(`/listing/${finalListing.id}`);
                      } catch (error: any) {
                        console.error("[RELIST] Error:", error);
                        toast.error(error.message || "Failed to create listing");
                      } finally {
                        setSaving(false);
                      }
                    }}
                    size="lg"
                  >
                    Create Live Listing
                  </Button>
                ) : null}
              </div>
            </div>
            </div>
          </div>
        </div>

        <MarkSoldOffPlatformModal
          open={markSoldModalOpen}
          onOpenChange={setMarkSoldModalOpen}
          itemId={item.id}
          itemTitle={getDisplayTitle()}
          onSuccess={fetchItem}
        />
      </main>
    );
  }
