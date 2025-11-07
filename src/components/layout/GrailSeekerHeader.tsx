import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tag, Bell, Heart, ScanLine, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";

export function GrailSeekerHeader() {
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setUser(session?.user ?? null)
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSearchClick = () => {
    const searchBar = document.querySelector('input[type="text"]') as HTMLInputElement;
    if (searchBar) {
      searchBar.focus();
      searchBar.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      navigate("/search");
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Left: Logo */}
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold text-sm">
            GS
          </div>
          <span className="font-bold text-lg hidden sm:inline">
            Grail<span className="text-primary">Seeker</span>
          </span>
        </Link>

        {/* Right: Icon Nav */}
        <nav className="flex items-center gap-2">
          {/* Deals / Alerts */}
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="relative hover:bg-accent"
          >
            <Link to="/deals" aria-label="Deals & Alerts">
              <Tag className="h-5 w-5" />
            </Link>
          </Button>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="relative hover:bg-accent"
          >
            <Link to="/notifications" aria-label="Notifications">
              <Bell className="h-5 w-5" />
            </Link>
          </Button>

          {/* Favorites / Watchlist */}
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="relative hover:bg-accent"
          >
            <Link to="/watchlist" aria-label="Favorites">
              <Heart className="h-5 w-5" />
            </Link>
          </Button>

          {/* Scan */}
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="relative hover:bg-accent"
          >
            <Link to="/scanner" aria-label="Scan">
              <ScanLine className="h-5 w-5" />
            </Link>
          </Button>

          {/* Search */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSearchClick}
            className="relative hover:bg-accent"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </Button>

          {/* Account / User */}
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="relative hover:bg-accent"
          >
            <Link to={user ? "/my-account" : "/auth"} aria-label="Account">
              <User className="h-5 w-5" />
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
