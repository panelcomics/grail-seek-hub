import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, Trash2, Loader2, Edit2 } from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useNavigate } from "react-router-dom";
import { formatComicDisplay } from "@/lib/comics/format";
import { getComicCoverImage, getComicImageUrl } from "@/lib/comicImages";
import { ImageManagement } from "@/components/ImageManagement";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

interface Comic {
  id: string;
  title: string;
  issue_number: string | null;
  series: string | null;
  cover_date: string | null;
  image_url: string | null;
  condition_notes: string | null;
  details: string | null;
  added_at: string;
  created_at: string;
  images?: { front?: string };
  condition?: string | null;
  publisher?: string | null;
  year?: number | null;
  grade?: string | null;
  variant_type?: string | null;
  variant_details?: string | null;
  variant_notes?: string | null;
  is_key?: boolean;
  key_type?: string | null;
}

const MyCollection = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [comics, setComics] = useState<Comic[]>([]);
  const [filteredComics, setFilteredComics] = useState<Comic[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingComic, setEditingComic] = useState<Comic | null>(null);
  const [listingImages, setListingImages] = useState<any[]>([]);
  const [editForm, setEditForm] = useState({
    title: "",
    issue_number: "",
    volume_name: "",
    publisher: "",
    year: "",
    cover_date: "",
    condition_notes: "",
    details: "",
    variant_type: "",
    variant_details: "",
    variant_notes: "",
    is_key: false,
    key_type: "",
    writer: "",
    artist: "",
    cgc_grade: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchComics();
  }, []);

  useEffect(() => {
    if (search) {
      const filtered = comics.filter(
        (comic) =>
          comic.title.toLowerCase().includes(search.toLowerCase()) ||
          comic.issue_number?.toLowerCase().includes(search.toLowerCase()) ||
          comic.series?.toLowerCase().includes(search.toLowerCase()) ||
          comic.details?.toLowerCase().includes(search.toLowerCase())
      );
      setFilteredComics(filtered);
    } else {
      setFilteredComics(comics);
    }
  }, [search, comics]);

  const fetchListingImages = async (listingId: string) => {
    try {
      const { data, error } = await supabase
        .from("listing_images")
        .select("*")
        .eq("listing_id", listingId)
        .order("sort_order");
      
      if (error) throw error;
      setListingImages(data || []);
    } catch (error) {
      console.error("Error fetching images:", error);
    }
  };

  const fetchComics = async () => {
    try {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Map inventory_items to have image from images.front
      const comicsWithImages = (data || []).map((item) => ({
        ...item,
        image_url: (item.images as any)?.front || null,
        // Map fields for compatibility
        added_at: item.created_at,
        condition_notes: item.condition,
        series: item.series,
      }));

      setComics(comicsWithImages as Comic[]);
      setFilteredComics(comicsWithImages as Comic[]);
    } catch (error) {
      console.error("Error fetching comics:", error);
      toast({
        title: "Error",
        description: "Failed to load your collection",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase.from("inventory_items").delete().eq("id", deleteId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Comic removed from collection",
      });

      setComics(comics.filter((c) => c.id !== deleteId));
      setDeleteId(null);
    } catch (error) {
      console.error("Error deleting comic:", error);
      toast({
        title: "Error",
        description: "Failed to remove comic",
        variant: "destructive",
      });
    }
  };

  const handleEditClick = (comic: Comic, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingComic(comic);
    fetchListingImages(comic.id); // Load images for this listing
    setEditForm({
      title: comic.title,
      issue_number: comic.issue_number || "",
      volume_name: comic.series || "",
      publisher: comic.publisher || "",
      year: comic.year?.toString() || "",
      cover_date: comic.cover_date || "",
      condition_notes: comic.condition_notes || "",
      details: comic.details || "",
      variant_type: comic.variant_type || "",
      variant_details: comic.variant_details || "",
      variant_notes: comic.variant_notes || "",
      is_key: comic.is_key || false,
      key_type: comic.key_type || "",
      writer: (comic as any).writer || "",
      artist: (comic as any).artist || "",
      cgc_grade: (comic as any).cgc_grade || "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingComic) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("inventory_items")
        .update({
          title: editForm.title,
          issue_number: editForm.issue_number || null,
          series: editForm.volume_name || null,
          publisher: editForm.publisher || null,
          year: editForm.year ? parseInt(editForm.year) : null,
          cover_date: editForm.cover_date || null,
          condition: editForm.condition_notes || null,
          details: editForm.details || null,
          variant_type: editForm.variant_type || null,
          variant_details: editForm.variant_details || null,
          variant_notes: editForm.variant_notes || null,
          is_key: editForm.is_key,
          key_type: editForm.is_key ? (editForm.key_type || null) : null,
          writer: editForm.writer || null,
          artist: editForm.artist || null,
          cgc_grade: editForm.cgc_grade || null,
        })
        .eq("id", editingComic.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Comic updated successfully",
      });

      // Update local state
      setComics(comics.map((c) => 
        c.id === editingComic.id 
          ? { 
              ...c, 
              title: editForm.title,
              issue_number: editForm.issue_number || null,
              series: editForm.volume_name || null,
              publisher: editForm.publisher || null,
              year: editForm.year ? parseInt(editForm.year) : null,
              cover_date: editForm.cover_date || null,
              condition_notes: editForm.condition_notes || null,
              details: editForm.details || null,
              variant_type: editForm.variant_type || null,
              variant_details: editForm.variant_details || null,
              variant_notes: editForm.variant_notes || null,
              is_key: editForm.is_key,
              key_type: editForm.is_key ? (editForm.key_type || null) : null,
            }
          : c
      ));
      setEditingComic(null);
      fetchComics(); // Refresh to get latest data
    } catch (error) {
      console.error("Error updating comic:", error);
      toast({
        title: "Error",
        description: "Failed to update comic",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="container py-8">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>My Collection</CardTitle>
            <Button onClick={() => navigate("/scanner")}>Scan New Comic</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search your collection..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {filteredComics.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {search
                  ? "No comics found matching your search"
                  : "Your collection is empty. Scan a comic to get started!"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredComics.map((comic) => {
                return (
                <Card 
                  key={comic.id} 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/sell/${comic.id}`)}
                >
                  <CardContent className="pt-6">
                    <div className="flex gap-4">
                      {comic.image_url && (
                        <img
                          src={comic.image_url}
                          alt={comic.title}
                          className="w-20 h-28 object-cover rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base mb-2">
                          <span className="font-bold">{comic.title}</span>
                          {comic.issue_number && <span className="font-bold"> #{comic.issue_number}</span>}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground" style={{ marginTop: "4px" }}>
                          {comic.cover_date && new Date(comic.cover_date).toLocaleDateString()}
                        </p>
                        {comic.details && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {comic.details.length > 60 ? `${comic.details.substring(0, 60)}...` : comic.details}
                          </p>
                        )}
                        {comic.condition_notes && (
                          <p className="text-xs text-muted-foreground mt-2 italic">
                            {comic.condition_notes}
                          </p>
                        )}
                        <div className="flex gap-2 mt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-0 h-auto"
                            onClick={(e) => handleEditClick(comic, e)}
                          >
                            <Edit2 className="h-4 w-4 text-primary" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-0 h-auto"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteId(comic.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from collection?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this comic from your collection.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!editingComic} onOpenChange={() => setEditingComic(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Comic Details</DialogTitle>
            <DialogDescription>
              Update the information for this comic in your collection.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 px-1">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                placeholder="Comic title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="issue">Issue Number</Label>
              <Input
                id="issue"
                value={editForm.issue_number}
                onChange={(e) => setEditForm({ ...editForm, issue_number: e.target.value })}
                placeholder="#1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="volume">Series Name (optional)</Label>
              <Input
                id="volume"
                value={editForm.volume_name}
                onChange={(e) => setEditForm({ ...editForm, volume_name: e.target.value })}
                placeholder="Leave empty unless different from title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="publisher">Publisher</Label>
              <Input
                id="publisher"
                value={editForm.publisher}
                onChange={(e) => setEditForm({ ...editForm, publisher: e.target.value })}
                placeholder="Marvel Comics"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                type="number"
                value={editForm.year}
                onChange={(e) => setEditForm({ ...editForm, year: e.target.value })}
                placeholder="1984"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Cover Date</Label>
              <Input
                id="date"
                type="date"
                value={editForm.cover_date}
                onChange={(e) => setEditForm({ ...editForm, cover_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="writer">Writer</Label>
              <Input
                id="writer"
                value={editForm.writer}
                onChange={(e) => setEditForm({ ...editForm, writer: e.target.value })}
                placeholder="e.g., Stan Lee"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="artist">Artist</Label>
              <Input
                id="artist"
                value={editForm.artist}
                onChange={(e) => setEditForm({ ...editForm, artist: e.target.value })}
                placeholder="e.g., Jack Kirby"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cgc_grade">CGC / Barcode / Cert # (Optional)</Label>
              <Input
                id="cgc_grade"
                value={editForm.cgc_grade}
                onChange={(e) => setEditForm({ ...editForm, cgc_grade: e.target.value })}
                placeholder="e.g., CGC cert number or barcode"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="details">Details / Significance</Label>
              <Textarea
                id="details"
                value={editForm.details}
                onChange={(e) => setEditForm({ ...editForm, details: e.target.value })}
                placeholder="e.g., 1st appearance of the black suit, key issue, variant, signed, etc."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="variant_type">Variant Type</Label>
              <Select value={editForm.variant_type} onValueChange={(value) => setEditForm({ ...editForm, variant_type: value })}>
                <SelectTrigger id="variant_type">
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
            <div className="space-y-2">
              <Label htmlFor="variant_details">Variant Details</Label>
              <Input
                id="variant_details"
                value={editForm.variant_details}
                onChange={(e) => setEditForm({ ...editForm, variant_details: e.target.value })}
                placeholder="e.g., Cover B, 1:25 ratio"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="variant_notes">Variant Notes</Label>
              <Textarea
                id="variant_notes"
                value={editForm.variant_notes}
                onChange={(e) => setEditForm({ ...editForm, variant_notes: e.target.value })}
                placeholder="e.g., Campbell Virgin Variant, Diamond Retailer Incentive"
                rows={2}
              />
            </div>
            <div className="space-y-4 pt-2 border-t">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_key"
                  checked={editForm.is_key}
                  onChange={(e) => setEditForm({ ...editForm, is_key: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="is_key" className="font-semibold cursor-pointer">
                  Key Issue
                </Label>
              </div>

              {editForm.is_key && (
                <div className="space-y-2">
                  <Label htmlFor="key_type">Key Type</Label>
                  <Select value={editForm.key_type} onValueChange={(value) => setEditForm({ ...editForm, key_type: value })}>
                    <SelectTrigger id="key_type">
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

            {/* Multi-Photo Management */}
            {editingComic && (
              <div className="space-y-3 pt-6 border-t">
                <Label className="text-base font-semibold">Photos</Label>
                <p className="text-sm text-muted-foreground">
                  Manage photos for this comic (up to 8 images)
                </p>
                <ImageManagement
                  listingId={editingComic.id}
                  images={listingImages}
                  onImagesChange={() => fetchListingImages(editingComic.id)}
                  maxImages={8}
                />
              </div>
            )}
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEditingComic(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving || !editForm.title}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </ProtectedRoute>
  );
};

export default MyCollection;
