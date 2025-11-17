import { useState } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { X, Star, Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { uploadViaProxy } from "@/lib/uploadImage";

interface ListingImage {
  id: string;
  url: string;
  thumbnail_url?: string;
  is_primary: boolean;
  sort_order: number;
}

interface ImageManagementProps {
  listingId: string;
  images: ListingImage[];
  onImagesChange: () => void;
  maxImages?: number;
}

export function ImageManagement({ 
  listingId, 
  images, 
  onImagesChange,
  maxImages = 8 
}: ImageManagementProps) {
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > maxImages) {
      toast.error(`Max ${maxImages} photos per book. Please remove another photo before adding more.`);
      return;
    }

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const { publicUrl, previewUrl } = await uploadViaProxy(file);
        
        const { error } = await supabase.from("listing_images").insert({
          listing_id: listingId,
          url: publicUrl,
          thumbnail_url: previewUrl || publicUrl,
          is_primary: images.length === 0, // First image is primary
          sort_order: images.length,
        });

        if (error) throw error;
      }
      
      toast.success("Photos added successfully");
      onImagesChange();
    } catch (error: any) {
      console.error("Error uploading images:", error);
      toast.error(error.message || "Failed to upload photos");
    } finally {
      setUploading(false);
    }
  };

  const handleSetPrimary = async (imageId: string) => {
    try {
      const { error } = await supabase
        .from("listing_images")
        .update({ is_primary: true })
        .eq("id", imageId);

      if (error) throw error;
      
      toast.success("Primary image updated");
      onImagesChange();
    } catch (error: any) {
      console.error("Error setting primary image:", error);
      toast.error("Failed to update primary image");
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (images.length <= 1) {
      toast.error("Cannot delete the last image");
      return;
    }

    try {
      const { error } = await supabase
        .from("listing_images")
        .delete()
        .eq("id", imageId);

      if (error) throw error;
      
      toast.success("Photo deleted");
      onImagesChange();
    } catch (error: any) {
      console.error("Error deleting image:", error);
      toast.error("Failed to delete photo");
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {images.map((image) => (
          <Card key={image.id} className="relative p-2">
            <img
              src={image.thumbnail_url || image.url}
              alt="Comic book"
              className="w-full aspect-square object-cover rounded"
            />
            {image.is_primary && (
              <div className="absolute top-3 left-3 bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
                <Star className="h-3 w-3 fill-current" />
                Primary
              </div>
            )}
            <div className="flex gap-2 mt-2">
              {!image.is_primary && (
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleSetPrimary(image.id)}
                >
                  Set as Main
                </Button>
              )}
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleDeleteImage(image.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {images.length < maxImages && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            disabled={uploading}
            onClick={() => document.getElementById(`file-upload-${listingId}`)?.click()}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Add More Photos ({images.length}/{maxImages})
              </>
            )}
          </Button>
          <input
            id={`file-upload-${listingId}`}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}
    </div>
  );
}
