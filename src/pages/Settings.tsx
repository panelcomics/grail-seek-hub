import { DiscountSettings } from "@/components/DiscountSettings";
import { AdminPanel } from "@/components/AdminPanel";
import { PaymentSettings } from "@/components/PaymentSettings";
import { NotificationPreferences } from "@/components/NotificationPreferences";
import { TrustSettings } from "@/components/TrustSettings";
import { SellerPayoutStatus } from "@/components/SellerPayoutStatus";
import { ShippingSettings } from "@/components/ShippingSettings";
import { useDiscount } from "@/hooks/useDiscount";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon, Paintbrush, Database } from "lucide-react";
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
                Creator Account
              </CardTitle>
              <CardDescription>
                Apply to become a verified creator — artists and writers welcome
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/creators/apply">
                <Button variant="outline" className="w-full">
                  Apply to Become a Creator
                </Button>
              </Link>
            </CardContent>
          </Card>

          <TrustSettings />
          
          <SellerPayoutStatus />
          
          <ShippingSettings />
          
          <PaymentSettings />
          
          <NotificationPreferences />
          
          <DiscountSettings />
          
          {!loading && isAdmin && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    ComicVine Cache Sync
                  </CardTitle>
                  <CardDescription>
                    Manage the local ComicVine database cache for faster comic lookups
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link to="/admin/comicvine-sync">
                    <Button variant="outline" className="w-full">
                      Open ComicVine Sync Manager
                    </Button>
                  </Link>
                </CardContent>
              </Card>
              <AdminPanel />
            </>
          )}
        </div>
    </main>
  );
};

export default Settings;
