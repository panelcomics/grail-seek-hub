import { useState } from "react";
import { Link } from "react-router-dom";
import { User2, BookOpen, UserCircle, ShoppingBag, MessageSquare, Settings, Package, BarChart3, Mail, HandshakeIcon, Rocket, PenTool, ClipboardCheck, Crown, Zap, Tag, LogOut, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubscriptionStatusIndicator } from "@/components/subscription/SubscriptionStatusIndicator";

interface HeaderUserDropdownProps {
  displayName: string;
  isAdmin: boolean;
  isArtist: boolean;
  hasCreatorRole: boolean;
  hasCreatorApp: boolean;
  notificationsEnabled: boolean;
  unreadCount: number;
  onSignOut: () => void;
  onSellClick: () => void;
}

function DropdownLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link
      to={href}
      onClick={onClick}
      className="flex items-center px-3 py-2 text-sm hover:bg-accent/10 transition-colors"
    >
      {children}
    </Link>
  );
}

export function HeaderUserDropdown({
  displayName,
  isAdmin,
  isArtist,
  hasCreatorRole,
  hasCreatorApp,
  notificationsEnabled,
  unreadCount,
  onSignOut,
  onSellClick,
}: HeaderUserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Account"
        className="h-9 w-9"
      >
        <User2 className="h-5 w-5" />
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-64 rounded-lg border bg-card shadow-lg z-50 max-h-[80vh] overflow-y-auto">
            <div className="p-3 border-b space-y-2">
              <p className="text-sm font-semibold truncate">{displayName}</p>
              <SubscriptionStatusIndicator />
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
              <DropdownLink href="/orders" onClick={() => setIsOpen(false)}>
                <ShoppingBag className="mr-2 h-4 w-4" />
                My Orders
              </DropdownLink>
              <DropdownLink href="/crowdfund/my-projects" onClick={() => setIsOpen(false)}>
                <Rocket className="mr-2 h-4 w-4" />
                My Campaigns
              </DropdownLink>
              {hasCreatorRole ? (
                <DropdownLink href="/creators/dashboard" onClick={() => setIsOpen(false)}>
                  <PenTool className="mr-2 h-4 w-4" />
                  Creator Dashboard
                </DropdownLink>
              ) : !hasCreatorApp && (
                <DropdownLink href="/creators/apply" onClick={() => setIsOpen(false)}>
                  <PenTool className="mr-2 h-4 w-4" />
                  Creator Application
                </DropdownLink>
              )}
              <DropdownLink href="/account/offers" onClick={() => setIsOpen(false)}>
                <HandshakeIcon className="mr-2 h-4 w-4" />
                My Offers & Trades
              </DropdownLink>
              <DropdownLink href="/trades" onClick={() => setIsOpen(false)}>
                <Package className="mr-2 h-4 w-4" />
                My Item Trades
              </DropdownLink>
              <DropdownLink href="/messages" onClick={() => setIsOpen(false)}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Messages
              </DropdownLink>
              <DropdownLink href="/elite/deals" onClick={() => setIsOpen(false)}>
                <Zap className="mr-2 h-4 w-4" />
                Deal Finder
              </DropdownLink>
              <DropdownLink href="/plans" onClick={() => setIsOpen(false)}>
                <Crown className="mr-2 h-4 w-4" />
                Plans & Upgrade
              </DropdownLink>
              <DropdownLink href="/dashboard" onClick={() => setIsOpen(false)}>
                <BarChart3 className="mr-2 h-4 w-4" />
                Dashboard
              </DropdownLink>
              <DropdownLink href="/notifications" onClick={() => setIsOpen(false)}>
                <Mail className="mr-2 h-4 w-4" />
                Notifications
              </DropdownLink>
              <DropdownLink href="/settings" onClick={() => setIsOpen(false)}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownLink>
              <DropdownLink href="/seller/dashboard" onClick={() => setIsOpen(false)}>
                <Package className="mr-2 h-4 w-4" />
                Winners & Orders
              </DropdownLink>
              <DropdownLink href="#" onClick={() => {
                setIsOpen(false);
                onSellClick();
              }}>
                <Tag className="mr-2 h-4 w-4" />
                Sell on GrailSeeker
              </DropdownLink>
              <DropdownLink href="/seller-onboarding" onClick={() => setIsOpen(false)}>
                <ClipboardCheck className="mr-2 h-4 w-4" />
                Seller Setup Guide
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
                  <DropdownLink href="/admin/settings" onClick={() => setIsOpen(false)}>
                    <Settings className="mr-2 h-4 w-4" />
                    Admin Settings
                  </DropdownLink>
                  <DropdownLink href="/creators/admin" onClick={() => setIsOpen(false)}>
                    <PenTool className="mr-2 h-4 w-4" />
                    Creator Applications (Admin)
                  </DropdownLink>
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
                onClick={() => {
                  setIsOpen(false);
                  onSignOut();
                }}
                className="flex w-full items-center px-3 py-2 text-sm hover:bg-destructive/10 text-destructive transition-colors"
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
