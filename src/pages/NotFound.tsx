import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Search, Home, BookOpen } from "lucide-react";

const NotFound = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <>
      <Helmet>
        <title>404 - Page Not Found | GrailSeeker</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <main className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-background to-muted/20">
        <div className="max-w-2xl w-full text-center">
          {/* Comic Book Style 404 */}
          <div className="mb-8">
            <div className="relative inline-block">
              <div className="text-9xl font-black text-primary relative">
                404
                <div className="absolute inset-0 text-primary opacity-20 blur-sm">
                  404
                </div>
              </div>
            </div>
            <div className="mt-4 text-xl md:text-2xl font-bold text-foreground">
              Issue #404: Missing from the Long Box
            </div>
            <p className="text-muted-foreground mt-2 text-lg">
              Looks like this page got traded away or stuck in the back issue bins.
            </p>
          </div>

          {/* Search Bar */}
          <div className="mb-8 bg-card border border-border rounded-lg p-6 shadow-lg">
            <div className="flex items-center gap-2 mb-4 text-muted-foreground">
              <BookOpen className="h-5 w-5" />
              <span className="text-sm font-medium">Search for comics, sellers, or keys instead:</span>
            </div>
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Try searching for a comic, set, or seller..."
                  className="w-full pl-12 pr-4 py-3 rounded-lg border-2 border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full mt-3"
                size="lg"
              >
                <Search className="h-4 w-4 mr-2" />
                Search GrailSeeker
              </Button>
            </form>
          </div>

          {/* Navigation Options */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => navigate("/")}
              className="gap-2"
            >
              <Home className="h-5 w-5" />
              Back to Marketplace
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => navigate("/marketplace")}
              className="gap-2"
            >
              <BookOpen className="h-5 w-5" />
              Browse All Listings
            </Button>
          </div>

          {/* Help Text */}
          <p className="text-sm text-muted-foreground mt-8">
            If you think this is an error, please{" "}
            <a 
              href="/help" 
              className="text-primary hover:underline font-medium"
              onClick={(e) => {
                e.preventDefault();
                navigate("/help");
              }}
            >
              contact support
            </a>
          </p>
        </div>
      </main>
    </>
  );
};

export default NotFound;
