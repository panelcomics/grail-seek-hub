import { useState, useEffect } from "react";
import { Percent, Tag, BarChart3, Heart, Maximize2, Bell, User, LogOut, HelpCircle, Settings, Package, ShoppingBag, MessageSquare, Mail, UserCircle, BookOpen } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export default function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [newDealsCount, setNewDealsCount] = useState(0);
  const [notificationsCount, setNotificationsCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isArtist, setIsArtist] = useState(false);

  useEffect(() => {
    if (user) {
      fetchNewDealsCount();
      fetchNotificationsCount();
      checkRoles();
    }
  }, [user]);

  const checkRoles = async () => {
    if (!user) return;
    
    try {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      
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

  const fetchNotificationsCount = async () => {
    try {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id)
        .eq('read', false);

      setNotificationsCount(count || 0);
    } catch (error) {
      console.error('Error fetching notifications count:', error);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur supports-[backdrop-filter]:bg-background/70 bg-background/95 border-b">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 h-14">
        <div className="h-full flex items-center justify-between">
          {/* Left: Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold">
              GS
            </div>
            <span className="font-semibold text-[15px] tracking-tight hidden xs:inline">Grail</span>
            <span className="font-semibold text-[15px] tracking-tight hidden xs:inline">Seeker</span>
          </Link>

          {/* Right: Icon row */}
          <nav className="flex items-center gap-2 sm:gap-3">
            <IconButton href="/deals" label="Deals" count={newDealsCount}>
              <Percent className="h-5 w-5" />
            </IconButton>
            <IconButton href="/marketplace" label="Tags">
              <Tag className="h-5 w-5" />
            </IconButton>
            <IconButton href="/portfolio" label="Stats">
              <BarChart3 className="h-5 w-5" />
            </IconButton>
            <IconButton href="/watchlist" label="Favorites">
              <Heart className="h-5 w-5" />
            </IconButton>
            <IconButton href="/scanner" label="Scanner">
              <Maximize2 className="h-5 w-5" />
            </IconButton>
            <IconButton href="/notifications" label="Notifications" count={notificationsCount}>
              <Bell className="h-5 w-5" />
            </IconButton>
            
            {user ? (
              <IconButtonDropdown user={user} signOut={signOut} navigate={navigate} isAdmin={isAdmin} isArtist={isArtist} />
            ) : (
              <IconButton href="/auth" label="Sign In">
                <User className="h-5 w-5" />
              </IconButton>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}

function IconButton({
  href,
  label,
  count,
  children,
}: {
  href: string;
  label: string;
  count?: number;
  children: React.ReactNode;
}) {
  const showCount = typeof count === "number" && count > 0;
  return (
    <Link
      to={href}
      aria-label={label}
      className="relative grid place-items-center h-9 w-9 rounded-lg border bg-card hover:bg-accent transition-colors"
    >
      {children}
      {showCount && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] grid place-items-center">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

function IconButtonDropdown({ 
  user, 
  signOut, 
  navigate,
  isAdmin,
  isArtist
}: { 
  user: any; 
  signOut: () => void; 
  navigate: any;
  isAdmin: boolean;
  isArtist: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Account"
        className="relative grid place-items-center h-9 w-9 rounded-lg border bg-card hover:bg-accent transition-colors"
      >
        <User className="h-5 w-5" />
      </button>
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-56 rounded-lg border bg-card shadow-lg z-50">
            <div className="p-3 border-b">
              <p className="text-sm font-medium">{user.email}</p>
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
                  <DropdownLink href="/admin/invite-artist" onClick={() => setIsOpen(false)}>
                    <Mail className="mr-2 h-4 w-4" />
                    Invite Artist
                  </DropdownLink>
                </>
              )}
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/scanner');
                }}
                className="flex w-full items-center px-3 py-2 text-sm hover:bg-accent transition-colors"
              >
                <HelpCircle className="mr-2 h-4 w-4" />
                AI Scanner Tutorial
              </button>
              <div className="my-1 border-t" />
              <button
                onClick={() => {
                  setIsOpen(false);
                  signOut();
                }}
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
