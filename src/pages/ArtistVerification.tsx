import { AppLayout } from "@/components/layout/AppLayout";
import { ArtistVerificationForm } from "@/components/ArtistVerificationForm";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const ArtistVerification = () => {
  return (
    <AppLayout>
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-6">
          <Link to="/settings">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Settings
            </Button>
          </Link>
        </div>
        
        <ArtistVerificationForm />
      </main>
    </AppLayout>
  );
};

export default ArtistVerification;
