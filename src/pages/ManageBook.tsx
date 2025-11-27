import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { InventoryImageManager } from "@/components/InventoryImageManager";
import { Separator } from "@/components/ui/separator";
import { MarkSoldOffPlatformModal } from "@/components/MarkSoldOffPlatformModal";
import { GRADE_OPTIONS } from "@/types/draftItem";
import { RotateCw, RotateCcw } from "lucide-react";
import { getRotationTransform, rotateLeft, rotateRight } from "@/lib/imageRotation";

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
      
      // Populate form
      setFormData({
        title: data.title || "",
        issue_number: data.issue_number || "",
        series: data.series || "",
        publisher: data.publisher || "",
        year: data.year?.toString() || "",
        cover_date: data.cover_date || "",
        condition: data.condition || "",
        details: data.details || "",
        variant_type: data.variant_type || "",
        variant_details: data.variant_details || "",
        variant_notes: data.variant_notes || "",
        is_key: data.is_key || false,
        key_type: data.key_type || "",
        writer: data.writer || "",
        artist: data.artist || "",
        cover_artist: data.cover_artist || "",
        is_slab: data.is_slab || false,
        cgc_grade: data.cgc_grade || "",
        grading_company: data.grading_company || "CGC",
        certification_number: data.certification_number || "",
        listed_price: data.listed_price?.toString() || "",
        shipping_price: data.shipping_price?.toString() || "",
        for_sale: data.for_sale || false,
        for_auction: data.for_auction || false,
        is_for_trade: data.is_for_trade || false,
        in_search_of: data.in_search_of || "",
        trade_notes: data.trade_notes || "",
        private_notes: data.private_notes || "",
        private_location: data.private_location || "",
      });
      
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

    console.log("[INVENTORY-SAVE] 🔍 START", {
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
        details: formData.details || null,
        variant_type: formData.variant_type || null,
        variant_details: formData.variant_details || null,
        variant_notes: formData.variant_notes || null,
        key_issue: formData.is_key,
        is_key: formData.is_key,
        key_details: formData.is_key ? formData.key_type : null,
        key_type: formData.is_key ? (formData.key_type || null) : null,
        writer: formData.writer || null,
        artist: formData.artist || null,
        cover_artist: formData.cover_artist || null,
        is_slab: formData.is_slab,
        grading_company: formData.is_slab ? formData.grading_company : null,
        cgc_grade: formData.is_slab ? formData.cgc_grade : null,
        grade: formData.is_slab ? formData.cgc_grade : null,
        certification_number: formData.certification_number || null,
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
        updated_at: new Date().toISOString(),
        // CRITICAL: DO NOT include 'images' field - it's managed separately
      };

      console.log("[INVENTORY-SAVE] 📝 Updating inventory_items ONLY (never touches listings)", {
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

      console.log("[INVENTORY-SAVE] ✅ inventory_items updated successfully");
      console.log("[INVENTORY-SAVE] ⚠️ This update NEVER creates or touches listings table");

      toast.success("Book updated successfully");
      
      // Refresh item data after save
      await fetchItem();
      await fetchActiveListing(item.id);
      console.log("[INVENTORY-SAVE] 🔍 COMPLETE");
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
      <main className="flex-1 container py-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
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
    <main className="flex-1 container py-8">
      <div className="max-w-6xl mx-auto space-y-6">
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
                    <Input
                      id="condition"
                      value={formData.condition}
                      onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                      placeholder="VG, FN, NM, etc."
                    />
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
                      <Input
                        id="key_type"
                        value={formData.key_type}
                        onChange={(e) => setFormData({ ...formData, key_type: e.target.value })}
                        placeholder="1st appearance, origin story, death, etc."
                      />
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
                          <SelectContent>
                            <SelectItem value="CGC">CGC</SelectItem>
                            <SelectItem value="CBCS">CBCS</SelectItem>
                            <SelectItem value="PGX">PGX</SelectItem>
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
                      if (!formData.listed_price || parseFloat(formData.listed_price) <= 0) {
                        toast.error("Please set a sale price before listing");
                        return;
                      }
                      
                      try {
                        setSaving(true);
                        
                        const priceInCents = Math.round(parseFloat(formData.listed_price) * 100);
                        const shippingInDollars = formData.shipping_price ? parseFloat(formData.shipping_price) : 0;
                        
                        // Create listing with image from inventory
                        const { data: newListing, error: listingError } = await supabase
                          .from("listings")
                          .insert({
                            user_id: user!.id,
                            inventory_item_id: item.id,
                            type: formData.for_auction ? "auction" : "buy_now",
                            title: formData.title || formData.series,
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
                        
                        toast.success("Listing created successfully!");
                        setActiveListing(newListing);
                        navigate(`/listing/${newListing.id}`);
                      } catch (error: any) {
                        console.error("Error creating listing:", error);
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
