/**
 * Hook for fetching seller tax data for 1099 reporting
 * Aggregates gross sales, fees, and transaction count from existing data
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SellerTaxData {
  grossSales: number;
  totalFees: number;
  netEarnings: number;
  transactionCount: number;
  taxYear: number;
}

export interface TaxThresholds {
  grossThreshold: number;
  txThreshold: number;
}

export interface TaxProfile {
  id?: string;
  legalName: string;
  businessName: string;
  taxClassification: "individual" | "business" | "";
  taxId: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export function useSellerTaxData() {
  const { user } = useAuth();
  const [taxData, setTaxData] = useState<SellerTaxData>({
    grossSales: 0,
    totalFees: 0,
    netEarnings: 0,
    transactionCount: 0,
    taxYear: new Date().getFullYear(),
  });
  const [thresholds, setThresholds] = useState<TaxThresholds>({
    grossThreshold: 5000,
    txThreshold: 0,
  });
  const [taxProfile, setTaxProfile] = useState<TaxProfile>({
    legalName: "",
    businessName: "",
    taxClassification: "",
    taxId: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    zipCode: "",
    country: "US",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchTaxData = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const currentYear = new Date().getFullYear();
      const yearStart = `${currentYear}-01-01`;
      const yearEnd = `${currentYear}-12-31`;

      // Fetch from seller_wallet_ledger if it exists
      // Using .from() with type assertion since table may not be in generated types yet
      const { data: ledgerData, error: ledgerError } = await supabase
        .from("seller_wallet_ledger" as any)
        .select("amount, fee_amount, entry_type")
        .eq("seller_id", user.id)
        .gte("created_at", yearStart)
        .lte("created_at", yearEnd);

      if (!ledgerError && ledgerData) {
        let gross = 0;
        let fees = 0;
        let txCount = 0;

        (ledgerData as any[]).forEach((entry) => {
          if (entry.entry_type === "sale" || entry.entry_type === "payment") {
            gross += Math.abs(entry.amount || 0);
            fees += Math.abs(entry.fee_amount || 0);
            txCount++;
          }
        });

        setTaxData({
          grossSales: gross,
          totalFees: fees,
          netEarnings: gross - fees,
          transactionCount: txCount,
          taxYear: currentYear,
        });
      }

      // Fetch thresholds from app_settings
      const { data: settingsData } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["tax_1099k_gross_threshold", "tax_1099k_tx_threshold"]);

      if (settingsData) {
        const thresholdMap: any = {};
        settingsData.forEach((s: any) => {
          thresholdMap[s.key] = parseFloat(s.value) || 0;
        });
        setThresholds({
          grossThreshold: thresholdMap.tax_1099k_gross_threshold || 5000,
          txThreshold: thresholdMap.tax_1099k_tx_threshold || 0,
        });
      }

      // Fetch tax profile
      const { data: profileData } = await supabase
        .from("seller_tax_profiles" as any)
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (profileData) {
        const p = profileData as any;
        setTaxProfile({
          id: p.id,
          legalName: p.legal_name || "",
          businessName: p.business_name || "",
          taxClassification: p.tax_classification || "",
          taxId: p.tax_id_encrypted || "",
          addressLine1: p.address_line1 || "",
          addressLine2: p.address_line2 || "",
          city: p.city || "",
          state: p.state || "",
          zipCode: p.zip_code || "",
          country: p.country || "US",
        });
      }
    } catch (error) {
      console.error("[TAX_DATA] Error fetching tax data:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTaxData();
  }, [fetchTaxData]);

  const saveTaxProfile = async (profile: Partial<TaxProfile>) => {
    if (!user) return { success: false, error: "Not authenticated" };

    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        legal_name: profile.legalName,
        business_name: profile.businessName,
        tax_classification: profile.taxClassification || null,
        tax_id_encrypted: profile.taxId,
        address_line1: profile.addressLine1,
        address_line2: profile.addressLine2,
        city: profile.city,
        state: profile.state,
        zip_code: profile.zipCode,
        country: profile.country || "US",
      };

      const { error } = await supabase
        .from("seller_tax_profiles" as any)
        .upsert(payload, { onConflict: "user_id" });

      if (error) throw error;

      await fetchTaxData();
      return { success: true };
    } catch (error: any) {
      console.error("[TAX_DATA] Error saving tax profile:", error);
      return { success: false, error: error.message };
    } finally {
      setSaving(false);
    }
  };

  const get1099Status = (): "below" | "may_require" => {
    const meetsGross = taxData.grossSales >= thresholds.grossThreshold;
    const meetsTx = thresholds.txThreshold === 0 || taxData.transactionCount >= thresholds.txThreshold;
    return meetsGross && meetsTx ? "may_require" : "below";
  };

  return {
    taxData,
    thresholds,
    taxProfile,
    loading,
    saving,
    saveTaxProfile,
    get1099Status,
    refresh: fetchTaxData,
  };
}
