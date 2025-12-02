import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Bookmark, Loader2 } from "lucide-react";

interface SaveSearchButtonProps {
  query: {
    q?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    condition?: string;
    [key: string]: any;
  };
  className?: string;
}

export function SaveSearchButton({ query, className }: SaveSearchButtonProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) {
      toast.error("Please log in to save searches");
      return;
    }

    // Check if there's anything to save
    const hasFilters = Object.values(query).some(v => v !== undefined && v !== "");
    if (!hasFilters) {
      toast.error("Add some search filters first");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("saved_searches").insert({
        user_id: user.id,
        query: query,
      });

      if (error) throw error;
      toast.success("Search saved!");
    } catch (error: any) {
      console.error("Error saving search:", error);
      toast.error(error.message || "Failed to save search");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSave}
      disabled={saving}
      className={className}
    >
      {saving ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <Bookmark className="h-4 w-4 mr-2" />
          Save Search
        </>
      )}
    </Button>
  );
}