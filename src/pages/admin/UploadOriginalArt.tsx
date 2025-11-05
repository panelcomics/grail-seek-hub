import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2 } from "lucide-react";

const UploadOriginalArt = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: "",
    artistName: "",
    description: "",
    dateCreated: "",
    medium: "",
    dimensions: "",
    tags: "",
    forSale: false,
    price: "",
    provenance: "",
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Image must be less than 10MB",
        variant: "destructive",
      });
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!imageFile || !formData.title || !formData.artistName) {
      toast({
        title: "Validation Error",
        description: "Image, title, and artist name are required",
        variant: "destructive",
      });
      return;
    }

    if (formData.forSale && !formData.price) {
      toast({
        title: "Validation Error",
        description: "Price is required when item is for sale",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }

      const uploadFormData = new FormData();
      uploadFormData.append("image", imageFile);
      uploadFormData.append("title", formData.title);
      uploadFormData.append("artistName", formData.artistName);
      if (formData.description) uploadFormData.append("description", formData.description);
      if (formData.dateCreated) uploadFormData.append("dateCreated", formData.dateCreated);
      if (formData.medium) uploadFormData.append("medium", formData.medium);
      if (formData.dimensions) uploadFormData.append("dimensions", formData.dimensions);
      if (formData.tags) uploadFormData.append("tags", formData.tags);
      uploadFormData.append("forSale", formData.forSale.toString());
      if (formData.price) uploadFormData.append("price", formData.price);
      if (formData.provenance) uploadFormData.append("provenance", formData.provenance);
      uploadFormData.append("visibility", "private");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-original-art`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: uploadFormData,
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload");
      }

      toast({
        title: "Success",
        description: "Original art uploaded successfully",
      });

      navigate("/admin/original-art/manage");
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload art",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-4xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Upload Original Art</CardTitle>
          <CardDescription>Add a new original art piece to the collection (Beta)</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Image Upload */}
            <div className="space-y-2">
              <Label htmlFor="image">Image *</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="image"
                  type="file"
                  accept="image/jpeg,image/png,image/jpg"
                  onChange={handleImageChange}
                  required
                />
                {imagePreview && (
                  <img src={imagePreview} alt="Preview" className="h-20 w-20 object-cover rounded" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">Max 10MB, JPG or PNG</p>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            {/* Artist Name */}
            <div className="space-y-2">
              <Label htmlFor="artistName">Artist Name *</Label>
              <Input
                id="artistName"
                value={formData.artistName}
                onChange={(e) => setFormData({ ...formData, artistName: e.target.value })}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
              />
            </div>

            {/* Date Created */}
            <div className="space-y-2">
              <Label htmlFor="dateCreated">Date Created</Label>
              <Input
                id="dateCreated"
                type="date"
                value={formData.dateCreated}
                onChange={(e) => setFormData({ ...formData, dateCreated: e.target.value })}
              />
            </div>

            {/* Medium */}
            <div className="space-y-2">
              <Label htmlFor="medium">Medium</Label>
              <Input
                id="medium"
                placeholder="e.g., Ink on bristol"
                value={formData.medium}
                onChange={(e) => setFormData({ ...formData, medium: e.target.value })}
              />
            </div>

            {/* Dimensions */}
            <div className="space-y-2">
              <Label htmlFor="dimensions">Dimensions</Label>
              <Input
                id="dimensions"
                placeholder="e.g., 11x17 in"
                value={formData.dimensions}
                onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                placeholder="Comma-separated tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              />
            </div>

            {/* Provenance */}
            <div className="space-y-2">
              <Label htmlFor="provenance">Provenance</Label>
              <Textarea
                id="provenance"
                value={formData.provenance}
                onChange={(e) => setFormData({ ...formData, provenance: e.target.value })}
                rows={3}
              />
            </div>

            {/* For Sale Toggle */}
            <div className="flex items-center space-x-2">
              <Switch
                id="forSale"
                checked={formData.forSale}
                onCheckedChange={(checked) => setFormData({ ...formData, forSale: checked })}
              />
              <Label htmlFor="forSale">For Sale</Label>
            </div>

            {/* Price (shown only if forSale) */}
            {formData.forSale && (
              <div className="space-y-2">
                <Label htmlFor="price">Price *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required={formData.forSale}
                />
              </div>
            )}

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Art
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate("/admin/original-art/manage")}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default UploadOriginalArt;
