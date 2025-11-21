import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SellerFeeInfo {
  isFoundingSeller: boolean;
  feeRate: number;
  loading: boolean;
}

export function useSellerFee(userId: string | undefined): SellerFeeInfo {
  const [isFoundingSeller, setIsFoundingSeller] = useState(false);
  const [feeRate, setFeeRate] = useState(0.0375); // Default to standard fee
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSellerFee = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('is_founding_seller, custom_fee_rate')
          .eq('user_id', userId)
          .single();

        if (!error && data) {
          setIsFoundingSeller(data.is_founding_seller || false);
          setFeeRate(data.custom_fee_rate || 0.0375);
        }
      } catch (error) {
        console.error('Error fetching seller fee:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSellerFee();
  }, [userId]);

  return { isFoundingSeller, feeRate, loading };
}
