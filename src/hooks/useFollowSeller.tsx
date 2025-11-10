import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export function useFollowSeller(sellerId?: string) {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && sellerId) {
      checkFollowStatus();
      fetchFollowerCount();
    }
  }, [user, sellerId]);

  const checkFollowStatus = async () => {
    if (!user || !sellerId) return;

    try {
      const { data, error } = await supabase
        .from("favorite_sellers")
        .select("id")
        .eq("user_id", user.id)
        .eq("seller_id", sellerId)
        .maybeSingle();

      if (error) throw error;
      setIsFollowing(!!data);
    } catch (error) {
      console.error("Error checking follow status:", error);
    }
  };

  const fetchFollowerCount = async () => {
    if (!sellerId) return;

    try {
      const { data, error } = await supabase
        .rpc("get_seller_follower_count", { seller_user_id: sellerId });

      if (error) throw error;
      setFollowerCount(data || 0);
    } catch (error) {
      console.error("Error fetching follower count:", error);
    }
  };

  const toggleFollow = async () => {
    if (!user) {
      toast.error("Please sign in to follow sellers");
      return;
    }

    if (!sellerId) return;

    setLoading(true);
    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from("favorite_sellers")
          .delete()
          .eq("user_id", user.id)
          .eq("seller_id", sellerId);

        if (error) throw error;
        
        setIsFollowing(false);
        setFollowerCount(prev => Math.max(0, prev - 1));
        toast.success("Unfollowed seller");
      } else {
        // Follow
        const { error } = await supabase
          .from("favorite_sellers")
          .insert({
            user_id: user.id,
            seller_id: sellerId,
          });

        if (error) throw error;
        
        setIsFollowing(true);
        setFollowerCount(prev => prev + 1);
        toast.success("Following seller! You'll be notified of new listings.");
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
      toast.error("Failed to update follow status");
    } finally {
      setLoading(false);
    }
  };

  return {
    isFollowing,
    followerCount,
    loading,
    toggleFollow,
  };
}
