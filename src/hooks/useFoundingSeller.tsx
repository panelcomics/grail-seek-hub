// Founding Seller identity layer — presentation only
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface UseFoundingSellerResult {
  isFoundingSeller: boolean;
  loading: boolean;
}

/**
 * Hook to check if the current user is a Founding Seller
 * Uses the is_founding_seller flag from profiles table
 */
export function useFoundingSeller(): UseFoundingSellerResult {
  const { user } = useAuth();
  const [isFoundingSeller, setIsFoundingSeller] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkFoundingStatus = async () => {
      if (!user) {
        setIsFoundingSeller(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("is_founding_seller")
          .eq("user_id", user.id)
          .single();

        if (!error && data) {
          setIsFoundingSeller(data.is_founding_seller === true);
        }
      } catch (err) {
        console.error("[FOUNDING_SELLER] Error checking status:", err);
      } finally {
        setLoading(false);
      }
    };

    checkFoundingStatus();
  }, [user]);

  return { isFoundingSeller, loading };
}

/**
 * Check if a specific user ID is a Founding Seller
 * Useful for displaying badge on other users' profiles/listings
 */
export async function checkIsFoundingSeller(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("is_founding_seller")
      .eq("user_id", userId)
      .single();

    if (!error && data) {
      return data.is_founding_seller === true;
    }
  } catch (err) {
    console.error("[FOUNDING_SELLER] Error checking status for user:", userId, err);
  }
  return false;
}
