import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Menu, Search, ScanLine, Heart, Tag, Rocket, ShoppingCart, BookOpen,
  UserCircle, ShoppingBag, MessageSquare, Settings, Package, BarChart3,
  Mail, HandshakeIcon, PenTool, ClipboardCheck, Crown, Zap, LogOut, Bell,
  HelpCircle, DollarSign, Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SubscriptionStatusIndicator } from "@/components/subscription/SubscriptionStatusIndicator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

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
      className="flex items-center gap-3.5 px-4 py-3 min-h-[48px] text-[15px] font-medium text-foreground hover:bg-accent/50 rounded-lg transition-colors active:bg-accent/70"
    >
      {icon}
      <span className="flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-destructive text-destructive-foreground text-xs grid place-items-center font-bold tabular-nums">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70 px-4 pt-4 pb-1.5">
      {children}
    </p>
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

  const iconClass = "h-[20px] w-[20px] text-muted-foreground flex-shrink-0";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden h-10 w-10" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] p-0 flex flex-col" hideCloseButton={false}>
        {/* Drawer header */}
        <SheetHeader className="px-4 py-3.5 border-b border-border/60 flex-shrink-0">
          <SheetTitle className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold text-sm">
              GS
            </div>
            <span className="font-bold text-lg">
              Grail<span className="text-primary">Seeker</span>
            </span>
          </SheetTitle>
        </SheetHeader>

        {/* User identity strip */}
        {user && (
          <div className="px-4 py-3 border-b border-border/60 flex-shrink-0">
            <p className="text-sm font-semibold truncate">{displayName}</p>
            <div className="mt-1.5">
              <SubscriptionStatusIndicator />
            </div>
          </div>
        )}

        {/* Scrollable nav body */}
        <ScrollArea className="flex-1">
          <nav className="py-1 px-2">

            {/* ── Browse ── */}
            <SectionLabel>Browse</SectionLabel>
            <NavItem to="/search" icon={<Search className={iconClass} />} label="Search Comics" onClose={close} />
            <NavItem to="/scanner" icon={<ScanLine className={iconClass} />} label="Scan a Comic" onClose={close} />
            <NavItem to="/watchlist" icon={<Heart className={iconClass} />} label="Favorites" onClose={close} />
            <NavItem to="/deals" icon={<Tag className={iconClass} />} label="Deals & Alerts" badge={newDealsCount} onClose={close} />
            <NavItem to="/crowdfund" icon={<Rocket className={iconClass} />} label="Crowdfund" onClose={close} />

            {user && (
              <>
                {/* ── Account ── */}
                <Separator className="my-2 mx-2" />
                <SectionLabel>Account</SectionLabel>
                <NavItem to="/my-collection" icon={<BookOpen className={iconClass} />} label="My Collection" onClose={close} />
                <NavItem to="/profile" icon={<UserCircle className={iconClass} />} label="Profile & Settings" onClose={close} />
                <NavItem to="/orders" icon={<ShoppingBag className={iconClass} />} label="My Orders" onClose={close} />
                <NavItem to="/crowdfund/my-projects" icon={<Rocket className={iconClass} />} label="My Campaigns" onClose={close} />
                {hasCreatorRole ? (
                  <NavItem to="/creators/dashboard" icon={<PenTool className={iconClass} />} label="Creator Dashboard" onClose={close} />
                ) : !hasCreatorApp ? (
                  <NavItem to="/creators/apply" icon={<PenTool className={iconClass} />} label="Creator Application" onClose={close} />
                ) : null}
                <NavItem to="/account/offers" icon={<HandshakeIcon className={iconClass} />} label="Offers & Trades" onClose={close} />
                <NavItem to="/trades" icon={<Package className={iconClass} />} label="Item Trades" onClose={close} />
                <NavItem to="/messages" icon={<MessageSquare className={iconClass} />} label="Messages" onClose={close} />
                <NavItem
                  to="/notifications"
                  icon={notificationsEnabled ? <Bell className={iconClass} /> : <Mail className={iconClass} />}
                  label="Notifications"
                  badge={notificationsEnabled ? unreadCount : undefined}
                  onClose={close}
                />

                {/* ── Sell & Earn ── */}
                <Separator className="my-2 mx-2" />
                <SectionLabel>Sell & Earn</SectionLabel>
                <button
                  onClick={() => { close(); onSellClick(); }}
                  className="flex items-center gap-3.5 px-4 py-3 min-h-[48px] text-[15px] font-medium text-foreground hover:bg-accent/50 rounded-lg transition-colors active:bg-accent/70 w-full text-left"
                >
                  <Tag className={iconClass} />
                  <span>Sell on GrailSeeker</span>
                </button>
                <NavItem to="/seller/dashboard" icon={<Package className={iconClass} />} label="Winners & Orders" onClose={close} />
                <NavItem to="/seller-onboarding" icon={<ClipboardCheck className={iconClass} />} label="Seller Setup Guide" onClose={close} />
                <NavItem to="/elite/deals" icon={<Zap className={iconClass} />} label="Deal Finder" onClose={close} />
                <NavItem to="/plans" icon={<Crown className={iconClass} />} label="Plans & Upgrade" onClose={close} />

                {/* ── More ── */}
                <Separator className="my-2 mx-2" />
                <SectionLabel>More</SectionLabel>
                <NavItem to="/dashboard" icon={<BarChart3 className={iconClass} />} label="Dashboard" onClose={close} />
                <NavItem to="/settings" icon={<Settings className={iconClass} />} label="Settings" onClose={close} />

                {/* ── Artist ── */}
                {isArtist && (
                  <>
                    <Separator className="my-2 mx-2" />
                    <SectionLabel>Artist</SectionLabel>
                    <NavItem to="/artist/my-art" icon={<Package className={iconClass} />} label="My Original Art" onClose={close} />
                  </>
                )}

                {/* ── Admin ── */}
                {isAdmin && (
                  <>
                    <Separator className="my-2 mx-2" />
                    <SectionLabel>Admin</SectionLabel>
                    <NavItem to="/admin/settings" icon={<Settings className={iconClass} />} label="Admin Settings" onClose={close} />
                    <NavItem to="/creators/admin" icon={<PenTool className={iconClass} />} label="Creator Applications" onClose={close} />
                    <NavItem to="/admin/original-art/manage" icon={<Package className={iconClass} />} label="Original Art" onClose={close} />
                    <NavItem to="/admin/invite-artist" icon={<Mail className={iconClass} />} label="Invite Artist" onClose={close} />
                  </>
                )}

                {/* ── Sign Out ── */}
                <Separator className="my-2 mx-2" />
                <div className="pb-6">
                  <button
                    onClick={() => { close(); onSignOut(); }}
                    className="flex items-center gap-3.5 px-4 py-3 min-h-[48px] text-[15px] font-medium hover:bg-destructive/10 rounded-lg transition-colors active:bg-destructive/20 w-full text-left text-destructive"
                  >
                    <LogOut className="h-[20px] w-[20px] flex-shrink-0" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </>
            )}
          </nav>
        </ScrollArea>

        {/* Unauthenticated CTA */}
        {!user && (
          <div className="p-4 border-t border-border/60 flex-shrink-0">
            <Link
              to="/auth"
              onClick={close}
              className="flex items-center justify-center gap-2 w-full py-3 min-h-[48px] rounded-lg bg-primary text-primary-foreground font-semibold text-[15px] hover:bg-primary/90 transition-colors"
            >
              Sign In
            </Link>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
