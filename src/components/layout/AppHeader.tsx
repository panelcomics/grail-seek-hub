import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Heart, Search, User2, ScanLine, LogOut, BookOpen, UserCircle, ShoppingBag, MessageSquare, Settings, Package, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function AppHeader() {
  const [user, setUser] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isArtist, setIsArtist] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      if (data.user) {
        checkRoles(data.user.id);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkRoles(session.user.id);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const checkRoles = async (userId: string) => {
    try {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      
      if (roles) {
        setIsAdmin(roles.some(r => r.role === 'admin'));
        setIsArtist(roles.some(r => r.role === 'artist'));
      }
    } catch (error) {
      console.error('Error checking roles:', error);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setIsOpen(false);
    navigate('/');
  };

  // --- Actions ---
  const goSearch = () => navigate("/search"); // or open a Command dialog
  const goScanner = () => navigate("/scanner");
  const goFavorites = () =>
    user ? navigate("/favorites") : navigate("/auth?redirect=/favorites");
  const goNotifications = () =>
    user
      ? navigate("/notifications")
      : toast({ title: "Sign in to see notifications" });

  const goAccount = () => {
    if (!user) {
      navigate("/auth?redirect=/my-account");
    }
  };

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
          {user ? (
            <div className="relative">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Account"
              >
                <User2 className="h-5 w-5" />
              </Button>
              
              {isOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 rounded-lg border bg-card shadow-lg z-50">
                    <div className="p-3 border-b">
                      <p className="text-sm font-medium truncate">{user.email}</p>
                    </div>
                    <div className="py-1">
                      <DropdownLink href="/my-collection" onClick={() => setIsOpen(false)}>
                        <BookOpen className="mr-2 h-4 w-4" />
                        My Collection
                      </DropdownLink>
                      <DropdownLink href="/my-account" onClick={() => setIsOpen(false)}>
                        <UserCircle className="mr-2 h-4 w-4" />
                        My Account
                      </DropdownLink>
                      <div className="my-1 border-t" />
                      <DropdownLink href="/profile" onClick={() => setIsOpen(false)}>
                        <User2 className="mr-2 h-4 w-4" />
                        My Profile
                      </DropdownLink>
                      <DropdownLink href="/my-orders" onClick={() => setIsOpen(false)}>
                        <ShoppingBag className="mr-2 h-4 w-4" />
                        My Orders
                      </DropdownLink>
                      <DropdownLink href="/messages" onClick={() => setIsOpen(false)}>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Messages
                      </DropdownLink>
                      <DropdownLink href="/dashboard" onClick={() => setIsOpen(false)}>
                        <BarChart3 className="mr-2 h-4 w-4" />
                        Dashboard
                      </DropdownLink>
                      <DropdownLink href="/settings" onClick={() => setIsOpen(false)}>
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </DropdownLink>
                      <DropdownLink href="/seller/dashboard" onClick={() => setIsOpen(false)}>
                        <Package className="mr-2 h-4 w-4" />
                        Winners & Orders
                      </DropdownLink>
                      {isArtist && (
                        <>
                          <div className="my-1 border-t" />
                          <DropdownLink href="/artist/my-art" onClick={() => setIsOpen(false)}>
                            <Package className="mr-2 h-4 w-4" />
                            My Original Art
                          </DropdownLink>
                        </>
                      )}
                      {isAdmin && (
                        <>
                          <div className="my-1 border-t" />
                          <DropdownLink href="/admin/original-art/manage" onClick={() => setIsOpen(false)}>
                            <Package className="mr-2 h-4 w-4" />
                            Original Art (Admin)
                          </DropdownLink>
                        </>
                      )}
                      <div className="my-1 border-t" />
                      <button
                        onClick={handleSignOut}
                        className="flex w-full items-center px-3 py-2 text-sm hover:bg-accent transition-colors"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Button variant="outline" size="icon" aria-label="Account" onClick={goAccount}>
              <User2 className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

function DropdownLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link
      to={href}
      onClick={onClick}
      className="flex items-center px-3 py-2 text-sm hover:bg-accent transition-colors"
    >
      {children}
    </Link>
  );
}
