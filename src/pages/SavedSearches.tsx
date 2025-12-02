import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Search, Trash2, Play, Bookmark } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface SavedSearch {
  id: string;
  name: string | null;
  query: Record<string, any>;
  created_at: string;
}

export default function SavedSearches() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      toast.error("Please log in to view saved searches");
      navigate("/auth");
      return;
    }
    
    fetchSearches();
  }, [user, authLoading]);

  const fetchSearches = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("saved_searches")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSearches((data || []) as SavedSearch[]);
    } catch (error) {
      console.error("Error fetching saved searches:", error);
      toast.error("Failed to load saved searches");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from("saved_searches")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      setSearches(prev => prev.filter(s => s.id !== id));
      toast.success("Search deleted");
    } catch (error) {
      console.error("Error deleting search:", error);
      toast.error("Failed to delete search");
    } finally {
      setDeletingId(null);
    }
  };

  const handleRunSearch = (search: SavedSearch) => {
    const params = new URLSearchParams();
    if (search.query.q) params.set("q", search.query.q);
    if (search.query.category) params.set("category", search.query.category);
    if (search.query.minPrice) params.set("minPrice", String(search.query.minPrice));
    if (search.query.maxPrice) params.set("maxPrice", String(search.query.maxPrice));
    if (search.query.condition) params.set("condition", search.query.condition);
    
    navigate(`/search?${params.toString()}`);
  };

  const getSearchLabel = (search: SavedSearch) => {
    if (search.name) return search.name;
    
    const parts: string[] = [];
    if (search.query.q) parts.push(`"${search.query.q}"`);
    if (search.query.category) parts.push(search.query.category);
    if (search.query.minPrice || search.query.maxPrice) {
      const priceRange = `$${search.query.minPrice || 0} - $${search.query.maxPrice || "∞"}`;
      parts.push(priceRange);
    }
    
    return parts.length > 0 ? parts.join(" • ") : "All listings";
  };

  if (authLoading || loading) {
    return (
      <AppLayout>
        <main className="container py-8">
          <div className="max-w-2xl mx-auto space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </main>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Helmet>
        <title>Saved Searches | GrailSeeker</title>
        <meta name="description" content="Your saved search filters" />
      </Helmet>

      <main className="container py-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Bookmark className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Saved Searches</h1>
              <p className="text-muted-foreground">
                {searches.length} saved {searches.length === 1 ? "search" : "searches"}
              </p>
            </div>
          </div>

          {searches.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold mb-2">No saved searches yet</h2>
                <p className="text-muted-foreground mb-4">
                  Save your favorite search filters to quickly find comics later
                </p>
                <Button onClick={() => navigate("/search")}>
                  Start Searching
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {searches.map((search) => (
                <Card key={search.id} className="hover:bg-muted/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {getSearchLabel(search)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Saved {formatDistanceToNow(new Date(search.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleRunSearch(search)}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Run
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(search.id)}
                          disabled={deletingId === search.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </AppLayout>
  );
}