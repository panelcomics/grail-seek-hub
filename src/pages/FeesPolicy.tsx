import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function FeesPolicy() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1 container max-w-4xl mx-auto py-8 px-4 sm:py-12">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
              Grail Seeker Fees & Trades Policy
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Grail Seeker keeps trading and selling fair and transparent. We charge only small platform fees to cover secure payments, moderation, and site operations — always shown before you confirm.
            </p>
          </div>

          <Separator className="my-8" />

          {/* Section 1: Trade Fees */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-2xl sm:text-3xl text-primary">
                Trade Fees
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm sm:text-base leading-relaxed">
              <ul className="space-y-3 list-none">
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>
                    Trades over <strong>$150</strong> have a small fee of <strong>2% + $2 total</strong>, split evenly between both traders.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Example:</strong> a $200 trade = $6 total ($3 each).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>
                    Trades <strong>under $150 have no fee.</strong>
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>
                    All fees are shown on the confirmation screen before finalizing.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>
                    Payments are securely handled through <strong>Stripe Connect</strong>.
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Section 2: Sales & Listings */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-2xl sm:text-3xl text-primary">
                Sales & Listings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm sm:text-base leading-relaxed">
              <ul className="space-y-3 list-none">
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>
                    Standard sales through Grail Seeker use Stripe and include a <strong>3% service fee</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Pro Sellers</strong> and <strong>Top Sellers</strong> may qualify for reduced fees.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>
                    Subscription plans are billed through Stripe.
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Section 3: Refunds & Disputes */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-2xl sm:text-3xl text-primary">
                Refunds & Disputes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm sm:text-base leading-relaxed">
              <ul className="space-y-3 list-none">
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>
                    Grail Seeker fees are <strong>non-refundable</strong> once a trade or sale completes.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>
                    If a trade is canceled before completion, <strong>no fees are charged</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>
                    Disputes or issues can be submitted through the Help Center or{" "}
                    <a 
                      href="mailto:support@grailseeker.app" 
                      className="text-primary hover:underline font-medium"
                    >
                      support@grailseeker.app
                    </a>.
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Section 4: Why We Keep It Low */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-2xl sm:text-3xl text-primary">
                Why We Keep It Low
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm sm:text-base leading-relaxed">
              <ul className="space-y-3 list-none">
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>
                    No inflated marketplace cuts.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>
                    No hidden processing fees.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>
                    We exist to make collector-to-collector trading <strong>sustainable and fair</strong>.
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Footer Links */}
          <div className="pt-8">
            <Separator className="mb-6" />
            <div className="flex flex-wrap gap-4 sm:gap-6 justify-center text-sm">
              <Link 
                to="/" 
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                Home
              </Link>
              <Link 
                to="/trade-board" 
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                Trades
              </Link>
              <Link 
                to="/leaderboard" 
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                Leaderboard
              </Link>
              <Link 
                to="/privacy" 
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
