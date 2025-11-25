import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { STANDARD_SELLER_FEE_RATE } from "@/config/feesConfig";

interface SellerFeeInfo {
  isFoundingSeller: boolean;
  feeRate: number;
  loading: boolean;
}

export function useSellerFee(userId: string | undefined): SellerFeeInfo {
  const [isFoundingSeller, setIsFoundingSeller] = useState(false);
  const [feeRate, setFeeRate] = useState(STANDARD_SELLER_FEE_RATE);
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
          setFeeRate(data.custom_fee_rate || STANDARD_SELLER_FEE_RATE);
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
