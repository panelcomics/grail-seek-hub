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
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        <div className="mx-auto max-w-screen-md p-4">
          <h1 className="text-2xl font-bold mb-3">Search</h1>
          
          <div className="max-w-xl mx-auto flex items-center gap-2">
            <Input
              type="text"
              placeholder="Search your collection, marketplace, creators..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <ScanButton onScanResult={handleScanResult} />
          </div>

          {/* results list here */}
          {searchQuery && (
            <div className="mt-4 text-muted-foreground text-sm">
              Search results for "{searchQuery}" will appear here
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
