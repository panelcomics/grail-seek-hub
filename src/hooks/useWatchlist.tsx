import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useEliteAccess } from "@/hooks/useEliteAccess";

export const useWatchlist = (listingId?: string) => {
  const { user } = useAuth();
  const { isElite, watchlistLimit } = useEliteAccess();
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

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
        // Check limit for non-Elite users before adding
        if (!isElite && watchlistLimit !== -1) {
          const { count, error: countError } = await supabase
            .from("watchlist_items")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id);

          if (countError) {
            console.error("Error counting watchlist items:", countError);
          } else if (count !== null && count >= watchlistLimit) {
            setShowUpgradeModal(true);
            return false;
          }
        }

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
    showUpgradeModal,
    setShowUpgradeModal,
    watchlistLimit,
  };
};
