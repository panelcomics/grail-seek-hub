import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Shield, MapPin, Users, Camera, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface SafetyGuideProps {
  open: boolean;
  onClose: () => void;
  meetupLocation?: string;
  sellerName?: string;
}

export default function SafetyGuide({ 
  open, 
  onClose, 
  meetupLocation = "Unknown location",
  sellerName = "seller"
}: SafetyGuideProps) {
  const [understood, setUnderstood] = useState(false);

  const handleClose = () => {
    if (understood) {
      // Save that user has seen safety guide
      localStorage.setItem("grail-seek-safety-guide-seen", "true");
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto [&>button]:hidden">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <DialogTitle className="text-2xl">Safe Meetup Guide</DialogTitle>
              <DialogDescription>
                Meeting with {sellerName} in {meetupLocation}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Critical Safety Tips */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-700 dark:text-amber-400 mb-2">
                  Critical Safety Rules
                </h3>
                <ul className="space-y-2 text-sm text-amber-700/90 dark:text-amber-300/90">
                  <li className="flex items-start gap-2">
                    <span className="font-bold">•</span>
                    <span>Never meet at private homes or isolated locations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold">•</span>
                    <span>Always meet during daylight hours when possible</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold">•</span>
                    <span>Trust your instincts - if something feels wrong, cancel</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <Separator />

          {/* Best Practices */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Recommended Safety Practices
            </h3>

            <div className="grid gap-4">
              {/* Location */}
              <div className="flex gap-3 p-3 rounded-lg border bg-card">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                  <MapPin className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">Meet at Safe Trade Spots</h4>
                  <p className="text-sm text-muted-foreground">
                    Police department parking lots, bank lobbies, or designated "Safe Exchange Zones" 
                    with security cameras
                  </p>
                  <Badge variant="secondary" className="mt-2">
                    Recommended: Police Station Parking Lots
                  </Badge>
                </div>
              </div>

              {/* Bring Someone */}
              <div className="flex gap-3 p-3 rounded-lg border bg-card">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">Bring a Friend or Family Member</h4>
                  <p className="text-sm text-muted-foreground">
                    Never meet alone. Having someone with you significantly reduces safety risks and 
                    provides a witness to the transaction
                  </p>
                </div>
              </div>

              {/* Timing */}
              <div className="flex gap-3 p-3 rounded-lg border bg-card">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">Meet During Daylight Hours</h4>
                  <p className="text-sm text-muted-foreground">
                    Schedule meetups between 10 AM - 6 PM when areas are well-lit and busy. Avoid 
                    early morning or late evening meetings
                  </p>
                </div>
              </div>

              {/* Verification */}
              <div className="flex gap-3 p-3 rounded-lg border bg-card">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                  <Camera className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">Verify Before You Buy</h4>
                  <p className="text-sm text-muted-foreground">
                    Inspect items carefully before exchanging money. Check authenticity, condition, 
                    and match against photos. Don't feel rushed
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Safe Trade Spots */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Find Safe Trade Spots Near You
            </h3>
            <p className="text-sm text-muted-foreground">
              Many police departments offer designated "Safe Exchange Zones" with 24/7 surveillance. 
              Search for "safe exchange zone" + your city name online.
            </p>
            <div className="grid gap-2">
              <Button variant="outline" className="justify-start gap-2 h-auto py-3">
                <MapPin className="h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">Find Police Stations Nearby</div>
                  <div className="text-xs text-muted-foreground">Recommended safe meetup locations</div>
                </div>
              </Button>
              <Button variant="outline" className="justify-start gap-2 h-auto py-3">
                <MapPin className="h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">Find Bank Branches</div>
                  <div className="text-xs text-muted-foreground">Well-monitored public spaces</div>
                </div>
              </Button>
            </div>
          </div>

          <Separator />

          {/* Emergency Contacts */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              If You Feel Unsafe
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              If you feel threatened or notice suspicious behavior:
            </p>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Leave immediately and go to a public place</li>
              <li>• Call 911 if you're in immediate danger</li>
              <li>• Report suspicious users to Grail Seeker support</li>
              <li>• Share your location with a trusted contact via your phone</li>
            </ul>
          </div>

          {/* Acknowledgment */}
          <div className="flex items-start space-x-3 p-4 bg-primary/5 rounded-lg">
            <Checkbox 
              id="safety-understood"
              checked={understood}
              onCheckedChange={(checked) => setUnderstood(checked as boolean)}
            />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor="safety-understood"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                I understand these safety guidelines and will follow them
              </label>
              <p className="text-xs text-muted-foreground">
                Your safety is our priority. Please take these precautions seriously.
              </p>
            </div>
          </div>

          <Button 
            onClick={handleClose} 
            className="w-full" 
            size="lg"
            disabled={!understood}
          >
            I Understand - Proceed Safely
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
