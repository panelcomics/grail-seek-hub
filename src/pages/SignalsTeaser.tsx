import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Lock, TrendingUp, Eye, Scan, Package } from "lucide-react";

const SIGNAL_BADGES = [
  { label: "Quietly Heating Up", icon: TrendingUp },
  { label: "Watchlist Spike", icon: Eye },
  { label: "Unusual Scan Activity", icon: Scan },
  { label: "Supply Tightening", icon: Package },
];

const MOCK_SIGNALS = [
  { title: "Amazing Spider-Man", issue: "#300", cover: "/covers/sample-spawn.jpg" },
  { title: "X-Men", issue: "#1", cover: "/covers/sample-xmen.jpg" },
  { title: "Batman", issue: "#423", cover: "/covers/sample-batman.jpg" },
  { title: "Fantastic Four", issue: "#52", cover: "/covers/sample-ff.jpg" },
  { title: "Incredible Hulk", issue: "#181", cover: "/covers/sample-hulk.jpg" },
  { title: "Action Comics", issue: "#1", cover: "/covers/sample-asm.jpg" },
  { title: "Detective Comics", issue: "#27", cover: "/covers/sample-batman.jpg" },
  { title: "New Mutants", issue: "#98", cover: "/covers/sample-spawn.jpg" },
  { title: "Spawn", issue: "#1", cover: "/covers/sample-spawn.jpg" },
  { title: "Walking Dead", issue: "#1", cover: "/covers/sample-hulk.jpg" },
  { title: "Teenage Mutant Ninja Turtles", issue: "#1", cover: "/covers/sample-ff.jpg" },
  { title: "Saga", issue: "#1", cover: "/covers/sample-xmen.jpg" },
];

function SignalCard({ title, issue, cover, badgeIndex }: { 
  title: string; 
  issue: string; 
  cover: string; 
  badgeIndex: number;
}) {
  const badge = SIGNAL_BADGES[badgeIndex % SIGNAL_BADGES.length];
  const BadgeIcon = badge.icon;

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary/30 transition-colors">
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
        <div className="flex items-center gap-1.5 text-xs text-primary">
          <BadgeIcon className="h-3 w-3" />
          <span>{badge.label}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Increased collector attention detected this week
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
          <p className="text-sm font-medium text-foreground mb-1">More signals detected</p>
          <p className="text-xs text-muted-foreground mb-3">Elite members see why these books matter</p>
          <Button asChild size="sm" variant="outline" className="text-xs">
            <Link to="/plans">See Full Signal Breakdown</Link>
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
            <h3 className="font-semibold text-foreground">What is a Signal?</h3>
            <p className="text-sm text-muted-foreground">
              Signals detect patterns in collector behavior — watchlist additions, scanner activity, 
              and inventory changes — aggregated and anonymized across the platform.
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
              Collector interest often precedes visible market movement. Signals help you spot 
              what's gaining attention before it becomes obvious.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function SignalsTeaser() {
  // Build grid with locked cards after every 3 visible cards
  const gridItems: React.ReactNode[] = [];
  let visibleCount = 0;
  
  for (let i = 0; i < MOCK_SIGNALS.length && visibleCount < 12; i++) {
    if (visibleCount > 0 && visibleCount % 3 === 0) {
      gridItems.push(<LockedTeaserCard key={`locked-${visibleCount}`} />);
    }
    const signal = MOCK_SIGNALS[i];
    gridItems.push(
      <SignalCard 
        key={signal.title + signal.issue}
        title={signal.title}
        issue={signal.issue}
        cover={signal.cover}
        badgeIndex={i}
      />
    );
    visibleCount++;
  }

  return (
    <>
      <Helmet>
        <title>Quiet Collector Signals | GrailSeeker</title>
        <meta 
          name="description" 
          content="Comics showing unusual collector interest — before the market reacts. Powered by anonymized watchlist, scanner, and activity data." 
        />
        <meta property="og:title" content="Quiet Collector Signals | GrailSeeker" />
        <meta property="og:description" content="Comics showing unusual collector interest — before the market reacts." />
        <link rel="canonical" href="/signals" />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="py-12 md:py-16 text-center px-4">
          <div className="container max-w-3xl mx-auto space-y-4">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              Quiet Collector Signals
            </h1>
            <p className="text-lg text-muted-foreground">
              Comics showing unusual collector interest — before the market reacts.
            </p>
            <p className="text-sm text-muted-foreground/80">
              Powered by anonymized watchlist, scanner, and activity data.
            </p>
          </div>
        </header>

        {/* Primary CTA */}
        <section className="pb-8 text-center px-4">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/plans">Unlock Full Signals</Link>
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
                <Link to="/plans">Unlock Elite Signals</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/scanner">Try Scanner Assist</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
