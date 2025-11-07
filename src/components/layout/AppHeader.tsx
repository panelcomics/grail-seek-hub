import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Heart, Search, User2, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function AppHeader() {
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setUser(session?.user ?? null)
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  // --- Actions ---
  const goSearch = () => navigate("/search"); // or open a Command dialog
  const goScanner = () => navigate("/scanner");
  const goFavorites = () =>
    user ? navigate("/favorites") : navigate("/auth?redirect=/favorites");
  const goNotifications = () =>
    user
      ? navigate("/notifications")
      : toast({ title: "Sign in to see notifications" });

  const goAccount = () =>
    user ? navigate("/account") : navigate("/auth?redirect=/account");

  return (
    <header className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between px-4">
        {/* Left: Logo */}
        <div onClick={() => navigate("/")} className="font-bold cursor-pointer">
          Grail <span className="text-primary">Seeker</span>
        </div>

        {/* Right: single row of actions — no duplicates */}
        <div className="flex items-center gap-2">
          {/* Scanner */}
          <Button variant="outline" size="icon" aria-label="Scanner" onClick={goScanner}>
            <ScanLine className="h-5 w-5" />
          </Button>

          {/* Search: always available */}
          <Button variant="outline" size="icon" aria-label="Search" onClick={goSearch}>
            <Search className="h-5 w-5" />
          </Button>

          {/* Favorites/Watchlist (heart) */}
          <Button variant="outline" size="icon" aria-label="Favorites" onClick={goFavorites}>
            <Heart className="h-5 w-5" />
          </Button>

          {/* Notifications — render ONCE and only when logged in */}
          {user && (
            <Button
              variant="outline"
              size="icon"
              aria-label="Notifications"
              onClick={goNotifications}
            >
              <Bell className="h-5 w-5" />
            </Button>
          )}

          {/* Account */}
          <Button variant="outline" size="icon" aria-label="Account" onClick={goAccount}>
            <User2 className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
