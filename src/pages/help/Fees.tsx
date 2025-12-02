import { Helmet } from "react-helmet-async";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, CreditCard, Truck, Shield } from "lucide-react";

export default function HelpFees() {
  return (
    <AppLayout>
      <Helmet>
        <title>Fees & Pricing | GrailSeeker</title>
        <meta name="description" content="Learn about GrailSeeker marketplace fees, seller costs, and payout structure" />
      </Helmet>

      <main className="container py-8 max-w-4xl">
        <h1 className="text-4xl font-bold mb-2">Fees & Pricing</h1>
        <p className="text-muted-foreground mb-8">
          Transparent pricing for buyers and sellers on GrailSeeker
        </p>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Seller Fees
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-semibold">Standard Platform Fee</p>
                  <p className="text-sm text-muted-foreground">Applied to all sales</p>
                </div>
                <Badge variant="secondary" className="text-lg px-3 py-1">8%</Badge>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div>
                  <p className="font-semibold text-primary">Founding Seller Rate</p>
                  <p className="text-sm text-muted-foreground">First 100 sellers only</p>
                </div>
                <Badge className="text-lg px-3 py-1">3%</Badge>
              </div>

              <p className="text-sm text-muted-foreground">
                Fees are calculated on the item price only (excluding shipping). 
                There are no listing fees or monthly subscription costs.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Payment Processing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-semibold">Stripe Processing Fee</p>
                  <p className="text-sm text-muted-foreground">Standard credit card rate</p>
                </div>
                <Badge variant="outline" className="text-lg px-3 py-1">2.9% + $0.30</Badge>
              </div>

              <p className="text-sm text-muted-foreground">
                Payment processing fees are charged by Stripe and are separate from GrailSeeker platform fees.
                These fees are deducted from seller payouts automatically.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                Shipping
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Shipping costs are set by sellers and paid by buyers at checkout. 
                GrailSeeker does not take a cut of shipping fees.
              </p>
              
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Sellers can offer free shipping or set their own rates</li>
                <li>Shipping labels can be purchased through our integrated shipping partner</li>
                <li>Local pickup is available for qualifying transactions</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Buyer Protection
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Buyers are protected through our secure payment system. 
                All transactions are processed through Stripe with buyer protection built in.
                If you have any issues with a purchase, contact our support team.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </AppLayout>
  );
}