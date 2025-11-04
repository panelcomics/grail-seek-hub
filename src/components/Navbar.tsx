import { useState, useEffect } from "react";
import { Search, User, Menu, LogOut, Scan, BarChart3, Bell, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavbarProps {
  onShowOnboarding?: () => void;
}

export default function Navbar({ onShowOnboarding }: NavbarProps) {
  const { user, signOut } = useAuth();
  const [newDealsCount, setNewDealsCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchNewDealsCount();
    }
  }, [user]);

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

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-glow">
              <span className="text-xl font-bold text-primary-foreground">GS</span>
            </div>
            <span className="text-xl font-bold">Grail Seeker</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-sm font-medium hover:text-primary transition-colors">
              Browse
            </Link>
            <Link to="/events" className="text-sm font-medium hover:text-primary transition-colors">
              Events
            </Link>
            <Link to="/trade-board" className="text-sm font-medium hover:text-primary transition-colors">
              Trade Board
            </Link>
          </div>
        </div>

        <div className="flex flex-1 max-w-md mx-8 hidden md:flex">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search comics, cards, or sellers..."
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <>
              <Link to="/deals">
                <Button variant="outline" className="gap-2 relative">
                  <Bell className="h-4 w-4" />
                  <span className="hidden sm:inline">Deals</span>
                  {newDealsCount > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
                      {newDealsCount}
                    </Badge>
                  )}
                </Button>
              </Link>
              
              <Link to="/portfolio">
                <Button variant="outline" className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Portfolio</span>
                </Button>
              </Link>
            </>
          )}
          
          <Link to="/scanner">
            <Button variant="outline" className="gap-2">
              <Scan className="h-4 w-4" />
              <span className="hidden sm:inline">AI Scanner</span>
            </Button>
          </Link>

          <Button variant="ghost" size="icon" className="md:hidden">
            <Search className="h-5 w-5" />
          </Button>
          
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">{user.email?.split('@')[0]}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    My Profile
                  </Link>
                </DropdownMenuItem>
                {onShowOnboarding && (
                  <DropdownMenuItem onClick={onShowOnboarding}>
                    <HelpCircle className="mr-2 h-4 w-4" />
                    View Tutorial
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link to="/auth">
              <Button variant="outline" className="gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Sign In</span>
              </Button>
            </Link>
          )}
          
          <Button variant="default" className="hidden sm:flex">
            🔥 Sell Now
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </nav>
  );
}
