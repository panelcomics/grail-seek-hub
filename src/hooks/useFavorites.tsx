import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const useFavorites = (listingId?: string) => {
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (listingId) {
      checkFavoriteStatus();
      getFavoritesCount();
      subscribeToFavorites();
    }
  }, [user, listingId]);

  const checkFavoriteStatus = async () => {
    if (!user || !listingId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("favorites")
        .select("id")
        .eq("user_id", user.id)
        .eq("listing_id", listingId)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      setIsFavorite(!!data);
    } catch (error) {
      console.error("Error checking favorite status:", error);
    } finally {
      setLoading(false);
    }
  };

  const getFavoritesCount = async () => {
    if (!listingId) return;

    try {
      const { count, error } = await supabase
        .from("favorites")
        .select("*", { count: "exact", head: true })
        .eq("listing_id", listingId);

      if (error) throw error;
      setFavoritesCount(count || 0);
    } catch (error) {
      console.error("Error getting favorites count:", error);
    }
  };

  const subscribeToFavorites = () => {
    if (!listingId) return;

    const channel = supabase
      .channel(`favorites-${listingId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "favorites",
          filter: `listing_id=eq.${listingId}`,
        },
        () => {
          getFavoritesCount();
          if (user) checkFavoriteStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const toggleFavorite = async () => {
    if (!user) {
      toast.error("Please sign in to favorite items");
      return false;
    }

    if (!listingId) return false;

    try {
      if (isFavorite) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("listing_id", listingId);

        if (error) throw error;
        setIsFavorite(false);
        toast.success("Removed from watchlist");
      } else {
        const { error } = await supabase
          .from("favorites")
          .insert({ user_id: user.id, listing_id: listingId });

        if (error) throw error;
        setIsFavorite(true);
        toast.success("Added to watchlist");
      }

      return true;
    } catch (error: any) {
      console.error("Error toggling favorite:", error);
      toast.error(error.message || "Failed to update watchlist");
      return false;
    }
  };

  return {
    isFavorite,
    favoritesCount,
    loading,
    toggleFavorite,
  };
};
