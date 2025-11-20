import { Link } from "react-router-dom";
import { Separator } from "@/components/ui/separator";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-muted/30 mt-auto">
      <div className="container py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="space-y-3">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-glow">
                <span className="text-lg font-bold text-primary-foreground">GS</span>
              </div>
              <span className="text-lg font-bold">Grail Seeker</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              The marketplace for collectors, by collectors.
            </p>
          </div>

          {/* Explore */}
          <div className="space-y-3">
            <h3 className="font-semibold">Explore</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/marketplace" className="text-muted-foreground hover:text-foreground transition-colors">
                  Browse Comics
                </Link>
              </li>
              <li>
                <Link to="/scanner" className="text-muted-foreground hover:text-foreground transition-colors">
                  Sell &amp; Trade
                </Link>
              </li>
              <li>
                <Link to="/sellers" className="text-muted-foreground hover:text-foreground transition-colors">
                  Top Dealers
                </Link>
              </li>
            </ul>
          </div>

          {/* Support & Legal */}
          <div className="space-y-3">
            <h3 className="font-semibold">Support &amp; Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/help" className="text-muted-foreground hover:text-foreground transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="/help" className="text-muted-foreground hover:text-foreground transition-colors">
                  Help / FAQ
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="text-center text-sm text-muted-foreground">
          <p>© {currentYear} GrailSeeker. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
