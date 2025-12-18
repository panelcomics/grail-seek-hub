import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Lock, Flame } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";

// Sample data for teaser display - clearly labeled for non-logged-in users
const SAMPLE_SIGNALS = [
  { title: "Amazing Spider-Man", issue: "#300", cover: "/covers/sample-spawn.jpg", heatScore: 87 },
  { title: "X-Men", issue: "#1", cover: "/covers/sample-xmen.jpg", heatScore: 82 },
  { title: "Batman", issue: "#423", cover: "/covers/sample-batman.jpg", heatScore: 76 },
  { title: "Fantastic Four", issue: "#52", cover: "/covers/sample-ff.jpg", heatScore: 71 },
  { title: "Incredible Hulk", issue: "#181", cover: "/covers/sample-hulk.jpg", heatScore: 65 },
  { title: "Action Comics", issue: "#1", cover: "/covers/sample-asm.jpg", heatScore: 58 },
  { title: "Detective Comics", issue: "#27", cover: "/covers/sample-batman.jpg", heatScore: 52 },
  { title: "New Mutants", issue: "#98", cover: "/covers/sample-spawn.jpg", heatScore: 45 },
  { title: "Spawn", issue: "#1", cover: "/covers/sample-spawn.jpg", heatScore: 38 },
  { title: "Walking Dead", issue: "#1", cover: "/covers/sample-hulk.jpg", heatScore: 32 },
  { title: "Teenage Mutant Ninja Turtles", issue: "#1", cover: "/covers/sample-ff.jpg", heatScore: 28 },
  { title: "Saga", issue: "#1", cover: "/covers/sample-xmen.jpg", heatScore: 22 },
];

function getHeatLabel(score: number): { label: string; color: string } {
  if (score >= 70) return { label: "Heating Up", color: "text-red-500" };
  if (score >= 40) return { label: "Sustained Interest", color: "text-amber-500" };
  return { label: "Cooling Off", color: "text-blue-400" };
}

function HeatCard({ title, issue, cover, heatScore, isSample = false }: { 
  title: string; 
  issue: string; 
  cover: string; 
  heatScore: number;
  isSample?: boolean;
}) {
  const { label, color } = getHeatLabel(heatScore);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary/30 transition-colors relative">
      {/* Sample data indicator - only shown for non-logged-in users */}
      {isSample && (
        <div className="absolute top-2 left-2 z-10">
          <Badge variant="secondary" className="text-[9px] bg-muted/90 backdrop-blur-sm">
            Sample Data
          </Badge>
        </div>
      )}
      <div className="aspect-[2/3] relative overflow-hidden bg-muted">
        <img 
          src={cover} 
          alt={`${title} ${issue}`}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="p-3 space-y-2">
        <h3 className="font-semibold text-sm text-foreground line-clamp-1">
          {title} {issue}
        </h3>
        <div className="flex items-center gap-1.5 text-xs">
          <Flame className={`h-3 w-3 ${color}`} />
          <span className={color}>Heat: {heatScore}</span>
          <span className="text-muted-foreground">· {label}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Collector activity detected this week
        </p>
      </div>
    </div>
  );
}

function LockedTeaserCard() {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="aspect-[2/3] relative overflow-hidden bg-muted">
        <div className="absolute inset-0 backdrop-blur-md bg-background/60 flex flex-col items-center justify-center p-4 text-center">
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
            <Lock className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">More books heating up</p>
          <p className="text-xs text-muted-foreground mb-3">Elite members see the full Heat Index</p>
          <Button asChild size="sm" variant="outline" className="text-xs">
            <Link to="/plans">See Full Heat Index</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function ExplanationStrip() {
  return (
    <section className="py-12 bg-muted/30 border-y border-border">
      <div className="container max-w-6xl mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground">How Heat Index Works</h3>
            <p className="text-sm text-muted-foreground">
              Heat Index is driven by real collector behavior, not seller listings or promotions.
              Books rise when collectors search for them more often, add them to wantlists, and actively track them over time.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground">What We Don't Show</h3>
            <p className="text-sm text-muted-foreground">
              No paid placements. No manipulation. No seller names. Just real behavioral patterns 
              from actual collectors on the platform.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground">Why It Matters</h3>
            <p className="text-sm text-muted-foreground">
              Collector interest often precedes visible market movement. Heat Index helps you spot 
              what's gaining attention before it becomes obvious.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function SignalsTeaser() {
  const { user } = useAuth();
  const { isElite } = useSubscriptionTier();
  
  // Hide sample data for logged-in Elite users - they see real data on /elite/signals
  const showSampleData = !user || !isElite;
  
  // Build grid with locked cards after every 3 visible cards
  const gridItems: React.ReactNode[] = [];
  let visibleCount = 0;
  
  for (let i = 0; i < SAMPLE_SIGNALS.length && visibleCount < 12; i++) {
    if (visibleCount > 0 && visibleCount % 3 === 0) {
      gridItems.push(<LockedTeaserCard key={`locked-${visibleCount}`} />);
    }
    const signal = SAMPLE_SIGNALS[i];
    gridItems.push(
      <HeatCard 
        key={signal.title + signal.issue}
        title={signal.title}
        issue={signal.issue}
        cover={signal.cover}
        heatScore={signal.heatScore}
        isSample={showSampleData}
      />
    );
    visibleCount++;
  }

  return (
    <>
      <Helmet>
        <title>🔥 Heat Index | GrailSeeker</title>
        <meta 
          name="description" 
          content="Comics getting real collector attention right now — based on what collectors are searching, saving, and tracking." 
        />
        <meta property="og:title" content="🔥 Heat Index | GrailSeeker" />
        <meta property="og:description" content="Comics getting real collector attention right now — before the market reacts." />
        <link rel="canonical" href="/signals" />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="py-12 md:py-16 text-center px-4">
          <div className="container max-w-3xl mx-auto space-y-4">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              🔥 Heat Index
            </h1>
            <p className="text-lg text-muted-foreground">
              Comics getting real collector attention right now — based on what collectors are searching, saving, and tracking.
            </p>
            <p className="text-sm text-muted-foreground/80">
              No paid boosts. No seller hype. Just collector activity.
            </p>
          </div>
        </header>

        {/* Primary CTA */}
        <section className="pb-8 text-center px-4">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/plans">See What's Heating Up</Link>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <Link to="/scanner">Try Scanner Assist</Link>
            </Button>
          </div>
        </section>

        {/* Signal Grid */}
        <section className="py-8 px-4">
          <div className="container max-w-6xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {gridItems}
            </div>
          </div>
        </section>

        {/* Explanation Strip */}
        <ExplanationStrip />

        {/* Footer CTA */}
        <section className="py-12 md:py-16 text-center px-4">
          <div className="container max-w-2xl mx-auto space-y-6">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">
              See What Collectors Are Watching — Early
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild size="lg">
                <Link to="/plans">Unlock Full Heat Index</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/scanner">Try Scanner Assist</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Footer tooltip */}
        <div className="pb-8 text-center">
          <p className="text-xs text-muted-foreground">
            Powered by the Grail Index™, GrailSeeker's internal collector activity scoring system.
          </p>
        </div>
      </div>
    </>
  );
}
