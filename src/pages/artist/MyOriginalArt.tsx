import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2, Edit, AlertCircle } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface OriginalArt {
  id: string;
  created_at: string;
  updated_at: string;
  image_url: string;
  title: string;
  artist_name: string;
  description: string | null;
  date_created: string | null;
  medium: string | null;
  dimensions: string | null;
  tags: string[] | null;
  for_sale: boolean;
  price: number | null;
  provenance: string | null;
  visibility: string;
}

const MyOriginalArt = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<OriginalArt[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [editItem, setEditItem] = useState<OriginalArt | null>(null);
  const [removalRequest, setRemovalRequest] = useState<{ id: string; reason: string } | null>(null);
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

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/artist-original-art`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch items");
      }

      const data = await response.json();
      setItems(data.items || []);
    } catch (error) {
      console.error("Fetch error:", error);
      toast({
        title: "Error",
        description: "Failed to load your art items",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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

  const handleUpload = async (e: React.FormEvent) => {
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

    setUploading(true);

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

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/artist-original-art`,
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

      setShowUpload(false);
      resetForm();
      fetchItems();
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload art",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editItem) return;

    if (editItem.for_sale && !editItem.price) {
      toast({
        title: "Validation Error",
        description: "Price is required when item is for sale",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/artist-original-art/${editItem.id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: editItem.title,
            artist_name: editItem.artist_name,
            description: editItem.description,
            date_created: editItem.date_created,
            medium: editItem.medium,
            dimensions: editItem.dimensions,
            tags: editItem.tags,
            for_sale: editItem.for_sale,
            price: editItem.price,
            provenance: editItem.provenance,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update item");
      }

      const updated = await response.json();
      setItems(items.map((item) => (item.id === updated.id ? updated : item)));
      setEditItem(null);

      toast({
        title: "Success",
        description: "Original art updated successfully",
      });
    } catch (error) {
      console.error("Update error:", error);
      toast({
        title: "Error",
        description: "Failed to update art item",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRequestRemoval = async () => {
    if (!removalRequest) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/request-art-removal`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            artId: removalRequest.id,
            reason: removalRequest.reason,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to request removal");
      }

      toast({
        title: "Request Sent",
        description: "Your removal request has been sent to the admin",
      });

      setRemovalRequest(null);
    } catch (error) {
      console.error("Removal request error:", error);
      toast({
        title: "Error",
        description: "Failed to send removal request",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
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
    setImageFile(null);
    setImagePreview(null);
  };

  return (
    <div className="container py-8">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>My Original Art</CardTitle>
            <Button onClick={() => setShowUpload(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Upload New
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading...</p>
          ) : items.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No items yet. Upload your first piece!
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>For Sale</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="h-12 w-12 object-cover rounded"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{item.title}</TableCell>
                    <TableCell>
                      <Badge variant={item.for_sale ? "default" : "secondary"}>
                        {item.for_sale ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.price ? `$${item.price}` : "-"}</TableCell>
                    <TableCell>
                      <Badge variant={item.visibility === "public" ? "default" : "outline"}>
                        {item.visibility}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(item.updated_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditItem(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setRemovalRequest({ id: item.id, reason: "" })}
                        >
                          <AlertCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Upload Sheet */}
      <Sheet open={showUpload} onOpenChange={setShowUpload}>
        <SheetContent className="overflow-y-auto max-w-2xl">
          <SheetHeader>
            <SheetTitle>Upload Original Art</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleUpload} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="image">Image *</Label>
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

            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="artistName">Artist Name *</Label>
              <Input
                id="artistName"
                value={formData.artistName}
                onChange={(e) => setFormData({ ...formData, artistName: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateCreated">Date Created</Label>
              <Input
                id="dateCreated"
                type="date"
                value={formData.dateCreated}
                onChange={(e) => setFormData({ ...formData, dateCreated: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="medium">Medium</Label>
              <Input
                id="medium"
                placeholder="e.g., Ink on bristol"
                value={formData.medium}
                onChange={(e) => setFormData({ ...formData, medium: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dimensions">Dimensions</Label>
              <Input
                id="dimensions"
                placeholder="e.g., 11x17 in"
                value={formData.dimensions}
                onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                placeholder="Comma-separated tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="provenance">Provenance</Label>
              <Textarea
                id="provenance"
                value={formData.provenance}
                onChange={(e) => setFormData({ ...formData, provenance: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="forSale"
                checked={formData.forSale}
                onCheckedChange={(checked) => setFormData({ ...formData, forSale: checked })}
              />
              <Label htmlFor="forSale">For Sale</Label>
            </div>

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

            <Button type="submit" disabled={uploading} className="w-full">
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Upload Art"
              )}
            </Button>
          </form>
        </SheetContent>
      </Sheet>

      {/* Edit Sheet */}
      <Sheet open={!!editItem} onOpenChange={() => setEditItem(null)}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Original Art</SheetTitle>
          </SheetHeader>
          {editItem && (
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={editItem.title}
                  onChange={(e) => setEditItem({ ...editItem, title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Artist Name</Label>
                <Input
                  value={editItem.artist_name}
                  onChange={(e) => setEditItem({ ...editItem, artist_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editItem.description || ""}
                  onChange={(e) => setEditItem({ ...editItem, description: e.target.value })}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={editItem.for_sale}
                  onCheckedChange={(checked) => setEditItem({ ...editItem, for_sale: checked })}
                />
                <Label>For Sale</Label>
              </div>

              {editItem.for_sale && (
                <div className="space-y-2">
                  <Label>Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editItem.price || ""}
                    onChange={(e) =>
                      setEditItem({ ...editItem, price: parseFloat(e.target.value) })
                    }
                  />
                </div>
              )}

              <Button onClick={handleUpdate} disabled={saving} className="w-full">
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Removal Request Dialog */}
      <AlertDialog open={!!removalRequest} onOpenChange={() => setRemovalRequest(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Request Removal</AlertDialogTitle>
            <AlertDialogDescription>
              Tell the admin why you want to remove this item
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Reason for removal..."
            value={removalRequest?.reason || ""}
            onChange={(e) =>
              setRemovalRequest(removalRequest ? { ...removalRequest, reason: e.target.value } : null)
            }
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRequestRemoval}>Send Request</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MyOriginalArt;
