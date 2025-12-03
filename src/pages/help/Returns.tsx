import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, RotateCcw, Shield, Clock, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function HelpReturns() {
  return (
    <main className="container mx-auto px-4 py-12 max-w-4xl">
      <Helmet>
        <title>Returns & Refunds | GrailSeeker Help</title>
        <meta name="description" content="GrailSeeker return and refund policy for comic book marketplace transactions." />
      </Helmet>

      <Button variant="ghost" asChild className="mb-6">
        <Link to="/help">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Help
        </Link>
      </Button>

      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4 flex items-center gap-3">
          <RotateCcw className="h-10 w-10 text-primary" />
          Returns & Refunds
        </h1>
        <p className="text-lg text-muted-foreground">
          Our policies to ensure fair transactions for buyers and sellers.
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              General Policy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground">
            <p>
              GrailSeeker is committed to ensuring that all transactions on our platform are fair and transparent. 
              Our return policy is designed to protect both buyers and sellers while maintaining the integrity of 
              the collectibles marketplace.
            </p>
            <p>
              All sales are generally considered final once an item has been shipped. However, we understand that 
              issues can arise, and we have processes in place to handle disputes fairly.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Eligible Return Situations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span><strong>Item Not as Described:</strong> If the item received significantly differs from the listing description, photos, or stated condition.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span><strong>Damaged in Transit:</strong> If the item arrives damaged due to improper packaging or shipping issues.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span><strong>Wrong Item Sent:</strong> If you receive an item different from what you ordered.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span><strong>Counterfeit Items:</strong> If the item is determined to be counterfeit or not authentic.</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              How to Request a Return
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground">
            <ol className="list-decimal list-inside space-y-2">
              <li>Contact the seller directly through GrailSeeker messaging within 48 hours of receiving your item.</li>
              <li>Provide clear photos and a detailed description of the issue.</li>
              <li>Allow the seller 48 hours to respond and propose a resolution.</li>
              <li>If you cannot reach an agreement, open a dispute through our support system.</li>
            </ol>
            <p className="text-sm italic">
              Note: Return shipping costs are typically the responsibility of the party at fault. 
              Buyers are responsible for return shipping if they simply changed their mind about a purchase.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Refund Timeline</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            <p>
              Once a return is approved and the item is received back by the seller in its original condition, 
              refunds are typically processed within 5-7 business days. Refunds will be credited to the original 
              payment method used for the purchase.
            </p>
          </CardContent>
        </Card>

        <div className="bg-muted/50 rounded-lg p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Need help with a specific order? Contact our support team or open a dispute through your order details page.
          </p>
          <Button asChild className="mt-4">
            <Link to="/help">Visit Help Center</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
