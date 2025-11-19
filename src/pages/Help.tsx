import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { CheckCircle2, AlertCircle, Loader2, Mail, Clock } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const disputeSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  tradeId: z.string().trim().optional(),
  description: z.string().trim().min(10, "Description must be at least 10 characters").max(5000, "Description must be less than 5000 characters"),
});

export default function Help() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    tradeId: "",
    description: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      // Validate form data
      const validatedData = disputeSchema.parse(formData);

      // Get current session if exists
      const { data: { session } } = await supabase.auth.getSession();

      // Submit dispute
      const { data, error } = await supabase.functions.invoke('submit-dispute', {
        body: {
          name: validatedData.name,
          email: validatedData.email,
          tradeId: validatedData.tradeId || undefined,
          description: validatedData.description,
        },
        headers: session?.access_token ? {
          Authorization: `Bearer ${session.access_token}`
        } : undefined
      });

      if (error) throw error;

      setSubmitted(true);
      toast.success("Dispute submitted successfully!");
      
      // Reset form
      setFormData({
        name: "",
        email: "",
        tradeId: "",
        description: "",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.issues.forEach((issue) => {
          if (issue.path[0]) {
            fieldErrors[issue.path[0].toString()] = issue.message;
          }
        });
        setErrors(fieldErrors);
        toast.error("Please fix the errors in the form");
      } else {
        console.error("Error submitting dispute:", error);
        toast.error("Failed to submit dispute. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <main className="flex-1 container max-w-4xl mx-auto py-8 px-4 sm:py-12">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
              Help & Disputes Center
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Need help with a trade, sale, or technical issue? We're here to make Grail Seeker a safe and trusted place for collectors. Use the options below to get quick support or open a dispute.
            </p>
          </div>

          <Separator className="my-8" />

          {/* Section 1: Common Questions */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-2xl sm:text-3xl text-primary">
                Common Questions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-sm sm:text-base">
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">
                  What if my trade partner doesn't ship?
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Contact them first using in-app messages. If unresolved after 5 days, open a dispute below.
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">
                  Can I cancel a trade?
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  You can cancel any pending trade before both sides confirm. No fees are charged.
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">
                  What happens if I'm scammed?
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Report it immediately using the form below. Our team will review communication logs and Stripe transactions.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Dispute Form */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-2xl sm:text-3xl text-primary">
                Open a Dispute
              </CardTitle>
              <CardDescription>
                Fill out the form below to report an issue. We'll respond within 48 hours.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {submitted ? (
                <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <AlertDescription className="text-green-800 dark:text-green-200">
                    <strong>Your dispute has been received.</strong> Our team will review and respond within 48 hours.
                  </AlertDescription>
                </Alert>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Your full name"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      className={errors.name ? "border-destructive" : ""}
                      required
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.name}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your.email@example.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      className={errors.email ? "border-destructive" : ""}
                      required
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tradeId">Trade ID (optional)</Label>
                    <Input
                      id="tradeId"
                      type="text"
                      placeholder="Enter trade ID if applicable"
                      value={formData.tradeId}
                      onChange={(e) => handleInputChange("tradeId", e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      If your dispute is related to a specific trade, you can include the trade ID here.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description of Issue *</Label>
                    <Textarea
                      id="description"
                      placeholder="Please describe your issue in detail. Include dates, usernames, and any relevant information..."
                      value={formData.description}
                      onChange={(e) => handleInputChange("description", e.target.value)}
                      className={`min-h-32 ${errors.description ? "border-destructive" : ""}`}
                      required
                    />
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {formData.description.length}/5000 characters
                      </p>
                      {errors.description && (
                        <p className="text-sm text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={loading} 
                    className="w-full"
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Submit Dispute
                      </>
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Section 3: Resolution Policy */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-2xl sm:text-3xl text-primary">
                Resolution Policy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm sm:text-base leading-relaxed text-muted-foreground">
              <p>
                We review every dispute fairly and may refund or reverse fees if a trade clearly violates our terms.
              </p>
              <p className="font-medium text-destructive">
                False or abusive dispute filings may result in account suspension.
              </p>
            </CardContent>
          </Card>

          {/* Section 4: Contact & Support */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-2xl sm:text-3xl text-primary">
                Contact & Support
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-sm sm:text-base">
                <Mail className="h-5 w-5 text-primary flex-shrink-0" />
                <div>
                  <p className="font-medium">Email Support</p>
                  <a 
                    href="mailto:support@grailseeker.app" 
                    className="text-primary hover:underline"
                  >
                    support@grailseeker.app
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm sm:text-base">
                <Clock className="h-5 w-5 text-primary flex-shrink-0" />
                <div>
                  <p className="font-medium">Business Hours</p>
                  <p className="text-muted-foreground">Mon–Fri, 9am–5pm CST</p>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="flex flex-wrap gap-4 text-sm">
                <Link 
                  to="/fees" 
                  className="text-primary hover:underline"
                >
                  Fee Policy
                </Link>
                <Link 
                  to="/privacy" 
                  className="text-primary hover:underline"
                >
                  Privacy Policy
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Reassurance Footer */}
          <div className="text-center pt-4">
            <p className="text-sm text-muted-foreground">
              Grail Seeker is powered by <strong>Stripe</strong> for secure payments and trade protection.
            </p>
          </div>
      </div>
    </main>
  );
}
