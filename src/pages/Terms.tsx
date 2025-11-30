import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, AlertTriangle } from "lucide-react";

export default function Terms() {
  return (
    <main className="container mx-auto px-4 py-8 mt-20 max-w-4xl">
      <div className="mb-6">
        <Link to="/">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Terms of Service</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Last Updated: {new Date().toLocaleDateString()}
          </p>
        </CardHeader>
        <CardContent className="space-y-6 text-sm">
          {/* Important Notice */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="font-semibold text-amber-700 dark:text-amber-400">
                  Important Legal Notice
                </p>
                <p className="text-amber-700/90 dark:text-amber-300/90">
                  Please read these terms carefully. By using Grail Seeker, you agree to be bound by these terms.
                  If you do not agree, do not use this platform.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing and using Grail Seeker, you accept and agree to be bound by the terms and provision of this agreement.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Use License</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Permission is granted to temporarily access the materials on Grail Seeker for personal, non-commercial transitory viewing only.
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>This is the grant of a license, not a transfer of title</li>
              <li>You may not modify or copy the materials</li>
              <li>You may not use the materials for any commercial purpose</li>
              <li>You may not attempt to decompile or reverse engineer any software</li>
            </ul>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Disclaimer</h2>
            <p className="text-muted-foreground leading-relaxed">
              The materials on Grail Seeker are provided on an 'as is' basis. Grail Seeker makes no warranties, expressed or implied,
              and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of
              merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Limitations</h2>
            <p className="text-muted-foreground leading-relaxed">
              In no event shall Grail Seeker or its suppliers be liable for any damages (including, without limitation, damages for loss of
              data or profit, or due to business interruption) arising out of the use or inability to use the materials on Grail Seeker.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Accuracy of Materials</h2>
            <p className="text-muted-foreground leading-relaxed">
              The materials appearing on Grail Seeker could include technical, typographical, or photographic errors. Grail Seeker does not
              warrant that any of the materials on its website are accurate, complete or current.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Links</h2>
            <p className="text-muted-foreground leading-relaxed">
              Grail Seeker has not reviewed all of the sites linked to its website and is not responsible for the contents of any such linked site.
              The inclusion of any link does not imply endorsement by Grail Seeker of the site. Use of any such linked website is at the user's own risk.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Modifications</h2>
            <p className="text-muted-foreground leading-relaxed">
              Grail Seeker may revise these terms of service at any time without notice. By using this website you are agreeing to be bound by
              the then current version of these terms of service.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These terms and conditions are governed by and construed in accordance with the laws and you irrevocably submit to the
              exclusive jurisdiction of the courts in that location.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Contact Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about these Terms, please contact us through our support channels.
            </p>
          </section>
        </CardContent>
      </Card>
    </main>
  );
}
