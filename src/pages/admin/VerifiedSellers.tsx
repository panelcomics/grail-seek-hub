import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { AppLayout } from "@/components/layout/AppLayout";
import { AdminVerifiedSellers } from "@/components/AdminVerifiedSellers";
import { Helmet } from "react-helmet-async";

export default function VerifiedSellersPage() {
  const { isAdmin, loading } = useAdminCheck();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, loading, navigate]);

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-12">
          <p className="text-center text-muted-foreground">Loading...</p>
        </div>
      </AppLayout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <AppLayout>
      <Helmet>
        <title>Verified Sellers | Admin Dashboard</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="container mx-auto px-4 py-12">
        <AdminVerifiedSellers />
      </div>
    </AppLayout>
  );
}
