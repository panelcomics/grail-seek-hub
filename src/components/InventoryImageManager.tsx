import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Trash2, Star } from "lucide-react";

interface ImageData {
  primary: string | null;
  others: string[];
}

interface Props {
  inventoryItemId: string;
  images: ImageData;
  onImagesChange: () => Promise<void>;
  maxImages?: number;
}

export function InventoryImageManager({ 
  inventoryItemId, 
  images, 
  onImagesChange,
  maxImages = 8 
}: Props) {
  const [isUploading, setIsUploading] = useState(false);

  const allImages = [
    ...(images.primary ? [images.primary] : []),
    ...(images.others || [])
  ];

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;

    const currentCount = allImages.length;
    if (currentCount >= maxImages) {
      toast.error(`Maximum ${maxImages} images allowed`);
      return;
    }

    setIsUploading(true);
    try {
      const MAX_SIZE_MB = 10;
      const allowed = ["image/jpeg", "image/png", "image/webp"];

      const filesToUpload = Array.from(files).slice(0, maxImages - currentCount);
      const uploadedUrls: string[] = [];

      for (const file of filesToUpload) {
        if (!allowed.includes(file.type)) {
          toast.error(`Invalid file type: ${file.name}`);
          continue;
        }
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
          toast.error(`File too large: ${file.name} (max ${MAX_SIZE_MB}MB)`);
          continue;
        }

        // Upload to external Supabase storage
        const timestamp = Date.now();
        const filename = `${timestamp}-${file.name}`;
        const filePath = `inventory/${inventoryItemId}/${filename}`;

        const { data, error } = await supabase.storage
          .from("images")
          .upload(filePath, file);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from("images")
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }

      // Update inventory_items.images JSONB
      const updatedImages: ImageData = {
        primary: images.primary || uploadedUrls[0] || null,
        others: [
          ...(images.others || []),
          ...(images.primary ? uploadedUrls : uploadedUrls.slice(1))
        ]
      };

      const { error: updateError } = await supabase
        .from("inventory_items")
        .update({ images: updatedImages as any })
        .eq("id", inventoryItemId);

      if (updateError) throw updateError;

      await onImagesChange();
      toast.success(`Uploaded ${uploadedUrls.length} image(s)`);
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Failed to upload images");
    } finally {
      setIsUploading(false);
      e.target.value = ""; // Reset input
    }
  }

  async function handleSetPrimary(url: string) {
    try {
      const updatedImages: ImageData = {
        primary: url,
        others: allImages.filter(img => img !== url)
      };

      const { error } = await supabase
        .from("inventory_items")
        .update({ images: updatedImages as any })
        .eq("id", inventoryItemId);

      if (error) throw error;

      await onImagesChange();
      toast.success("Primary image updated");
    } catch (error) {
      console.error("Failed to set primary:", error);
      toast.error("Failed to set primary");
    }
  }

  async function handleDelete(url: string) {
    if (!confirm("Delete this image?")) return;

    try {
      const updatedImages: ImageData = {
        primary: images.primary === url ? (images.others?.[0] || null) : images.primary,
        others: allImages.filter(img => img !== url && img !== (images.primary === url ? images.others?.[0] : images.primary))
      };

      const { error } = await supabase
        .from("inventory_items")
        .update({ images: updatedImages as any })
        .eq("id", inventoryItemId);

      if (error) throw error;

      await onImagesChange();
      toast.success("Image deleted");
    } catch (error) {
      console.error("Failed to delete:", error);
      toast.error("Failed to delete image");
    }
  }

  return (
    <div className="space-y-4">
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        disabled={isUploading || allImages.length >= maxImages}
        className="block w-full text-sm text-foreground
          file:mr-4 file:py-2 file:px-4
          file:rounded file:border-0
          file:text-sm file:font-semibold
          file:bg-primary file:text-primary-foreground
          hover:file:bg-primary/90
          cursor-pointer disabled:opacity-50"
      />
      {isUploading && <p className="text-muted-foreground text-sm">Uploading…</p>}
      {allImages.length >= maxImages && (
        <p className="text-muted-foreground text-sm">Maximum {maxImages} images reached</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {allImages.map((url, idx) => (
          <div key={url} className="relative group">
            <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-muted">
              <img
                src={url}
                alt={`Photo ${idx + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {url === images.primary && (
                <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  Primary
                </div>
              )}
            </div>

            <div className="mt-2 flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSetPrimary(url)}
                disabled={url === images.primary}
                className="text-xs flex-1"
              >
                {url === images.primary ? "Primary ✓" : "Set as primary"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(url)}
                className="text-xs text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {allImages.length === 0 && !isUploading && (
        <p className="text-muted-foreground text-sm">No images yet. Upload some photos!</p>
      )}
    </div>
  );
}
