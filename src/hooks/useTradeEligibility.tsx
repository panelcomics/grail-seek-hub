import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TradeEligibility {
  user_id: string;
  completed_sales_count: number;
  completed_purchases_count: number;
  total_completed_tx: number;
  stripe_account_verified: boolean;
  account_created_at: string;
  account_age_days: number;
  trade_override_allow: boolean;
  no_open_disputes_last_30d: boolean;
}

export const useTradeEligibility = (userId?: string) => {
  const [eligibility, setEligibility] = useState<TradeEligibility | null>(null);
  const [loading, setLoading] = useState(true);
  const [canTrade, setCanTrade] = useState(false);

  useEffect(() => {
    const fetchEligibility = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('get_trade_eligibility', {
          target_user_id: userId
        });

        if (error) throw error;
        
        const eligibilityData = data?.[0] || null;
        setEligibility(eligibilityData);

        // Check if user can trade
        if (eligibilityData) {
          const meetsRequirements = 
            eligibilityData.total_completed_tx >= 3 &&
            eligibilityData.stripe_account_verified &&
            eligibilityData.account_age_days >= 7 &&
            eligibilityData.no_open_disputes_last_30d;

          setCanTrade(eligibilityData.trade_override_allow || meetsRequirements);
        }
      } catch (error) {
        console.error('Error fetching trade eligibility:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEligibility();
  }, [userId]);

  return { eligibility, loading, canTrade };
};
