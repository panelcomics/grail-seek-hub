import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/layout/AppLayout";
import { Shield, Lock, Mail, MapPin, Bell, UserX } from "lucide-react";

const Privacy = () => {
  return (
    <AppLayout>
      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground">
            Last Updated: November 4, 2025
          </p>
        </div>

        <div className="space-y-6">
          {/* Data Minimization */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-semibold mb-3">Data Minimization</h2>
                  <p className="text-muted-foreground mb-4">
                    We believe in collecting only what we need. Grail Seeker operates on a principle of data minimization to protect your privacy.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Email Address</p>
                        <p className="text-sm text-muted-foreground">
                          Used solely for account authentication, transaction notifications, and optional deal alerts. We never sell or share your email with third parties.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Location Data</p>
                        <p className="text-sm text-muted-foreground">
                          Only collected when you voluntarily enter a city/state for local trades or deal alerts. Your precise GPS location is never tracked or stored.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Bell className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Trade Preferences</p>
                        <p className="text-sm text-muted-foreground">
                          Information about items you're seeking or selling is stored to facilitate trades. This data is only visible to other users when you actively list items or create trade posts.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Consent & Opt-in */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <Bell className="h-6 w-6 text-green-500" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-semibold mb-3">Your Consent & Control</h2>
                  <p className="text-muted-foreground mb-4">
                    We respect your right to control how we communicate with you. All alerts and promotional communications require your explicit opt-in consent.
                  </p>
                  <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                    <h3 className="font-semibold">You Control:</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span>Deal alert notifications (email and push) - opt-in required for each custom alert</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span>Marketing communications - can be disabled at any time in Settings</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span>Trade post visibility - you choose when to publish or hide your listings</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span>Profile information - all fields beyond email are optional</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Encryption & Security */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <Lock className="h-6 w-6 text-blue-500" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-semibold mb-3">Encryption & Security</h2>
                  <p className="text-muted-foreground mb-4">
                    Your data security is our top priority. We implement industry-standard encryption and security practices.
                  </p>
                  <div className="space-y-3 text-sm">
                    <div className="border-l-2 border-blue-500 pl-4">
                      <p className="font-medium">Data in Transit</p>
                      <p className="text-muted-foreground">
                        All data transmitted between your device and our servers is encrypted using TLS 1.3 (Transport Layer Security), the same encryption used by banks and financial institutions.
                      </p>
                    </div>
                    <div className="border-l-2 border-blue-500 pl-4">
                      <p className="font-medium">Data at Rest</p>
                      <p className="text-muted-foreground">
                        Your personal information is stored in encrypted databases with AES-256 encryption. Access is restricted to authorized systems only.
                      </p>
                    </div>
                    <div className="border-l-2 border-blue-500 pl-4">
                      <p className="font-medium">Password Protection</p>
                      <p className="text-muted-foreground">
                        Passwords are hashed using bcrypt with salt, meaning even we cannot see your password. We never store passwords in plain text.
                      </p>
                    </div>
                    <div className="border-l-2 border-blue-500 pl-4">
                      <p className="font-medium">Payment Security</p>
                      <p className="text-muted-foreground">
                        Payment information is never stored on our servers. All transactions are processed through PCI-DSS compliant payment processors.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CCPA & California Privacy Rights */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-500/10 rounded-lg">
                  <UserX className="h-6 w-6 text-amber-500" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-semibold mb-3">California Privacy Rights (CCPA)</h2>
                  <p className="text-muted-foreground mb-4">
                    If you are a California resident, you have specific rights regarding your personal information under the California Consumer Privacy Act (CCPA).
                  </p>
                  <div className="space-y-4">
                    <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                      <h3 className="font-semibold">Your CCPA Rights:</h3>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span><strong>Right to Know:</strong> Request disclosure of personal information we collect, use, or disclose</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span><strong>Right to Delete:</strong> Request deletion of your personal information</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span><strong>Right to Opt-Out:</strong> Opt-out of the sale of personal information</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span><strong>Non-Discrimination:</strong> We will not discriminate against you for exercising your rights</span>
                        </li>
                      </ul>
                    </div>
                    <div className="border border-amber-500/20 bg-amber-500/5 p-4 rounded-lg">
                      <h3 className="font-semibold mb-2 flex items-center gap-2">
                        <UserX className="h-5 w-5 text-amber-500" />
                        Do Not Sell My Personal Information
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        <strong>Important:</strong> Grail Seeker does not sell your personal information to third parties. We do not engage in the sale of user data for advertising or any other purpose.
                      </p>
                      <p className="text-sm text-muted-foreground mb-4">
                        However, to exercise your CCPA rights or submit a formal "Do Not Sell" request, you can contact us at:
                      </p>
                      <Button variant="outline" className="w-full sm:w-auto">
                        <Mail className="mr-2 h-4 w-4" />
                        privacy@grailseeker.com
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Retention */}
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-2xl font-semibold mb-3">Data Retention</h2>
              <p className="text-muted-foreground mb-4">
                We retain your personal information only as long as necessary to provide our services and comply with legal obligations.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Active account data is retained while your account is active</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Transaction records are kept for 7 years for tax and legal compliance</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>If you delete your account, personal data is removed within 30 days (except legally required records)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Anonymized usage data may be retained for analytics purposes</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-2xl font-semibold mb-3">Contact Us</h2>
              <p className="text-muted-foreground mb-4">
                If you have any questions about this Privacy Policy or your data rights, please contact us:
              </p>
              <div className="space-y-2 text-sm">
                <p><strong>Email:</strong> privacy@grailseeker.com</p>
                <p><strong>Address:</strong> Grail Seeker Privacy Team, 123 Collector Lane, San Francisco, CA 94102</p>
              </div>
            </CardContent>
          </Card>

          {/* Updates Notice */}
          <div className="text-sm text-muted-foreground border-t pt-6">
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. Continued use of Grail Seeker after changes constitutes acceptance of the updated policy.
            </p>
          </div>
        </div>
      </main>
    </AppLayout>
  );
};

export default Privacy;
