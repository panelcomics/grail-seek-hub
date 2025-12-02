import { Helmet } from "react-helmet-async";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { 
  Camera, 
  Tag, 
  CreditCard, 
  Package, 
  CheckCircle2,
  ArrowRight
} from "lucide-react";

export default function HelpSelling() {
  const steps = [
    {
      icon: Camera,
      title: "1. Scan or List Your Item",
      description: "Use our AI scanner to quickly identify your comic, or manually create a listing with photos and details."
    },
    {
      icon: Tag,
      title: "2. Set Your Price",
      description: "Choose your asking price. You can offer fixed price sales, auctions, or mark items available for trade."
    },
    {
      icon: CreditCard,
      title: "3. Connect Payouts",
      description: "Set up your Stripe Connect account to receive payments directly to your bank account."
    },
    {
      icon: Package,
      title: "4. Ship When Sold",
      description: "When your item sells, ship it promptly. You can purchase shipping labels directly through GrailSeeker."
    },
    {
      icon: CheckCircle2,
      title: "5. Get Paid",
      description: "Once the buyer confirms delivery, your payout is released (minus applicable fees)."
    }
  ];

  return (
    <AppLayout>
      <Helmet>
        <title>How Selling Works | GrailSeeker</title>
        <meta name="description" content="Learn how to sell comics on GrailSeeker marketplace" />
      </Helmet>

      <main className="container py-8 max-w-4xl">
        <h1 className="text-4xl font-bold mb-2">How Selling Works</h1>
        <p className="text-muted-foreground mb-8">
          Everything you need to know about selling on GrailSeeker
        </p>

        <div className="space-y-4 mb-8">
          {steps.map((step, index) => (
            <Card key={index}>
              <CardContent className="flex items-start gap-4 p-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <step.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle>Ready to Start Selling?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Complete your seller setup and list your first item today. 
              As a new platform, we're offering reduced fees for our first 100 sellers!
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/seller-onboarding">
                  Seller Setup Guide
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/help/fees">View Fee Structure</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 space-y-6">
          <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>
          
          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <h4 className="font-semibold mb-1">How long until I get paid?</h4>
                <p className="text-sm text-muted-foreground">
                  Payouts are typically processed within 2-3 business days after the buyer confirms delivery.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-1">Can I cancel a listing?</h4>
                <p className="text-sm text-muted-foreground">
                  Yes, you can deactivate or delete listings at any time from your inventory dashboard.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-1">What if a buyer doesn't pay?</h4>
                <p className="text-sm text-muted-foreground">
                  All payments are processed upfront through Stripe, so you'll never ship an item without payment.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </AppLayout>
  );
}