import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const useWatchlist = (listingId?: string) => {
  const { user } = useAuth();
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (listingId && user) {
      checkWatchlistStatus();
    } else {
      setLoading(false);
    }
  }, [user, listingId]);

  const checkWatchlistStatus = async () => {
    if (!user || !listingId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("watchlist_items")
        .select("id")
        .eq("user_id", user.id)
        .eq("listing_id", listingId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Error checking watchlist status:", error);
      }
      
      setIsInWatchlist(!!data);
    } catch (error) {
      console.error("Error checking watchlist status:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleWatchlist = async () => {
    if (!user) {
      toast.error("Please sign in to add items to your watchlist");
      return false;
    }

    if (!listingId) return false;

    try {
      if (isInWatchlist) {
        // Remove from watchlist
        const { error } = await supabase
          .from("watchlist_items")
          .delete()
          .eq("user_id", user.id)
          .eq("listing_id", listingId);

        if (error) throw error;
        setIsInWatchlist(false);
        toast.success("Removed from watchlist");
      } else {
        // Add to watchlist
        const { error } = await supabase
          .from("watchlist_items")
          .insert({ user_id: user.id, listing_id: listingId });

        if (error) throw error;
        setIsInWatchlist(true);
        toast.success("Added to watchlist");
      }

      return true;
    } catch (error: any) {
      console.error("Error toggling watchlist:", error);
      toast.error(error.message || "Failed to update watchlist");
      return false;
    }
  };

  return {
    isInWatchlist,
    loading,
    toggleWatchlist,
  };
};
