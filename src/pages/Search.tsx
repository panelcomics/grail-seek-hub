import { useState } from "react";
import { Input } from "@/components/ui/input";
import { ScanButton } from "@/components/scanner/ScanButton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const handleScanResult = async (searchText: string) => {
    setSearchQuery(searchText);
    
    try {
      const { data, error } = await supabase.functions.invoke("comic-scanner", {
        body: { query: searchText },
      });

      if (error) throw error;

      if (!data.found) {
        toast({
          title: "No comic found",
          description: "Try a different search term",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Comic found!",
        description: data.comic.full_title,
      });
    } catch (error: any) {
      console.error("Search error:", error);
      toast({
        title: "Search failed",
        description: error.message || "Unable to search",
        variant: "destructive",
      });
    }
  };
  
  return (
    <main className="flex-1">
        <div className="max-w-xl mx-auto mt-8 p-4">
          <h1 className="text-3xl font-semibold mb-4 text-foreground">Search</h1>
          
          <div className="flex items-center gap-3 mb-2">
            <Input
              type="text"
              placeholder="Search your collection, marketplace, creators..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 h-12 text-base"
            />
            <ScanButton onScanResult={handleScanResult} />
          </div>
          
          <p className="text-sm text-muted-foreground mb-6">
            Use the scanner to automatically find books via ComicVine + eBay, or upload a photo to search.
          </p>

          {/* results list here */}
          {searchQuery && (
            <div className="mt-6 p-4 rounded-lg border border-border bg-card">
              <p className="text-muted-foreground text-sm">
                Search results for "{searchQuery}" will appear here
              </p>
            </div>
        )}
      </div>
    </main>
  );
}
