import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AppSettings {
  allow_new_signups: boolean;
  marketplace_live: boolean;
  scanner_enabled: boolean;
}

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>({
    allow_new_signups: true,
    marketplace_live: true,
    scanner_enabled: true,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('app_settings_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_settings'
        },
        () => {
          fetchSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value");

      if (error) throw error;

      const settingsMap: any = {};
      data?.forEach(item => {
        settingsMap[item.key] = item.value === 'true';
      });

      setSettings(settingsMap);
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  return { settings, loading, refetch: fetchSettings };
}
