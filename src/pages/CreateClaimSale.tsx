import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Loader2, MapPin, Wand2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const CreateClaimSale = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingRules, setIsGeneratingRules] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priceType: "2",
    customPrice: "",
    totalItems: "",
    startTime: new Date().toISOString().slice(0, 16),
    endTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    condition: "NM",
    category: "Marvel",
    city: "",
    state: "",
    zip: "",
    latitude: "",
    longitude: "",
    shippingTierId: "",
  });

  const [shippingTiers, setShippingTiers] = useState<Array<{
    id: string;
    tier_name: string;
    cost: number;
    min_items: number;
    max_items: number;
  }>>([]);

  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    if (!user) {
      toast.error("Please sign in to create a claim sale");
      navigate("/auth");
    } else {
      fetchShippingTiers();
    }
  }, [user, navigate]);

  const fetchShippingTiers = async () => {
    try {
      const { data, error } = await supabase
        .from("shipping_tiers")
        .select("*")
        .eq("seller_id", user?.id)
        .order("min_items", { ascending: true });

      if (error) throw error;
      setShippingTiers(data || []);
    } catch (error) {
      console.error("Error fetching shipping tiers:", error);
    }
  };

  // Update countdown preview
  useEffect(() => {
    const interval = setInterval(() => {
      const end = new Date(formData.endTime).getTime();
      const now = Date.now();
      const diff = end - now;
      
      if (diff <= 0) {
        setCountdown("Sale ended");
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setCountdown(`Sale ends in ${hours}h ${minutes}m`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [formData.endTime]);

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            latitude: position.coords.latitude.toString(),
            longitude: position.coords.longitude.toString(),
          }));
          toast.success("Location captured!");
        },
        (error) => {
          toast.error("Unable to get location: " + error.message);
        }
      );
    } else {
      toast.error("Geolocation is not supported by this browser");
    }
  };

  const handleGenerateRules = async () => {
    setIsGeneratingRules(true);
    try {
      const price = formData.priceType === "custom" ? formData.customPrice : formData.priceType;
      
      const { data, error } = await supabase.functions.invoke("generate-claim-rules", {
        body: {
          category: formData.category,
          condition: formData.condition,
          pricePerItem: price,
        },
      });

      if (error) throw error;
      
      setFormData(prev => ({ ...prev, description: data.rules }));
      toast.success("Rules generated!");
    } catch (error) {
      console.error("Error generating rules:", error);
      toast.error("Failed to generate rules");
    } finally {
      setIsGeneratingRules(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validate file sizes (max 2MB each)
    const validFiles = files.filter(file => {
      if (file.size > 2 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 2MB)`);
        return false;
      }
      return true;
    });

    // Limit to 30 images
    if (images.length + validFiles.length > 30) {
      toast.error("Maximum 30 images allowed");
      return;
    }

    setImages(prev => [...prev, ...validFiles]);
    
    // Create preview URLs
    validFiles.forEach(file => {
      const url = URL.createObjectURL(file);
      setImageUrls(prev => [...prev, url]);
    });
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imageUrls[index]);
    setImages(prev => prev.filter((_, i) => i !== index));
    setImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.title || !formData.description || !formData.totalItems) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (images.length === 0) {
      toast.error("Please upload at least one image");
      return;
    }

    if (new Date(formData.endTime) <= new Date(formData.startTime)) {
      toast.error("End time must be after start time");
      return;
    }

    if (!showPreview) {
      setShowPreview(true);
      return;
    }

    setIsSubmitting(true);
    
    try {
      const price = formData.priceType === "custom" 
        ? parseFloat(formData.customPrice) 
        : parseFloat(formData.priceType);

      // Create claim sale
      const { data: claimSale, error: saleError } = await supabase
        .from("claim_sales")
        .insert({
          title: formData.title,
          description: formData.description,
          price,
          total_items: parseInt(formData.totalItems),
          start_time: formData.startTime,
          end_time: formData.endTime,
          city: formData.city,
          state: formData.state,
          zip: formData.zip,
          latitude: formData.latitude ? parseFloat(formData.latitude) : null,
          longitude: formData.longitude ? parseFloat(formData.longitude) : null,
          status: new Date(formData.startTime) <= new Date() ? "open" : "upcoming",
          seller_id: user?.id,
          shipping_tier_id: formData.shippingTierId || null,
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Upload images and create items
      for (let i = 0; i < images.length; i++) {
        const file = images[i];
        const fileExt = file.name.split(".").pop();
        const fileName = `${user?.id}/${claimSale.id}/${Date.now()}_${i}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("claim-sale-images")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("claim-sale-images")
          .getPublicUrl(fileName);

        // Create item
        const { error: itemError } = await supabase
          .from("claim_sale_items")
          .insert({
            claim_sale_id: claimSale.id,
            title: `${formData.title} - Item ${i + 1}`,
            category: formData.category,
            condition: formData.condition,
            image_url: publicUrl,
            city: formData.city,
            state: formData.state,
            latitude: formData.latitude ? parseFloat(formData.latitude) : null,
            longitude: formData.longitude ? parseFloat(formData.longitude) : null,
          });

        if (itemError) throw itemError;
      }

      toast.success("Claim sale created successfully!");
      navigate(`/claim-sale/${claimSale.id}`);
    } catch (error) {
      console.error("Error creating claim sale:", error);
      toast.error("Failed to create claim sale");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showPreview) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Preview Your Claim Sale</CardTitle>
            <CardDescription>Review before publishing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">{formData.title}</h2>
              <p className="text-muted-foreground mt-2">{formData.description}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Price per Item</Label>
                <p className="text-lg font-semibold">
                  ${formData.priceType === "custom" ? formData.customPrice : formData.priceType}
                </p>
              </div>
              <div>
                <Label>Total Items</Label>
                <p className="text-lg font-semibold">{formData.totalItems}</p>
              </div>
              <div>
                <Label>Category</Label>
                <p>{formData.category}</p>
              </div>
              <div>
                <Label>Condition</Label>
                <p>{formData.condition}</p>
              </div>
              <div>
                <Label>Location</Label>
                <p>{formData.city}, {formData.state} {formData.zip}</p>
              </div>
              <div>
                <Label>Countdown</Label>
                <p className="text-primary font-semibold">{countdown}</p>
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Images ({images.length})</Label>
              <div className="grid grid-cols-4 gap-2">
                {imageUrls.map((url, idx) => (
                  <img
                    key={idx}
                    src={url}
                    alt={`Item ${idx + 1}`}
                    className="w-full h-24 object-cover rounded"
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPreview(false)}
                className="flex-1"
              >
                Edit
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  "Publish Now"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Create Claim Sale</CardTitle>
          <CardDescription>
            Set up your claim sale like Facebook claim sales
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., $2 Comic Bin"
                required
              />
            </div>

            {/* Description / Claim Rules */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label htmlFor="description">Claim Rules / Description * (max 500 chars)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateRules}
                  disabled={isGeneratingRules}
                >
                  {isGeneratingRules ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="mr-2 h-4 w-4" />
                  )}
                  Generate Rules
                </Button>
              </div>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value.slice(0, 500) }))}
                placeholder="First comment wins. Pay via PayPal/Venmo/Cash. Meet within 48h. No holds."
                rows={4}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formData.description.length}/500 characters
              </p>
            </div>

            {/* Price per Item */}
            <div>
              <Label>Price per Item *</Label>
              <RadioGroup
                value={formData.priceType}
                onValueChange={(value) => setFormData(prev => ({ ...prev, priceType: value }))}
                className="flex flex-wrap gap-4 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="2" id="price-2" />
                  <Label htmlFor="price-2" className="cursor-pointer">$2</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="5" id="price-5" />
                  <Label htmlFor="price-5" className="cursor-pointer">$5</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="custom" id="price-custom" />
                  <Label htmlFor="price-custom" className="cursor-pointer">Custom</Label>
                </div>
              </RadioGroup>
              {formData.priceType === "custom" && (
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.customPrice}
                  onChange={(e) => setFormData(prev => ({ ...prev, customPrice: e.target.value }))}
                  placeholder="Enter custom price"
                  className="mt-2 max-w-xs"
                  required
                />
              )}
            </div>

            {/* Total Items */}
            <div>
              <Label htmlFor="totalItems">Total Items (Lot Size) *</Label>
              <Input
                id="totalItems"
                type="number"
                min="1"
                value={formData.totalItems}
                onChange={(e) => setFormData(prev => ({ ...prev, totalItems: e.target.value }))}
                placeholder="e.g., 20"
                required
              />
            </div>

            {/* Time Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startTime">Start Time *</Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="endTime">End Time *</Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  value={formData.endTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-semibold text-primary">{countdown}</p>
            </div>

            {/* Condition & Category */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="condition">Condition *</Label>
                <Select value={formData.condition} onValueChange={(value) => setFormData(prev => ({ ...prev, condition: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="POOR">POOR</SelectItem>
                    <SelectItem value="FAIR">FAIR</SelectItem>
                    <SelectItem value="GOOD">GOOD</SelectItem>
                    <SelectItem value="VG">VG (Very Good)</SelectItem>
                    <SelectItem value="FN">FN (Fine)</SelectItem>
                    <SelectItem value="VF">VF (Very Fine)</SelectItem>
                    <SelectItem value="NM">NM (Near Mint)</SelectItem>
                    <SelectItem value="NM+">NM+ (Near Mint Plus)</SelectItem>
                    <SelectItem value="MINT">MINT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="category">Category *</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Marvel">Marvel</SelectItem>
                    <SelectItem value="DC">DC</SelectItem>
                    <SelectItem value="Image">Image</SelectItem>
                    <SelectItem value="Dark Horse">Dark Horse</SelectItem>
                    <SelectItem value="Indie">Indie</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Location */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Location *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGetLocation}
                >
                  <MapPin className="mr-2 h-4 w-4" />
                  Get My Location
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Input
                  placeholder="City"
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  required
                />
                <Input
                  placeholder="State"
                  value={formData.state}
                  onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                  required
                />
                <Input
                  placeholder="Zip"
                  value={formData.zip}
                  onChange={(e) => setFormData(prev => ({ ...prev, zip: e.target.value }))}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="Latitude (auto-fill)"
                  value={formData.latitude}
                  onChange={(e) => setFormData(prev => ({ ...prev, latitude: e.target.value }))}
                />
                <Input
                  placeholder="Longitude (auto-fill)"
                  value={formData.longitude}
                  onChange={(e) => setFormData(prev => ({ ...prev, longitude: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="shippingTier">Shipping Tier (Optional)</Label>
                <Select 
                  value={formData.shippingTierId} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, shippingTierId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No shipping tier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No shipping tier</SelectItem>
                    {shippingTiers.map((tier) => (
                      <SelectItem key={tier.id} value={tier.id}>
                        {tier.tier_name} - ${tier.cost.toFixed(2)} ({tier.min_items}-{tier.max_items} items)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {shippingTiers.length === 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    No shipping tiers configured. Add them in your <a href="/profile" className="underline">Profile</a>.
                  </p>
                )}
              </div>
            </div>

            {/* Image Upload */}
            <div>
              <Label>Images * (up to 30, max 2MB each)</Label>
              <div className="mt-2">
                <label htmlFor="images" className="cursor-pointer">
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary transition-colors">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {images.length}/30 images uploaded
                    </p>
                  </div>
                  <input
                    id="images"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              </div>

              {imageUrls.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mt-4">
                  {imageUrls.map((url, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={url}
                        alt={`Preview ${idx + 1}`}
                        className="w-full h-24 object-cover rounded"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  localStorage.setItem("claimSaleDraft", JSON.stringify(formData));
                  toast.success("Draft saved to browser");
                }}
                className="flex-1"
              >
                Save Draft
              </Button>
              <Button
                type="submit"
                className="flex-1"
              >
                Preview Sale
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateClaimSale;