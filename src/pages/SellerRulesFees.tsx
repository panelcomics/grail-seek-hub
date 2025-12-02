import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, DollarSign, Truck, Shield, Clock, AlertTriangle } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function SellerRulesFees() {
  return (
    <main className="flex-1 container py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Back Button */}
        <Button variant="ghost" asChild className="mb-2">
          <Link to="/seller-onboarding">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Seller Setup
          </Link>
        </Button>

        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Seller Rules & Fees</h1>
          <p className="text-muted-foreground">
            Everything you need to know about selling on GrailSeeker
          </p>
        </div>

        {/* Fee Structure */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Fee Structure
            </CardTitle>
            <CardDescription>
              How our marketplace fees work
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <h3 className="font-semibold text-lg mb-2">Standard Seller Fee</h3>
              <p className="text-2xl font-bold text-primary">8% + $0.30</p>
              <p className="text-sm text-muted-foreground mt-1">
                Per successful sale. No listing fees, no monthly fees.
              </p>
            </div>
            
            <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
              <h3 className="font-semibold text-lg mb-2 text-green-700 dark:text-green-400">
                🌟 Founding Seller Rate
              </h3>
              <p className="text-2xl font-bold text-green-600">3% + $0.30</p>
              <p className="text-sm text-muted-foreground mt-1">
                Limited to the first 100 sellers. Locked in for life!
              </p>
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
              <h4 className="font-medium">What's included:</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Secure payment processing via Stripe</li>
                <li>Buyer protection & dispute resolution</li>
                <li>Shipping label generation (Shippo)</li>
                <li>Listing promotion on homepage carousels</li>
                <li>Scanner tool for quick comic identification</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Payouts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Payouts
            </CardTitle>
            <CardDescription>
              When and how you get paid
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-1">Payout Timing</h4>
                <p className="text-sm text-muted-foreground">
                  Funds are released after buyer confirms delivery or 7 days after tracking shows delivered.
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-1">Payout Method</h4>
                <p className="text-sm text-muted-foreground">
                  Direct deposit to your bank account via Stripe Connect. 2-3 business days.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Shipping */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              Shipping Requirements
            </CardTitle>
            <CardDescription>
              What's expected for shipping
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="font-medium min-w-[120px]">Ship within:</span>
                <span className="text-muted-foreground">3 business days of sale</span>
              </li>
              <li className="flex gap-3">
                <span className="font-medium min-w-[120px]">Tracking:</span>
                <span className="text-muted-foreground">Required for all shipments</span>
              </li>
              <li className="flex gap-3">
                <span className="font-medium min-w-[120px]">Packaging:</span>
                <span className="text-muted-foreground">Secure packaging to prevent damage (boards, bags, mailers)</span>
              </li>
              <li className="flex gap-3">
                <span className="font-medium min-w-[120px]">Labels:</span>
                <span className="text-muted-foreground">Generate discounted labels through GrailSeeker/Shippo</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Seller Guidelines */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Seller Guidelines
            </CardTitle>
            <CardDescription>
              Rules for a safe marketplace
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm">
              <div>
                <h4 className="font-medium text-green-600">✓ Do:</h4>
                <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
                  <li>Accurately describe condition (photos of any defects)</li>
                  <li>Ship promptly with tracking</li>
                  <li>Respond to buyer messages within 24 hours</li>
                  <li>Use appropriate grading terms (CGC, CBCS, raw)</li>
                  <li>Clearly note if item is a reprint or variant</li>
                </ul>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-medium text-destructive">✗ Don't:</h4>
                <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
                  <li>Misrepresent condition or authenticity</li>
                  <li>Conduct transactions outside GrailSeeker</li>
                  <li>Cancel orders without valid reason</li>
                  <li>Use someone else's photos without permission</li>
                  <li>List counterfeit or reproduction items as originals</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Policy Violations */}
        <Card className="border-amber-200 dark:border-amber-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
              Policy Violations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Violations of seller guidelines may result in warnings, listing removal, 
              account suspension, or permanent ban depending on severity. We review all 
              disputes fairly and work with both buyers and sellers to resolve issues.
            </p>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button asChild className="flex-1">
            <Link to="/seller-onboarding">
              Back to Setup Checklist
            </Link>
          </Button>
          <Button variant="outline" asChild className="flex-1">
            <Link to="/help">
              Contact Support
            </Link>
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground pt-4">
          Last updated: December 2024. Subject to change with notice.
        </p>
      </div>
    </main>
  );
}
