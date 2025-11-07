import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tag, Bell, Heart, ScanLine, Search, User, LogOut, BookOpen, UserCircle, ShoppingBag, MessageSquare, Settings, Package, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function GrailSeekerHeader() {
  const [user, setUser] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isArtist, setIsArtist] = useState(false);
  const navigate = useNavigate();

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
          {user ? (
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(!isOpen)}
                className="relative hover:bg-accent"
                aria-label="Account"
              >
                <User className="h-5 w-5" />
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
                        <User className="mr-2 h-4 w-4" />
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
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="relative hover:bg-accent"
            >
              <Link to="/auth" aria-label="Sign In">
                <User className="h-5 w-5" />
              </Link>
            </Button>
          )}
        </nav>
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
