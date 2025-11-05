import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

export default function FeesPolicy() {
  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl sm:text-3xl">Trade Fee Policy</CardTitle>
          <CardDescription>
            Understanding Grail Seeker's platform fees for trades
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>No fees for trades under $150!</strong> We want to encourage community trading of lower-value items.
            </AlertDescription>
          </Alert>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Fee Structure</h2>
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <p className="font-medium">Standard Fee: 2% + $2.00</p>
              <p className="text-sm text-muted-foreground">
                This fee is calculated on the agreed trade value and split evenly (50/50) between both traders.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Examples</h2>
            <div className="space-y-3">
              <div className="border rounded-lg p-4">
                <p className="font-medium mb-2">Trade Value: $100</p>
                <div className="text-sm space-y-1">
                  <p className="text-green-600 font-medium">✓ No fee (below $150 threshold)</p>
                  <p className="text-muted-foreground">Each trader pays: $0.00</p>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <p className="font-medium mb-2">Trade Value: $200</p>
                <div className="text-sm space-y-1">
                  <p>Platform Fee: ($200 × 2%) + $2 = <strong>$6.00</strong></p>
                  <p className="text-muted-foreground">Each trader pays: <strong>$3.00</strong></p>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <p className="font-medium mb-2">Trade Value: $500</p>
                <div className="text-sm space-y-1">
                  <p>Platform Fee: ($500 × 2%) + $2 = <strong>$12.00</strong></p>
                  <p className="text-muted-foreground">Each trader pays: <strong>$6.00</strong></p>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <p className="font-medium mb-2">Trade Value: $1,000</p>
                <div className="text-sm space-y-1">
                  <p>Platform Fee: ($1,000 × 2%) + $2 = <strong>$22.00</strong></p>
                  <p className="text-muted-foreground">Each trader pays: <strong>$11.00</strong></p>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Payment Process</h2>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
              <li>Both traders must agree to the trade value before fees are calculated</li>
              <li>Each trader pays their 50% share separately via Stripe</li>
              <li>The trade is only finalized once both payments are successful</li>
              <li>If either payment fails, both traders are notified and the trade status is updated</li>
              <li>All fees are rounded to two decimal places</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Why We Charge Fees</h2>
            <p className="text-sm text-muted-foreground">
              Platform fees help us maintain and improve Grail Seeker, including:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
              <li>Secure payment processing and fraud protection</li>
              <li>Customer support for trade disputes</li>
              <li>Platform maintenance and hosting</li>
              <li>New features and improvements</li>
              <li>Community safety and moderation</li>
            </ul>
          </section>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Questions?</strong> Contact our support team if you have any questions about fees or billing.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
