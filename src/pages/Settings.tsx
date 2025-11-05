import Navbar from "@/components/Navbar";
import { DiscountSettings } from "@/components/DiscountSettings";
import { AdminPanel } from "@/components/AdminPanel";
import { PaymentSettings } from "@/components/PaymentSettings";
import { NotificationPreferences } from "@/components/NotificationPreferences";
import { useDiscount } from "@/hooks/useDiscount";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon } from "lucide-react";

const Settings = () => {
  const { isAdmin, loading } = useDiscount();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <SettingsIcon className="h-8 w-8" />
            Settings
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your account preferences and discounts
          </p>
        </div>

        <div className="space-y-6">
          <PaymentSettings />
          
          <NotificationPreferences />
          
          <DiscountSettings />
          
          {!loading && isAdmin && <AdminPanel />}
        </div>
      </main>
    </div>
  );
};

export default Settings;
