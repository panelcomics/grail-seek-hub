import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { externalSupabase } from "@/lib/externalSupabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Upload, CheckCircle } from "lucide-react";

interface InventoryItem {
  id: string;
  title: string;
  series: string;
  issue_number: string;
  images: any;
}

export function BulkPhotoUpload() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadItemsWithoutPhotos();
  }, []);

  async function loadItemsWithoutPhotos() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("inventory_items")
        .select("id, title, series, issue_number, images")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Filter items where images.primary is null or missing
      const itemsWithoutPhotos = data?.filter(item => {
        const images = item.images as any;
        return !images?.primary;
      }) || [];

      setItems(itemsWithoutPhotos);
    } catch (error) {
      console.error("Failed to load items:", error);
      toast.error("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }

  async function handleFileSelect(itemId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(prev => ({ ...prev, [itemId]: true }));

    try {
      const MAX_SIZE_MB = 10;
      const allowed = ["image/jpeg", "image/png", "image/webp"];

      if (!allowed.includes(file.type)) {
        toast.error("Invalid file type");
        return;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        toast.error(`File too large (max ${MAX_SIZE_MB}MB)`);
        return;
      }

      // Upload to external Supabase storage
      const timestamp = Date.now();
      const filename = `${timestamp}-${file.name}`;
      const filePath = `inventory/${itemId}/${filename}`;

      const { data, error } = await externalSupabase.storage
        .from("images")
        .upload(filePath, file);

      if (error) throw error;

      const { data: { publicUrl } } = externalSupabase.storage
        .from("images")
        .getPublicUrl(filePath);

      // Update inventory item with new image
      const { error: updateError } = await supabase
        .from("inventory_items")
        .update({ 
          images: { primary: publicUrl, others: [] }
        })
        .eq("id", itemId);

      if (updateError) throw updateError;

      setCompleted(prev => ({ ...prev, [itemId]: true }));
      toast.success("Photo uploaded successfully");

      // Remove from list
      setItems(prev => prev.filter(item => item.id !== itemId));
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Failed to upload photo");
    } finally {
      setUploading(prev => ({ ...prev, [itemId]: false }));
      e.target.value = "";
    }
  }

  if (loading) {
    return <div className="text-muted-foreground">Loading items without photos...</div>;
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <p className="text-foreground font-medium">All items have photos!</p>
        <p className="text-muted-foreground text-sm">No inventory items need photo uploads.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-muted/50 border border-border rounded-lg p-4">
        <h3 className="font-semibold text-foreground mb-2">Bulk Photo Upload</h3>
        <p className="text-sm text-muted-foreground">
          {items.length} item{items.length !== 1 ? "s" : ""} need photo{items.length !== 1 ? "s" : ""}. 
          Upload photos to restore your inventory thumbnails.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <div key={item.id} className="border border-border rounded-lg p-4 space-y-3">
            <div>
              <h4 className="font-medium text-foreground line-clamp-1">
                {item.series || item.title || "Untitled"}
              </h4>
              {item.issue_number && (
                <p className="text-sm text-muted-foreground">Issue #{item.issue_number}</p>
              )}
            </div>

            <div className="aspect-[3/4] bg-muted rounded flex items-center justify-center">
              <Upload className="h-8 w-8 text-muted-foreground" />
            </div>

            <label className="block">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileSelect(item.id, e)}
                disabled={uploading[item.id] || completed[item.id]}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={uploading[item.id] || completed[item.id]}
                onClick={(e) => {
                  e.preventDefault();
                  (e.currentTarget.previousElementSibling as HTMLInputElement)?.click();
                }}
              >
                {uploading[item.id] ? (
                  "Uploading..."
                ) : completed[item.id] ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Uploaded
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Photo
                  </>
                )}
              </Button>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
