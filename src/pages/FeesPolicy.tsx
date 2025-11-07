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
                Trade Fees (Tiered Structure)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm sm:text-base leading-relaxed">
              <p className="text-muted-foreground mb-4">
                Trade fees are based on the total trade value (item A + item B):
              </p>
              <ul className="space-y-3 list-none">
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>$0-$50:</strong> $2 total ($1 each)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>$51-$100:</strong> $5 total ($2.50 each)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>$101-$250:</strong> $12 total ($6 each)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>$251-$500:</strong> $22 total ($11 each)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>$501-$1,000:</strong> $35 total ($17.50 each)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>$1,001-$2,000:</strong> $45 total ($22.50 each)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>$2,001-$4,000:</strong> $55 total ($27.50 each)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>$4,001-$5,000:</strong> $60 total ($30 each)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>$5,001-$10,000:</strong> $200 total ($100 each)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>$10,001+:</strong> $200 total ($100 each) — capped
                  </span>
                </li>
                <li className="flex items-start gap-2 mt-4">
                  <ArrowRight className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>
                    All fees are shown before you confirm and split evenly between both traders.
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
                    Standard sales through Grail Seeker include a <strong>3.5% service fee</strong> on the total (item price + shipping + tax).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Example:</strong> A $100 item with $10 shipping = $110 total × 3.5% = $3.85 fee.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>
                    All payments are securely processed through Stripe.
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
