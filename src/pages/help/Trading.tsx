import { Helmet } from "react-helmet-async";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { 
  ArrowLeftRight, 
  Search, 
  MessageSquare, 
  Handshake,
  Shield,
  AlertTriangle
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function HelpTrading() {
  return (
    <AppLayout>
      <Helmet>
        <title>How Trading Works | GrailSeeker</title>
        <meta name="description" content="Learn how to trade comics with other collectors on GrailSeeker" />
      </Helmet>

      <main className="container py-8 max-w-4xl">
        <h1 className="text-4xl font-bold mb-2">How Trading Works</h1>
        <p className="text-muted-foreground mb-8">
          Exchange comics directly with other collectors
        </p>

        <Alert className="mb-8">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Trading is in Beta</AlertTitle>
          <AlertDescription>
            Our trading system is currently in early development. 
            Features may change as we improve the experience based on community feedback.
          </AlertDescription>
        </Alert>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                Find Items to Trade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Browse listings marked as "Available for Trade" and find comics 
                you want to add to your collection.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowLeftRight className="h-5 w-5 text-primary" />
                Make an Offer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Select items from your inventory to offer in exchange. 
                You can include a message explaining your offer.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Negotiate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Discuss terms with the other trader. You can counter-offer 
                or adjust your trade proposal as needed.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Handshake className="h-5 w-5 text-primary" />
                Complete the Trade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Once both parties agree, coordinate shipping and 
                complete the exchange.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Trading Safety Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span>Verify the condition of items through detailed photos before agreeing to a trade</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span>Check the other user's ratings and trade history</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span>Use shipping with tracking for all trades</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span>Take photos of items before shipping as documentation</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span>Report any suspicious activity to our support team</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6">
            <h3 className="font-semibold text-lg mb-2">Start Trading Today</h3>
            <p className="text-muted-foreground mb-4">
              Mark items in your inventory as "Available for Trade" to start 
              receiving trade offers from other collectors.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/inventory">Go to My Inventory</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/trades">View My Trades</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </AppLayout>
  );
}