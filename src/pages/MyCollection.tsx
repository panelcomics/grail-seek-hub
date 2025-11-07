import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, Trash2, Loader2, Edit2 } from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useNavigate } from "react-router-dom";
import { formatComicDisplay } from "@/lib/comics/format";
import { getComicCoverImage, getComicImageUrl } from "@/lib/comicImages";
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
  volume_name: string | null;
  cover_date: string | null;
  image_url: string | null;
  condition_notes: string | null;
  details: string | null;
  added_at: string;
  ocr_text: string | null;
  source: string | null;
  coverImageUrl?: string; // From user_comic_images table
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
  const [editForm, setEditForm] = useState({
    title: "",
    issue_number: "",
    volume_name: "",
    cover_date: "",
    condition_notes: "",
    details: "",
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
          comic.volume_name?.toLowerCase().includes(search.toLowerCase())
      );
      setFilteredComics(filtered);
    } else {
      setFilteredComics(comics);
    }
  }, [search, comics]);

  const fetchComics = async () => {
    try {
      const { data, error } = await supabase
        .from("user_comics")
        .select("*")
        .order("added_at", { ascending: false });

      if (error) throw error;

      // Fetch cover images for all comics
      const comicsWithCovers = await Promise.all(
        (data || []).map(async (comic) => {
          try {
            const coverImage = await getComicCoverImage(comic.id);
            return {
              ...comic,
              coverImageUrl: coverImage ? getComicImageUrl(coverImage.storage_path) : null,
            };
          } catch (err) {
            console.error(`Failed to load cover for comic ${comic.id}:`, err);
            return comic;
          }
        })
      );

      setComics(comicsWithCovers);
      setFilteredComics(comicsWithCovers);
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
      const { error } = await supabase.from("user_comics").delete().eq("id", deleteId);

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
    setEditForm({
      title: comic.title,
      issue_number: comic.issue_number || "",
      volume_name: comic.volume_name || "",
      cover_date: comic.cover_date || "",
      condition_notes: comic.condition_notes || "",
      details: comic.details || "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingComic) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("user_comics")
        .update({
          title: editForm.title,
          issue_number: editForm.issue_number || null,
          volume_name: editForm.volume_name || null,
          cover_date: editForm.cover_date || null,
          condition_notes: editForm.condition_notes || null,
          details: editForm.details || null,
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
          ? { ...c, ...editForm }
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
                const { mainTitle } = formatComicDisplay({
                  volume: { name: comic.volume_name },
                  title: comic.title,
                  issue_number: comic.issue_number,
                  cover_date: comic.cover_date,
                });

                return (
                <Card 
                  key={comic.id} 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/sell/${comic.id}`)}
                >
                  <CardContent className="pt-6">
                    <div className="flex gap-4">
                      {(comic.coverImageUrl || comic.image_url) && (
                        <img
                          src={comic.coverImageUrl || comic.image_url}
                          alt={mainTitle}
                          className="w-20 h-28 object-cover rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base mb-2">
                          <strong>{mainTitle}</strong>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Comic Details</DialogTitle>
            <DialogDescription>
              Update the information for this comic in your collection.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
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
              <Label htmlFor="volume">Volume Name</Label>
              <Input
                id="volume"
                value={editForm.volume_name}
                onChange={(e) => setEditForm({ ...editForm, volume_name: e.target.value })}
                placeholder="Volume 1"
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
              <Label htmlFor="notes">Condition Notes</Label>
              <Textarea
                id="notes"
                value={editForm.condition_notes}
                onChange={(e) => setEditForm({ ...editForm, condition_notes: e.target.value })}
                placeholder="e.g. Minor spine ticks, CGC 9.8"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
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
