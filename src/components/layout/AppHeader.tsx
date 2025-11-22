import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tag, Heart, Search, User2, ScanLine, LogOut, BookOpen, UserCircle, ShoppingBag, MessageSquare, Settings, Package, BarChart3, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AppHeader() {
  const [user, setUser] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isArtist, setIsArtist] = useState(false);
  const [displayName, setDisplayName] = useState<string>("");
  const [newDealsCount, setNewDealsCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      if (data.user) {
        checkRoles(data.user.id);
        fetchDisplayName(data.user);
        fetchNewDealsCount();
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkRoles(session.user.id);
        fetchDisplayName(session.user);
        fetchNewDealsCount();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const fetchDisplayName = async (user: any) => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .single();
      
      if (data?.display_name) {
        setDisplayName(data.display_name);
      } else {
        setDisplayName(user.email?.split('@')[0] || "User");
      }
    } catch (error) {
      console.error('Error fetching display name:', error);
      setDisplayName(user.email?.split('@')[0] || "User");
    }
  };

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

  const fetchNewDealsCount = async () => {
    try {
      const { count } = await supabase
        .from('deal_matches')
        .select('*', { count: 'exact', head: true })
        .eq('is_viewed', false);

      setNewDealsCount(count || 0);
    } catch (error) {
      console.error('Error fetching deals count:', error);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setIsOpen(false);
    navigate('/');
  };


  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-[42px] sm:h-12 max-w-screen-xl items-center justify-between px-2 sm:px-4">
        <Link to="/" className="flex items-center gap-1 sm:gap-2">
          <div className="h-[22px] w-[22px] sm:h-8 sm:w-8 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold text-[9px] sm:text-sm">
            GS
          </div>
          <span className="md:hidden bg-primary text-primary-foreground text-[6px] font-semibold px-[3px] py-[1px] rounded-full leading-none">
            Beta
          </span>
          <span className="font-bold hidden xs:inline">
            Grail<span className="text-primary">Seeker</span>
          </span>
        </Link>

        <nav className="flex items-center gap-0.5 sm:gap-2">
          <Button variant="ghost" size="icon" asChild aria-label="Scanner" className="h-[34px] w-[34px] sm:h-10 sm:w-10 p-0">
            <Link to="/scanner">
              <ScanLine className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
            </Link>
          </Button>

          <Button variant="ghost" size="icon" asChild aria-label="Search" className="h-[34px] w-[34px] sm:h-10 sm:w-10 p-0">
            <Link to="/search">
              <Search className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
            </Link>
          </Button>

          <Button variant="ghost" size="icon" asChild aria-label="Favorites" className="relative h-[34px] w-[34px] sm:h-10 sm:w-10 p-0">
            <Link to="/watchlist">
              <Heart className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
            </Link>
          </Button>

          <Button variant="ghost" size="icon" asChild aria-label="Deals & Alerts" className="relative h-[34px] w-[34px] sm:h-10 sm:w-10 p-0">
            <Link to="/deals">
              <Tag className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
              {newDealsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] grid place-items-center font-medium">
                  {newDealsCount > 99 ? "99+" : newDealsCount}
                </span>
              )}
            </Link>
          </Button>

          <Button variant="ghost" asChild className="hidden md:inline-flex" aria-label="Sell">
            <Link to="/sell">
              Sell on GrailSeeker
            </Link>
          </Button>

          {user ? (
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Account"
                className="h-[34px] w-[34px] sm:h-10 sm:w-10 p-0"
              >
                <User2 className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
              </Button>
              
              {isOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 rounded-lg border bg-card shadow-lg z-50">
                    <div className="p-3 border-b">
                      <p className="text-sm font-medium truncate">{displayName}</p>
                    </div>
                    <div className="py-1">
                      <DropdownLink href="/my-collection" onClick={() => setIsOpen(false)}>
                        <BookOpen className="mr-2 h-4 w-4" />
                        My Collection
                      </DropdownLink>
                      <DropdownLink href="/profile" onClick={() => setIsOpen(false)}>
                        <UserCircle className="mr-2 h-4 w-4" />
                        My Profile & Settings
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
                      <DropdownLink href="/admin/invite-artist" onClick={() => setIsOpen(false)}>
                        <Mail className="mr-2 h-4 w-4" />
                        Invite Artist
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
            <Button variant="ghost" size="icon" asChild aria-label="Sign In" className="h-[34px] w-[34px] sm:h-10 sm:w-10 p-0">
              <Link to="/auth">
                <User2 className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
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
