import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export function useWatchAuction(listingId?: string) {
  const { user } = useAuth();
  const [isWatching, setIsWatching] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && listingId) {
      checkWatchStatus();
    }
  }, [user, listingId]);

  const checkWatchStatus = async () => {
    if (!user || !listingId) return;

    try {
      const { data, error } = await supabase
        .from("auction_watches")
        .select("id")
        .eq("user_id", user.id)
        .eq("listing_id", listingId)
        .maybeSingle();

      if (error) throw error;
      setIsWatching(!!data);
    } catch (error) {
      console.error("Error checking watch status:", error);
    }
  };

  const toggleWatch = async () => {
    if (!user) {
      toast.error("Please sign in to watch auctions");
      return;
    }

    if (!listingId) return;

    setLoading(true);
    try {
      if (isWatching) {
        // Unwatch
        const { error } = await supabase
          .from("auction_watches")
          .delete()
          .eq("user_id", user.id)
          .eq("listing_id", listingId);

        if (error) throw error;
        
        setIsWatching(false);
        toast.success("Removed from watchlist");
      } else {
        // Watch
        const { error } = await supabase
          .from("auction_watches")
          .insert({
            user_id: user.id,
            listing_id: listingId,
          });

        if (error) throw error;
        
        setIsWatching(true);
        toast.success("Added to watchlist! You'll be notified when auction is ending.");
      }
    } catch (error) {
      console.error("Error toggling watch:", error);
      toast.error("Failed to update watchlist");
    } finally {
      setLoading(false);
    }
  };

  return {
    isWatching,
    loading,
    toggleWatch,
  };
}
