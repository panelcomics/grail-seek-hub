import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface DiscountInfo {
  code: string;
  discountRate: number;
  monthlyCap: number;
  currentMonthSavings: number;
  isActive: boolean;
}

export const useDiscount = () => {
  const { user } = useAuth();
  const [discount, setDiscount] = useState<DiscountInfo | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchDiscountInfo = async () => {
      try {
        // Check admin status
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .single();

        setIsAdmin(!!roleData);

        // Fetch user's discount code
        const { data: codeData } = await supabase
          .from("influencer_codes")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .single();

        if (codeData) {
          // Fetch current month savings
          const { data: savingsData } = await supabase.rpc(
            "get_monthly_savings",
            { target_user_id: user.id }
          );

          setDiscount({
            code: codeData.code,
            discountRate: Number(codeData.discount_rate),
            monthlyCap: Number(codeData.monthly_cap),
            currentMonthSavings: Number(savingsData || 0),
            isActive: codeData.is_active,
          });
        }
      } catch (error) {
        console.error("Error fetching discount info:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDiscountInfo();
  }, [user]);

  const applyDiscountCode = async (code: string) => {
    if (!user) return { success: false, message: "User not authenticated" };

    try {
      // Check if code exists and is approved
      const { data: codeData, error } = await supabase
        .from("influencer_codes")
        .select("*")
        .eq("code", code)
        .eq("is_active", true)
        .is("user_id", null)
        .single();

      if (error || !codeData) {
        return { success: false, message: "Invalid or inactive code" };
      }

      // Assign code to user
      const { error: updateError } = await supabase
        .from("influencer_codes")
        .update({ user_id: user.id })
        .eq("id", codeData.id);

      if (updateError) {
        return { success: false, message: "Failed to apply code" };
      }

      // Refresh discount info
      const { data: savingsData } = await supabase.rpc("get_monthly_savings", {
        target_user_id: user.id,
      });

      setDiscount({
        code: codeData.code,
        discountRate: Number(codeData.discount_rate),
        monthlyCap: Number(codeData.monthly_cap),
        currentMonthSavings: Number(savingsData || 0),
        isActive: true,
      });

      return { success: true, message: "Discount code applied successfully!" };
    } catch (error) {
      console.error("Error applying code:", error);
      return { success: false, message: "An error occurred" };
    }
  };

  const calculateFee = async (itemPrice: number, shippingMethod: string) => {
    if (!user) {
      // Default calculation
      if (shippingMethod === "ship_nationwide") {
        return Math.max(itemPrice * 0.05, 5);
      }
      return 0;
    }

    try {
      const { data, error } = await supabase.rpc("calculate_discounted_fee", {
        target_user_id: user.id,
        item_price: itemPrice,
        shipping_method: shippingMethod,
      });

      if (error || !data || data.length === 0) {
        // Fallback to default calculation
        if (shippingMethod === "ship_nationwide") {
          return Math.max(itemPrice * 0.05, 5);
        }
        return 0;
      }

      return {
        feeAmount: Number(data[0].fee_amount),
        discountApplied: data[0].discount_applied,
        discountRate: Number(data[0].discount_rate),
        savings: Number(data[0].savings),
        capReached: data[0].cap_reached,
      };
    } catch (error) {
      console.error("Error calculating fee:", error);
      // Fallback
      if (shippingMethod === "ship_nationwide") {
        return Math.max(itemPrice * 0.05, 5);
      }
      return 0;
    }
  };

  return {
    discount,
    isAdmin,
    loading,
    applyDiscountCode,
    calculateFee,
  };
};
