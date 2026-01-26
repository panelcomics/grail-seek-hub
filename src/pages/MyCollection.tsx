import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Search, Trash2, Loader2, Edit2 } from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useNavigate } from "react-router-dom";
import { getRotationTransform } from "@/lib/imageRotation";
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
  key_details?: string | null;
  is_slab?: boolean;
  cgc_grade?: string | null;
  grading_company?: string | null;
  certification_number?: string | null;
  writer?: string | null;
  artist?: string | null;
  primary_image_rotation?: number | null;
  is_signed?: boolean;
  signature_type?: string | null;
  signed_by?: string | null;
  signature_date?: string | null;
}

const MyCollection = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
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
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("id, title, issue_number, series, cover_date, publisher, year, grade, condition, is_slab, cgc_grade, grading_company, certification_number, images, details, created_at, variant_type, variant_details, variant_notes, is_key, key_type, key_details, writer, artist, primary_image_rotation, is_signed, signature_type, signed_by, signature_date")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Map inventory_items to have image from unified JSONB structure {primary, others}
      // Also fallback to 'front' key for older scans saved with previous format
      const comicsWithImages = (data || []).map((item) => ({
        ...item,
        image_url: (item.images as any)?.primary || (item.images as any)?.front || null,
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
      <ProtectedRoute>
        <div className="container py-4 md:py-8 px-3 md:px-6">
          <Card>
            <CardHeader className="pb-3 md:pb-6">
              <div className="flex justify-between items-center">
                <Skeleton className="h-8 w-36" />
                <Skeleton className="h-10 w-36" />
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-full mb-6" />
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
                {[...Array(8)].map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <CardContent className="p-2 md:p-4">
                      <Skeleton className="aspect-[2/3] w-full rounded mb-2" />
                      <Skeleton className="h-4 w-3/4 mb-1" />
                      <Skeleton className="h-3 w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="container py-4 md:py-8 px-3 md:px-6">
      <Card>
        <CardHeader className="pb-3 md:pb-6">
          <div className="flex justify-between items-center gap-2">
            <CardTitle className="text-xl md:text-2xl">My Collection</CardTitle>
            <Button onClick={() => navigate("/scanner")} size="sm" className="md:size-default">
              Scan New Comic
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-3 md:px-6">
          <div className="mb-4 md:mb-6">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search your collection..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {filteredComics.length === 0 ? (
            <div className="text-center py-8 md:py-12">
              <p className="text-muted-foreground text-sm md:text-base">
                {search
                  ? "No comics found matching your search"
                  : "Your collection is empty. Scan a comic to get started!"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
              {filteredComics.map((comic) => {
                return (
                <Card 
                  key={comic.id} 
                  className="cursor-pointer hover:shadow-lg transition-shadow bg-white border border-border overflow-hidden"
                  onClick={() => navigate(`/inventory/${comic.id}`)}
                >
                  <CardContent className="p-2 md:p-4">
                    <div className="flex flex-col gap-2">
                      {comic.image_url && (
                        <img
                          src={comic.image_url}
                          alt={comic.title}
                          className="w-full aspect-[2/3] object-contain rounded flex-shrink-0 transition-transform duration-200"
                          style={{
                            transform: getRotationTransform(comic.primary_image_rotation)
                          }}
                        />
                      )}
                      <div className="flex-1 min-w-0 space-y-1">
                        <CardTitle className="text-xs md:text-sm line-clamp-2 leading-tight">
                          <span className="font-bold">{comic.title}</span>
                          {comic.issue_number && <span className="font-bold"> #{comic.issue_number}</span>}
                        </CardTitle>
                        {/* Subtitle: grade + signature + key */}
                        <p className="text-[10px] md:text-xs text-muted-foreground line-clamp-2">
                          {[
                            comic.is_slab && (comic.cgc_grade || comic.grade) ? `${comic.grading_company || 'CGC'} ${comic.cgc_grade || comic.grade}` : null,
                            comic.is_signed ? (comic.signature_type === 'CGC Signature Series' ? 'SS Signed' : 'Signed') + (comic.signed_by ? ` ${comic.signed_by}` : '') : null,
                            comic.key_details || (comic.is_key ? 'Key Issue' : null),
                          ].filter(Boolean).join(' • ') || comic.condition_notes}
                        </p>
                        {/* Badges row */}
                        <div className="flex flex-wrap gap-1">
                          {comic.is_slab && (comic.cgc_grade || comic.grade) && (
                            <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-secondary text-secondary-foreground">
                              {comic.grading_company || 'CGC'} {comic.cgc_grade || comic.grade}
                            </span>
                          )}
                          {comic.is_signed && (
                            <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-amber-500 text-white">
                              {comic.signature_type === 'CGC Signature Series' ? 'CGC SS' : 'Signed'}
                            </span>
                          )}
                          {(comic.is_key || comic.key_details) && (
                            <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-destructive text-destructive-foreground">
                              Key
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1.5 pt-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-0 h-auto hover:bg-transparent"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/inventory/${comic.id}`);
                            }}
                          >
                            <Edit2 className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
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
                            <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4 text-destructive" />
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
