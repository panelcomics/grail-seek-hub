// Seller momentum indicator — positive-only, additive
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface UseSellerMomentumResult {
  streakDays: number;
  isLoading: boolean;
  hasActivity: boolean;
}

/**
 * Hook to calculate seller momentum/streak.
 * Uses inventory_items created_at to determine consecutive days of activity.
 * Positive-only: streak only increases or pauses, never "breaks" visibly.
 */
export function useSellerMomentum(): UseSellerMomentumResult {
  const { user } = useAuth();
  const [streakDays, setStreakDays] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasActivity, setHasActivity] = useState(false);

  useEffect(() => {
    const calculateStreak = async () => {
      if (!user) {
        setStreakDays(0);
        setIsLoading(false);
        setHasActivity(false);
        return;
      }

      try {
        // Fetch recent inventory items (last 30 days worth)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: items, error } = await supabase
          .from("inventory_items")
          .select("created_at")
          .eq("user_id", user.id)
          .gte("created_at", thirtyDaysAgo.toISOString())
          .order("created_at", { ascending: false });

        if (error) {
          console.error("[MOMENTUM] Error fetching items:", error);
          setIsLoading(false);
          return;
        }

        if (!items || items.length === 0) {
          setStreakDays(0);
          setHasActivity(false);
          setIsLoading(false);
          return;
        }

        setHasActivity(true);

        // Extract unique days with activity
        const activityDays = new Set<string>();
        items.forEach((item) => {
          const date = new Date(item.created_at);
          const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
          activityDays.add(dayKey);
        });

        // Calculate consecutive days from today backwards
        const today = new Date();
        let streak = 0;
        let currentDate = new Date(today);

        // Check today first
        const todayKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${currentDate.getDate()}`;
        
        // If no activity today, check yesterday (allow 1-day grace)
        if (!activityDays.has(todayKey)) {
          currentDate.setDate(currentDate.getDate() - 1);
          const yesterdayKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${currentDate.getDate()}`;
          
          if (!activityDays.has(yesterdayKey)) {
            // No recent activity - hide streak (positive-only, no "broken" message)
            setStreakDays(0);
            setIsLoading(false);
            return;
          }
        }

        // Count consecutive days
        while (true) {
          const dayKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${currentDate.getDate()}`;
          
          if (activityDays.has(dayKey)) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
          } else {
            break;
          }

          // Safety limit
          if (streak > 365) break;
        }

        setStreakDays(streak);
      } catch (error) {
        console.error("[MOMENTUM] Error calculating streak:", error);
      } finally {
        setIsLoading(false);
      }
    };

    calculateStreak();
  }, [user]);

  return { streakDays, isLoading, hasActivity };
}
