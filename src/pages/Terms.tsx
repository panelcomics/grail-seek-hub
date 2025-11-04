import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, AlertTriangle } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
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

            {/* 1. Acceptance of Terms */}
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing or using Grail Seeker ("the Service", "the Platform"), you agree to be bound by these 
                Terms of Service. These terms constitute a legally binding agreement between you and Grail Seeker. 
                If you do not agree to these terms, you must immediately cease using the Service.
              </p>
            </section>

            <Separator />

            {/* 2. Liability Disclaimer */}
            <section>
              <h2 className="text-xl font-semibold mb-3">2. Limitation of Liability</h2>
              <div className="space-y-3 text-muted-foreground leading-relaxed">
                <p className="font-medium text-foreground">
                  Grail Seeker is a marketplace platform that facilitates connections between buyers and sellers. 
                  We are NOT responsible for:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    <strong>Meetup Safety:</strong> Any injuries, theft, fraud, or other incidents that occur during 
                    in-person meetups or local pickups. Users assume all risks associated with meeting strangers.
                  </li>
                  <li>
                    <strong>Shipping Losses:</strong> Lost, damaged, or stolen items during shipping. While we facilitate 
                    transactions, we do not guarantee delivery or condition of items.
                  </li>
                  <li>
                    <strong>Item Authenticity:</strong> The authenticity, condition, or quality of items listed on the 
                    platform. Sellers are solely responsible for accurate descriptions.
                  </li>
                  <li>
                    <strong>Financial Disputes:</strong> Any payment disputes, chargebacks, or financial losses arising 
                    from transactions between users.
                  </li>
                  <li>
                    <strong>User Conduct:</strong> The actions, behavior, or communications of other users on the platform.
                  </li>
                </ul>
                <p className="font-medium text-foreground mt-4">
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, GRAIL SEEKER SHALL NOT BE LIABLE FOR ANY DIRECT, INDIRECT, 
                  INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SERVICE.
                </p>
              </div>
            </section>

            <Separator />

            {/* 3. Warranty Disclaimer */}
            <section>
              <h2 className="text-xl font-semibold mb-3">3. Warranty Disclaimer</h2>
              <div className="space-y-3 text-muted-foreground leading-relaxed">
                <p className="font-medium text-foreground">
                  THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND.
                </p>
                <p>
                  We make no representations or warranties of any kind, express or implied, including but not limited to:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>The accuracy, reliability, or completeness of any content or information on the platform</li>
                  <li>The availability or uninterrupted operation of the Service</li>
                  <li>The security of data transmission or storage</li>
                  <li>The fitness of the Service for any particular purpose</li>
                  <li>That the Service will be error-free or that defects will be corrected</li>
                </ul>
                <p className="mt-4">
                  You acknowledge that you use the Service at your own risk. Grail Seeker disclaims all warranties, 
                  whether express, implied, or statutory, including warranties of merchantability, fitness for a 
                  particular purpose, and non-infringement.
                </p>
              </div>
            </section>

            <Separator />

            {/* 4. Indemnification */}
            <section>
              <h2 className="text-xl font-semibold mb-3">4. Indemnification</h2>
              <div className="space-y-3 text-muted-foreground leading-relaxed">
                <p>
                  You agree to indemnify, defend, and hold harmless Grail Seeker, its officers, directors, employees, 
                  agents, and affiliates from and against any and all claims, liabilities, damages, losses, costs, 
                  expenses, or fees (including reasonable attorneys' fees) arising from:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Your use or misuse of the Service</li>
                  <li>Your violation of these Terms of Service</li>
                  <li>Your violation of any rights of another party</li>
                  <li>Any disputes between you and other users</li>
                  <li>Any content you post or submit to the Service</li>
                  <li>Any transaction or interaction with other users</li>
                  <li>Any claims arising from meetups, shipping, or item exchanges</li>
                </ul>
                <p className="mt-4 font-medium text-foreground">
                  This indemnification obligation will survive the termination of your account and your use of the Service.
                </p>
              </div>
            </section>

            <Separator />

            {/* 5. Arbitration Clause */}
            <section>
              <h2 className="text-xl font-semibold mb-3">5. Dispute Resolution & Arbitration</h2>
              <div className="space-y-3 text-muted-foreground leading-relaxed">
                <p className="font-medium text-foreground">
                  PLEASE READ THIS SECTION CAREFULLY. IT AFFECTS YOUR LEGAL RIGHTS.
                </p>
                
                <h3 className="font-semibold text-foreground mt-4">5.1 Binding Arbitration</h3>
                <p>
                  Except as provided below, any dispute, claim, or controversy arising out of or relating to these 
                  Terms or the Service shall be resolved by binding arbitration rather than in court. This includes 
                  disputes relating to the interpretation, applicability, enforceability, or formation of these Terms.
                </p>

                <h3 className="font-semibold text-foreground mt-4">5.2 Arbitration Procedures</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    Arbitration shall be conducted by a neutral arbitrator in accordance with the American Arbitration 
                    Association (AAA) Consumer Arbitration Rules
                  </li>
                  <li>The arbitration will take place in the United States in a location convenient to you</li>
                  <li>Each party shall bear its own costs and expenses, including attorney fees</li>
                  <li>The arbitrator's decision will be final and binding</li>
                  <li>Judgment on the award may be entered in any court of competent jurisdiction</li>
                </ul>

                <h3 className="font-semibold text-foreground mt-4">5.3 Class Action Waiver</h3>
                <p className="font-medium text-foreground">
                  YOU AGREE THAT DISPUTES WILL BE ARBITRATED ONLY ON AN INDIVIDUAL BASIS AND NOT AS A CLASS ACTION, 
                  CONSOLIDATED, OR REPRESENTATIVE ACTION. You waive any right to participate in a class action lawsuit 
                  or class-wide arbitration.
                </p>

                <h3 className="font-semibold text-foreground mt-4">5.4 Exceptions to Arbitration</h3>
                <p>
                  Either party may seek relief in small claims court for disputes within that court's jurisdiction. 
                  Additionally, either party may seek injunctive or other equitable relief in court to prevent the 
                  actual or threatened infringement of intellectual property rights.
                </p>

                <h3 className="font-semibold text-foreground mt-4">5.5 30-Day Right to Opt Out</h3>
                <p>
                  You have the right to opt out of this arbitration agreement by sending written notice within 30 days 
                  of first accepting these Terms. The notice must include your name, address, and a clear statement that 
                  you wish to opt out of the arbitration agreement.
                </p>
              </div>
            </section>

            <Separator />

            {/* 6. User Responsibilities */}
            <section>
              <h2 className="text-xl font-semibold mb-3">6. User Responsibilities</h2>
              <div className="space-y-2 text-muted-foreground leading-relaxed">
                <p>As a user of Grail Seeker, you agree to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Provide accurate and truthful information in all listings and communications</li>
                  <li>Meet in safe, public locations for local transactions</li>
                  <li>Package items securely for shipping</li>
                  <li>Resolve disputes directly with other users in good faith</li>
                  <li>Report suspicious activity or fraudulent behavior</li>
                  <li>Comply with all applicable laws and regulations</li>
                </ul>
              </div>
            </section>

            <Separator />

            {/* 7. Termination */}
            <section>
              <h2 className="text-xl font-semibold mb-3">7. Termination</h2>
              <p className="text-muted-foreground leading-relaxed">
                Grail Seeker reserves the right to suspend or terminate your account at any time, with or without 
                notice, for any reason, including violation of these Terms. Upon termination, your right to use 
                the Service will immediately cease.
              </p>
            </section>

            <Separator />

            {/* 8. Changes to Terms */}
            <section>
              <h2 className="text-xl font-semibold mb-3">8. Changes to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to modify these Terms at any time. Changes will be effective immediately upon 
                posting to the Service. Your continued use of the Service after changes are posted constitutes your 
                acceptance of the revised Terms.
              </p>
            </section>

            <Separator />

            {/* 9. Contact */}
            <section>
              <h2 className="text-xl font-semibold mb-3">9. Contact Information</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have questions about these Terms, please contact us at: legal@grailseeker.com
              </p>
            </section>

            <Separator />

            {/* Final Notice */}
            <div className="bg-muted/50 rounded-lg p-4 mt-6">
              <p className="text-sm text-center text-muted-foreground">
                By using Grail Seeker, you acknowledge that you have read, understood, and agree to be bound by 
                these Terms of Service.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
