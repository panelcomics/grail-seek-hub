import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tag, Heart, Search, User2, ScanLine, Rocket, Bell } from "lucide-react";
import { CartIconButton } from "@/components/cart/CartIconButton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useBaselaneFlag } from "@/hooks/useBaselaneFlags";
import { useNotificationQueue } from "@/hooks/useNotificationQueue";
import { Badge } from "@/components/ui/badge";
import { HeaderSearchBar } from "@/components/layout/HeaderSearchBar";
import { HeaderUserDropdown } from "@/components/layout/HeaderUserDropdown";
import { MobileNavDrawer } from "@/components/layout/MobileNavDrawer";

export function AppHeader() {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isArtist, setIsArtist] = useState(false);
  const [hasCreatorRole, setHasCreatorRole] = useState(false);
  const [hasCreatorApp, setHasCreatorApp] = useState(false);
  const [displayName, setDisplayName] = useState<string>("");
  const [newDealsCount, setNewDealsCount] = useState(0);
  const navigate = useNavigate();

  const notificationsEnabled = useBaselaneFlag("ENABLE_NOTIFICATIONS");
  const { unreadCount } = useNotificationQueue();

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
        .select('username')
        .eq('user_id', user.id)
        .single();
      if (data?.username) {
        setDisplayName(data.username);
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
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      
      console.log('[AppHeader] checkRoles for userId:', userId, 'roles:', roles, 'error:', error);
      
      if (roles && roles.length > 0) {
        const hasAdmin = roles.some(r => r.role === 'admin');
        const hasArtist = roles.some(r => r.role === 'artist');
        console.log('[AppHeader] isAdmin:', hasAdmin, 'isArtist:', hasArtist);
        setIsAdmin(hasAdmin);
        setIsArtist(hasArtist);
      }

      const { data: creatorRoles } = await supabase
        .from('creator_roles')
        .select('is_artist, is_writer')
        .eq('user_id', userId)
        .maybeSingle();
      
      setHasCreatorRole(!!(creatorRoles?.is_artist || creatorRoles?.is_writer));

      const { data: creatorApp } = await supabase
        .from('creator_applications')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      
      setHasCreatorApp(!!creatorApp);
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
    navigate('/');
  };

  const handleSellClick = async () => {
    if (!user) {
      navigate('/auth?redirect=/seller-setup');
      return;
    }
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("stripe_account_id, stripe_onboarding_complete, shipping_address")
        .eq("user_id", user.id)
        .single();
      
      const hasAccount = !!profile?.stripe_account_id;
      const isComplete = profile?.stripe_onboarding_complete || false;
      const hasShipping = !!(profile?.shipping_address && 
        typeof profile.shipping_address === 'object' && 
        profile.shipping_address !== null &&
        (profile.shipping_address as any).street1 &&
        (profile.shipping_address as any).city &&
        (profile.shipping_address as any).state &&
        (profile.shipping_address as any).zip);
      
      const needsOnboarding = !hasAccount || !isComplete || !hasShipping;
      
      if (needsOnboarding) {
        toast.info("Complete your seller setup (payouts + shipping address) to start listing");
        navigate('/seller-setup?returnTo=/my-inventory');
        return;
      }
    } catch (error) {
      console.error("Error checking seller onboarding:", error);
    }
    navigate('/my-inventory');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-card/95 backdrop-blur-md supports-[backdrop-filter]:bg-card/80 shadow-sm">
      <div className="mx-auto flex h-14 max-w-screen-xl items-center gap-2 px-3 sm:px-4 lg:px-6">
        {/* Mobile hamburger */}
        <MobileNavDrawer
          user={user}
          displayName={displayName}
          isAdmin={isAdmin}
          isArtist={isArtist}
          hasCreatorRole={hasCreatorRole}
          hasCreatorApp={hasCreatorApp}
          notificationsEnabled={notificationsEnabled}
          unreadCount={unreadCount}
          newDealsCount={newDealsCount}
          onSignOut={handleSignOut}
          onSellClick={handleSellClick}
        />

        {/* Logo */}
        <Link to="/" className="flex items-center gap-1.5 flex-shrink-0">
          <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold text-sm shadow-sm">
            GS
          </div>
          <span className="font-bold text-base hidden sm:inline">
            Grail<span className="text-primary">Seeker</span>
          </span>
          <span className="sm:hidden bg-primary text-primary-foreground text-[7px] font-semibold px-1 py-0.5 rounded-full leading-none">
            Beta
          </span>
        </Link>

        {/* Desktop search bar */}
        <div className="flex-1 flex justify-center px-2">
          <HeaderSearchBar />
        </div>

        {/* Navigation actions */}
        <nav className="flex items-center gap-1 sm:gap-1.5">
          {/* Desktop-only nav links */}
          <Button variant="ghost" size="sm" asChild className="hidden lg:inline-flex gap-1.5 text-sm font-medium h-9">
            <Link to="/scanner">
              <ScanLine className="h-4 w-4" />
              Scan
            </Link>
          </Button>

          <Button variant="ghost" size="sm" asChild className="hidden lg:inline-flex gap-1.5 text-sm font-medium h-9">
            <Link to="/crowdfund">
              <Rocket className="h-4 w-4" />
              Crowdfund
            </Link>
          </Button>

          {/* Icon-only on mobile, visible on all sizes */}
          <Button variant="ghost" size="icon" asChild aria-label="Search" className="lg:hidden h-9 w-9">
            <Link to="/search">
              <Search className="h-[18px] w-[18px]" />
            </Link>
          </Button>

          <Button variant="ghost" size="icon" asChild aria-label="Scanner" className="lg:hidden h-9 w-9">
            <Link to="/scanner">
              <ScanLine className="h-[18px] w-[18px]" />
            </Link>
          </Button>

          <Button variant="ghost" size="icon" asChild aria-label="Favorites" className="relative h-9 w-9">
            <Link to="/watchlist">
              <Heart className="h-[18px] w-[18px]" />
            </Link>
          </Button>

          <Button variant="ghost" size="icon" asChild aria-label="Deals & Alerts" className="relative h-9 w-9 hidden sm:inline-flex">
            <Link to="/deals">
              <Tag className="h-[18px] w-[18px]" />
              {newDealsCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] grid place-items-center font-semibold">
                  {newDealsCount > 99 ? "99+" : newDealsCount}
                </span>
              )}
            </Link>
          </Button>

          {/* Cart */}
          <CartIconButton className="h-9 w-9" />

          {/* Notifications bell */}
          {user && notificationsEnabled && (
            <Button variant="ghost" size="icon" asChild aria-label="Notifications" className="relative h-9 w-9 hidden sm:inline-flex">
              <Link to="/notifications">
                <Bell className="h-[18px] w-[18px]" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] grid place-items-center font-semibold">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Badge>
                )}
              </Link>
            </Button>
          )}

          {/* Sell CTA — desktop */}
          <Button
            variant="default"
            size="sm"
            className="hidden lg:inline-flex font-semibold text-sm h-9 px-4"
            onClick={handleSellClick}
          >
            Sell
          </Button>

          {/* User menu — desktop */}
          {user ? (
            <div className="hidden lg:block">
              <HeaderUserDropdown
                displayName={displayName}
                isAdmin={isAdmin}
                isArtist={isArtist}
                hasCreatorRole={hasCreatorRole}
                hasCreatorApp={hasCreatorApp}
                notificationsEnabled={notificationsEnabled}
                unreadCount={unreadCount}
                onSignOut={handleSignOut}
                onSellClick={handleSellClick}
              />
            </div>
          ) : (
            <Button variant="ghost" size="icon" asChild aria-label="Sign In" className="h-9 w-9">
              <Link to="/auth">
                <User2 className="h-5 w-5" />
              </Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
