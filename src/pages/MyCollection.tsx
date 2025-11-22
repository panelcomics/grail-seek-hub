import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, Trash2, Loader2, Edit2 } from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useNavigate } from "react-router-dom";
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
  is_slab?: boolean;
  cgc_grade?: string | null;
  grading_company?: string | null;
  certification_number?: string | null;
  writer?: string | null;
  artist?: string | null;
}

const MyCollection = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [comics, setComics] = useState<Comic[]>([]);
  const [filteredComics, setFilteredComics] = useState<Comic[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {filteredComics.map((comic) => {
                return (
                <Card 
                  key={comic.id} 
                  className="cursor-pointer hover:shadow-lg transition-shadow bg-white border border-border"
                  onClick={() => navigate(`/inventory/${comic.id}`)}
                >
                  <CardContent className="pt-4 pb-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                      {comic.image_url && (
                        <img
                          src={comic.image_url}
                          alt={comic.title}
                          className="w-full sm:w-24 h-32 sm:h-36 object-contain rounded flex-shrink-0 mx-auto sm:mx-0"
                        />
                      )}
                      <div className="flex-1 min-w-0 space-y-2">
                        <CardTitle className="text-sm sm:text-base line-clamp-2">
                          <span className="font-bold">{comic.title}</span>
                          {comic.issue_number && <span className="font-bold"> #{comic.issue_number}</span>}
                        </CardTitle>
                        {comic.cover_date && (
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">
                            {new Date(comic.cover_date).toLocaleDateString()}
                          </p>
                        )}
                        {comic.details && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {comic.details}
                          </p>
                        )}
                        {/* Show grading company + grade for slabs, otherwise show condition */}
                        {comic.is_slab && comic.cgc_grade ? (
                          <div className="space-y-1">
                            <div className="text-xs sm:text-sm font-bold text-primary truncate">
                              {comic.grading_company || "CGC"} {comic.cgc_grade}
                            </div>
                            {comic.certification_number && (
                              <div className="text-xs text-muted-foreground truncate">
                                Cert #{comic.certification_number}
                              </div>
                            )}
                          </div>
                        ) : comic.condition_notes ? (
                          <p className="text-xs text-muted-foreground italic line-clamp-1">
                            {comic.condition_notes}
                          </p>
                        ) : null}
                        <div className="flex gap-2 pt-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-0 h-auto hover:bg-transparent"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/inventory/${comic.id}`);
                            }}
                          >
                            <Edit2 className="h-4 w-4 text-primary" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-0 h-auto hover:bg-transparent"
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
      </div>
    </ProtectedRoute>
  );
};

export default MyCollection;
