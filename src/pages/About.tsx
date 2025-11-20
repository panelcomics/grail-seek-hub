import { Helmet } from "react-helmet-async";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Users, Zap, Shield, Heart } from "lucide-react";

export default function About() {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>About GrailSeeker - Built by Collectors, for Collectors</title>
        <meta 
          name="description" 
          content="Learn about GrailSeeker's mission to create the best marketplace for comic collectors with lower fees, AI-powered tools, and community-first approach." 
        />
      </Helmet>

      <main className="min-h-screen py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              About GrailSeeker
            </h1>
            <p className="text-xl text-muted-foreground">
              Built by collectors, for collectors.
            </p>
          </div>

          {/* Mission */}
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Heart className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-semibold mb-3">Our Mission</h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    GrailSeeker was created out of frustration with existing marketplaces that charge high fees, 
                    make listing tedious, and don't understand what collectors actually need.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    We're building the marketplace we wish existed: lower fees, AI-powered tools that make 
                    listing effortless, and features designed specifically for comic book collectors and dealers.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* What Makes Us Different */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6 text-center">What Makes Us Different</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Zap className="h-6 w-6 text-primary mt-1" />
                    <div>
                      <h3 className="font-semibold mb-2">AI-Powered Scanner</h3>
                      <p className="text-sm text-muted-foreground">
                        Our proprietary AI can identify any comic from a photo in under 3 seconds, 
                        auto-filling all the details so you can list in under a minute.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Shield className="h-6 w-6 text-primary mt-1" />
                    <div>
                      <h3 className="font-semibold mb-2">Lower Fees</h3>
                      <p className="text-sm text-muted-foreground">
                        No listing fees. 3.75% marketplace fee (vs 10-15% elsewhere). 
                        Plus 0% fees on your first 3 sales for new sellers.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Users className="h-6 w-6 text-primary mt-1" />
                    <div>
                      <h3 className="font-semibold mb-2">Community First</h3>
                      <p className="text-sm text-muted-foreground">
                        Built by collectors who understand the hobby. We listen to feedback and 
                        prioritize features that matter to our community.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Heart className="h-6 w-6 text-primary mt-1" />
                    <div>
                      <h3 className="font-semibold mb-2">Collector Tools</h3>
                      <p className="text-sm text-muted-foreground">
                        Trade boards, grail lists, portfolio tracking, and more features 
                        designed specifically for serious collectors.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Beta Notice */}
          <Card className="mb-8 bg-primary/5">
            <CardContent className="pt-6">
              <h2 className="text-xl font-semibold mb-3">We're in Beta</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                GrailSeeker is currently in beta, which means we're actively building features, 
                fixing bugs, and improving based on collector feedback. Early sellers get special 
                perks including lifetime reduced fees.
              </p>
              <p className="text-sm text-muted-foreground">
                Have feedback or feature requests? We'd love to hear from you at{" "}
                <a href="mailto:hello@grailseeker.com" className="text-primary hover:underline">
                  hello@grailseeker.com
                </a>
              </p>
            </CardContent>
          </Card>

          {/* CTA */}
          <div className="text-center">
            <Button 
              size="lg" 
              className="text-lg px-8 py-6"
              onClick={() => navigate("/sell")}
            >
              Start Selling on GrailSeeker
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}
