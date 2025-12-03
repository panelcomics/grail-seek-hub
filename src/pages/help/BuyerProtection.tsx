import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ShieldCheck, CreditCard, Lock, Eye, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function HelpBuyerProtection() {
  return (
    <main className="container mx-auto px-4 py-12 max-w-4xl">
      <Helmet>
        <title>Buyer Protection | GrailSeeker Help</title>
        <meta name="description" content="Learn how GrailSeeker protects buyers in comic book marketplace transactions." />
      </Helmet>

      <Button variant="ghost" asChild className="mb-6">
        <Link to="/help">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Help
        </Link>
      </Button>

      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4 flex items-center gap-3">
          <ShieldCheck className="h-10 w-10 text-primary" />
          Buyer Protection
        </h1>
        <p className="text-lg text-muted-foreground">
          Shop with confidence on GrailSeeker. We've got you covered.
        </p>
      </div>

      <div className="space-y-6">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <p className="text-lg font-medium text-center">
              Every eligible purchase on GrailSeeker is protected. If something goes wrong, we'll help make it right.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Secure Payments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground">
            <p>
              All payments on GrailSeeker are processed through Stripe, a PCI Level 1 certified payment processor. 
              Your payment information is encrypted and never stored on our servers.
            </p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-green-500" />
                256-bit SSL encryption on all transactions
              </li>
              <li className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-green-500" />
                Fraud detection and prevention
              </li>
              <li className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-green-500" />
                Secure checkout experience
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              What's Covered
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-green-500 font-bold">✓</span>
                <span><strong>Item Not Received:</strong> Get a full refund if your item never arrives.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 font-bold">✓</span>
                <span><strong>Not as Described:</strong> Return items that don't match the listing for a refund.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 font-bold">✓</span>
                <span><strong>Damaged Items:</strong> Protection for items damaged during shipping.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 font-bold">✓</span>
                <span><strong>Authenticity Issues:</strong> Coverage for items that are counterfeit or misrepresented.</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              What's Not Covered
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-muted-foreground">
              <li>• Transactions completed outside of GrailSeeker</li>
              <li>• Items accurately described that you simply don't want</li>
              <li>• Minor variations in condition interpretation</li>
              <li>• Claims filed more than 30 days after delivery</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How to File a Claim</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground">
            <ol className="list-decimal list-inside space-y-2">
              <li>Go to your Orders page and find the relevant order.</li>
              <li>Click "Report an Issue" or "Open Dispute".</li>
              <li>Select the reason for your claim and provide details.</li>
              <li>Upload any supporting photos or documentation.</li>
              <li>Our team will review and respond within 2-3 business days.</li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tips for Safe Buying</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-muted-foreground">
              <li>• Review seller ratings and feedback before purchasing</li>
              <li>• Look for Verified Seller badges on profiles</li>
              <li>• Read the full listing description and examine all photos</li>
              <li>• Ask questions through our messaging system before buying</li>
              <li>• Keep all communication on the GrailSeeker platform</li>
            </ul>
          </CardContent>
        </Card>

        <div className="bg-muted/50 rounded-lg p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Have questions about buyer protection? Our support team is here to help.
          </p>
          <Button asChild className="mt-4">
            <Link to="/help">Visit Help Center</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
