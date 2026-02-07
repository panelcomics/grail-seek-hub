import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, Search, ScanLine, Heart, Tag, Rocket, ShoppingCart, BookOpen, UserCircle, ShoppingBag, MessageSquare, Settings, Package, BarChart3, Mail, HandshakeIcon, PenTool, ClipboardCheck, Crown, Zap, LogOut, Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SubscriptionStatusIndicator } from "@/components/subscription/SubscriptionStatusIndicator";

interface MobileNavDrawerProps {
  user: any;
  displayName: string;
  isAdmin: boolean;
  isArtist: boolean;
  hasCreatorRole: boolean;
  hasCreatorApp: boolean;
  notificationsEnabled: boolean;
  unreadCount: number;
  newDealsCount: number;
  onSignOut: () => void;
  onSellClick: () => void;
}

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  onClose: () => void;
}

function NavItem({ to, icon, label, badge, onClose }: NavItemProps) {
  return (
    <Link
      to={to}
      onClick={onClose}
      className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-accent/10 rounded-lg transition-colors active:bg-accent/20"
    >
      {icon}
      <span className="flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[11px] grid place-items-center font-semibold">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}

export function MobileNavDrawer({
  user,
  displayName,
  isAdmin,
  isArtist,
  hasCreatorRole,
  hasCreatorApp,
  notificationsEnabled,
  unreadCount,
  newDealsCount,
  onSignOut,
  onSellClick,
}: MobileNavDrawerProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const close = () => setOpen(false);

  const iconClass = "h-5 w-5 text-muted-foreground flex-shrink-0";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9" aria-label="Menu">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] p-0 overflow-y-auto">
        <SheetHeader className="p-4 pb-2 border-b">
          <SheetTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold text-sm">
              GS
            </div>
            <span className="font-bold">
              Grail<span className="text-primary">Seeker</span>
            </span>
          </SheetTitle>
        </SheetHeader>

        {/* User info */}
        {user && (
          <div className="px-4 py-3 border-b space-y-2">
            <p className="text-sm font-semibold truncate">{displayName}</p>
            <SubscriptionStatusIndicator />
          </div>
        )}

        {/* Primary nav */}
        <div className="py-2 px-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-4 py-2">Browse</p>
          <NavItem to="/search" icon={<Search className={iconClass} />} label="Search" onClose={close} />
          <NavItem to="/scanner" icon={<ScanLine className={iconClass} />} label="Scanner" onClose={close} />
          <NavItem to="/watchlist" icon={<Heart className={iconClass} />} label="Favorites" onClose={close} />
          <NavItem to="/deals" icon={<Tag className={iconClass} />} label="Deals & Alerts" badge={newDealsCount} onClose={close} />
          <NavItem to="/crowdfund" icon={<Rocket className={iconClass} />} label="Crowdfund" onClose={close} />
        </div>

        {user && (
          <>
            <div className="border-t" />
            <div className="py-2 px-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-4 py-2">Account</p>
              <NavItem to="/my-collection" icon={<BookOpen className={iconClass} />} label="My Collection" onClose={close} />
              <NavItem to="/profile" icon={<UserCircle className={iconClass} />} label="My Profile & Settings" onClose={close} />
              <NavItem to="/orders" icon={<ShoppingBag className={iconClass} />} label="My Orders" onClose={close} />
              <NavItem to="/crowdfund/my-projects" icon={<Rocket className={iconClass} />} label="My Campaigns" onClose={close} />
              {hasCreatorRole ? (
                <NavItem to="/creators/dashboard" icon={<PenTool className={iconClass} />} label="Creator Dashboard" onClose={close} />
              ) : !hasCreatorApp ? (
                <NavItem to="/creators/apply" icon={<PenTool className={iconClass} />} label="Creator Application" onClose={close} />
              ) : null}
              <NavItem to="/account/offers" icon={<HandshakeIcon className={iconClass} />} label="My Offers & Trades" onClose={close} />
              <NavItem to="/trades" icon={<Package className={iconClass} />} label="My Item Trades" onClose={close} />
              <NavItem to="/messages" icon={<MessageSquare className={iconClass} />} label="Messages" onClose={close} />
            </div>

            <div className="border-t" />
            <div className="py-2 px-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-4 py-2">Sell & Earn</p>
              <button
                onClick={() => { close(); onSellClick(); }}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-accent/10 rounded-lg transition-colors active:bg-accent/20 w-full text-left"
              >
                <Tag className={iconClass} />
                <span>Sell on GrailSeeker</span>
              </button>
              <NavItem to="/seller/dashboard" icon={<Package className={iconClass} />} label="Winners & Orders" onClose={close} />
              <NavItem to="/seller-onboarding" icon={<ClipboardCheck className={iconClass} />} label="Seller Setup Guide" onClose={close} />
              <NavItem to="/elite/deals" icon={<Zap className={iconClass} />} label="Deal Finder" onClose={close} />
              <NavItem to="/plans" icon={<Crown className={iconClass} />} label="Plans & Upgrade" onClose={close} />
            </div>

            <div className="border-t" />
            <div className="py-2 px-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-4 py-2">More</p>
              <NavItem to="/dashboard" icon={<BarChart3 className={iconClass} />} label="Dashboard" onClose={close} />
              <NavItem to="/notifications" icon={notificationsEnabled ? <Bell className={iconClass} /> : <Mail className={iconClass} />} label="Notifications" badge={notificationsEnabled ? unreadCount : undefined} onClose={close} />
              <NavItem to="/settings" icon={<Settings className={iconClass} />} label="Settings" onClose={close} />
            </div>

            {isArtist && (
              <>
                <div className="border-t" />
                <div className="py-2 px-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-4 py-2">Artist</p>
                  <NavItem to="/artist/my-art" icon={<Package className={iconClass} />} label="My Original Art" onClose={close} />
                </div>
              </>
            )}

            {isAdmin && (
              <>
                <div className="border-t" />
                <div className="py-2 px-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-4 py-2">Admin</p>
                  <NavItem to="/admin/settings" icon={<Settings className={iconClass} />} label="Admin Settings" onClose={close} />
                  <NavItem to="/creators/admin" icon={<PenTool className={iconClass} />} label="Creator Applications" onClose={close} />
                  <NavItem to="/admin/original-art/manage" icon={<Package className={iconClass} />} label="Original Art" onClose={close} />
                  <NavItem to="/admin/invite-artist" icon={<Mail className={iconClass} />} label="Invite Artist" onClose={close} />
                </div>
              </>
            )}

            <div className="border-t" />
            <div className="py-2 px-2 pb-6">
              <button
                onClick={() => { close(); onSignOut(); }}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-destructive/10 rounded-lg transition-colors active:bg-destructive/20 w-full text-left text-destructive"
              >
                <LogOut className="h-5 w-5 flex-shrink-0" />
                <span>Sign Out</span>
              </button>
            </div>
          </>
        )}

        {!user && (
          <div className="py-4 px-4">
            <Link
              to="/auth"
              onClick={close}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
            >
              Sign In
            </Link>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
