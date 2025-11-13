import { AppLayout } from "@/components/layout/AppLayout";
import { DiscountSettings } from "@/components/DiscountSettings";
import { AdminPanel } from "@/components/AdminPanel";
import { PaymentSettings } from "@/components/PaymentSettings";
import { NotificationPreferences } from "@/components/NotificationPreferences";
import { TrustSettings } from "@/components/TrustSettings";
import { useDiscount } from "@/hooks/useDiscount";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon, Paintbrush } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Settings = () => {
  const { isAdmin, loading } = useDiscount();

  return (
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Paintbrush className="h-5 w-5" />
                Artist Verification
              </CardTitle>
              <CardDescription>
                Apply to become a verified artist and showcase your original artwork
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/settings/artist-verification">
                <Button variant="outline" className="w-full">
                  Apply for Verified Artist Status
                </Button>
              </Link>
            </CardContent>
          </Card>

          <TrustSettings />
          
          <PaymentSettings />
          
          <NotificationPreferences />
          
          <DiscountSettings />
          
          {!loading && isAdmin && <AdminPanel />}
        </div>
      </main>
  );
};

export default Settings;
