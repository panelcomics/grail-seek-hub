import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export function useFollowSeller(sellerId?: string) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sellerId) {
      fetchFollowerCount();
    }
    if (user && sellerId) {
      checkFollowStatus();
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
      navigate("/auth");
      return;
    }

    if (!sellerId) {
      toast.error("Invalid seller");
      return;
    }

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
        toast.success("Following seller! You'll be notified of new listings.");
      }

      // Refetch count after successful operation
      await fetchFollowerCount();
      
    } catch (error: any) {
      console.error("Error toggling follow:", error);
      toast.error("Failed to update follow status. Please try again.");
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
