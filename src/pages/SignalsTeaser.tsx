import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Lock, Flame, TrendingUp, Eye, Search, Camera, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";

// Real iconic comics with accurate cover colors for visual authenticity
const SAMPLE_SIGNALS = [
  { 
    title: "Amazing Spider-Man", 
    issue: "#300", 
    publisher: "Marvel",
    year: 1988,
    heatScore: 92,
    bgGradient: "from-zinc-900 via-zinc-800 to-zinc-900",
    accentColor: "text-red-500",
    note: "1st Venom (full)",
    activity: { scans: 47, searches: 128, watches: 89 }
  },
  { 
    title: "Uncanny X-Men", 
    issue: "#266", 
    publisher: "Marvel",
    year: 1990,
    heatScore: 87,
    bgGradient: "from-amber-900 via-orange-800 to-red-900",
    accentColor: "text-amber-400",
    note: "1st Gambit",
    activity: { scans: 34, searches: 95, watches: 62 }
  },
  { 
    title: "Batman", 
    issue: "#423", 
    publisher: "DC",
    year: 1988,
    heatScore: 81,
    bgGradient: "from-slate-900 via-slate-800 to-blue-900",
    accentColor: "text-blue-400",
    note: "McFarlane Cover",
    activity: { scans: 28, searches: 76, watches: 54 }
  },
  { 
    title: "Incredible Hulk", 
    issue: "#181", 
    publisher: "Marvel",
    year: 1974,
    heatScore: 78,
    bgGradient: "from-green-900 via-emerald-800 to-green-900",
    accentColor: "text-green-400",
    note: "1st Wolverine (full)",
    activity: { scans: 22, searches: 89, watches: 71 }
  },
  { 
    title: "New Mutants", 
    issue: "#98", 
    publisher: "Marvel",
    year: 1991,
    heatScore: 74,
    bgGradient: "from-red-900 via-rose-800 to-pink-900",
    accentColor: "text-rose-400",
    note: "1st Deadpool",
    activity: { scans: 31, searches: 67, watches: 48 }
  },
  { 
    title: "Spawn", 
    issue: "#1", 
    publisher: "Image",
    year: 1992,
    heatScore: 69,
    bgGradient: "from-red-950 via-red-900 to-black",
    accentColor: "text-red-500",
    note: "McFarlane",
    activity: { scans: 19, searches: 52, watches: 38 }
  },
  { 
    title: "Teenage Mutant Ninja Turtles", 
    issue: "#1", 
    publisher: "Mirage",
    year: 1984,
    heatScore: 65,
    bgGradient: "from-zinc-900 via-neutral-800 to-zinc-900",
    accentColor: "text-emerald-400",
    note: "1st Print",
    activity: { scans: 15, searches: 44, watches: 29 }
  },
  { 
    title: "Walking Dead", 
    issue: "#1", 
    publisher: "Image",
    year: 2003,
    heatScore: 58,
    bgGradient: "from-zinc-900 via-stone-800 to-zinc-900",
    accentColor: "text-red-500",
    note: "1st Rick Grimes",
    activity: { scans: 12, searches: 38, watches: 25 }
  },
  { 
    title: "Fantastic Four", 
    issue: "#52", 
    publisher: "Marvel",
    year: 1966,
    heatScore: 52,
    bgGradient: "from-blue-900 via-indigo-800 to-purple-900",
    accentColor: "text-blue-400",
    note: "1st Black Panther",
    activity: { scans: 8, searches: 31, watches: 19 }
  },
  { 
    title: "Saga", 
    issue: "#1", 
    publisher: "Image",
    year: 2012,
    heatScore: 45,
    bgGradient: "from-purple-900 via-violet-800 to-fuchsia-900",
    accentColor: "text-violet-400",
    note: "BKV/Staples",
    activity: { scans: 9, searches: 27, watches: 18 }
  },
  { 
    title: "Detective Comics", 
    issue: "#880", 
    publisher: "DC",
    year: 2011,
    heatScore: 41,
    bgGradient: "from-slate-900 via-gray-800 to-slate-900",
    accentColor: "text-cyan-400",
    note: "Jock Cover",
    activity: { scans: 6, searches: 22, watches: 14 }
  },
  { 
    title: "Wolverine", 
    issue: "#1", 
    publisher: "Marvel",
    year: 1988,
    heatScore: 36,
    bgGradient: "from-amber-900 via-yellow-800 to-amber-900",
    accentColor: "text-amber-400",
    note: "Ongoing Series",
    activity: { scans: 5, searches: 18, watches: 11 }
  },
];

function getHeatLabel(score: number): { label: string; color: string; bgColor: string } {
  if (score >= 80) return { label: "🔥 Heating Up", color: "text-red-500", bgColor: "bg-red-500/20" };
  if (score >= 60) return { label: "Sustained Interest", color: "text-amber-500", bgColor: "bg-amber-500/20" };
  if (score >= 40) return { label: "Warming", color: "text-yellow-500", bgColor: "bg-yellow-500/20" };
  return { label: "Cooling Off", color: "text-blue-400", bgColor: "bg-blue-400/20" };
}

interface SignalData {
  title: string;
  issue: string;
  publisher: string;
  year: number;
  heatScore: number;
  bgGradient: string;
  accentColor: string;
  note: string;
  activity: { scans: number; searches: number; watches: number };
}

function HeatCard({ signal, rank, isSample = false }: { 
  signal: SignalData;
  rank: number;
  isSample?: boolean;
}) {
  const { label, color, bgColor } = getHeatLabel(signal.heatScore);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/40 hover:shadow-lg transition-all duration-300 relative group">
      {/* Stylized Cover Area */}
      <div className={`aspect-[2/3] relative overflow-hidden bg-gradient-to-br ${signal.bgGradient}`}>
        {/* Rank Badge */}
        <div className="absolute top-2 left-2 z-10">
          <div className="h-7 w-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center border border-white/20">
            <span className="text-xs font-bold text-white">{rank}</span>
          </div>
        </div>
        
        {/* Sample Data Badge */}
        {isSample && (
          <div className="absolute top-2 right-2 z-10">
            <Badge variant="secondary" className="text-[9px] bg-black/60 backdrop-blur-sm text-white/80 border-white/10">
              Demo
            </Badge>
          </div>
        )}

        {/* Comic Info Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
          {/* Publisher Logo Area */}
          <div className={`text-[10px] font-bold tracking-widest uppercase ${signal.accentColor} mb-2 opacity-80`}>
            {signal.publisher}
          </div>
          
          {/* Title */}
          <h3 className="text-white font-bold text-lg leading-tight drop-shadow-lg mb-1">
            {signal.title}
          </h3>
          
          {/* Issue */}
          <div className="text-white/90 text-2xl font-black tracking-tight mb-2">
            {signal.issue}
          </div>
          
          {/* Year */}
          <div className="text-white/60 text-xs font-medium">
            {signal.year}
          </div>
          
          {/* Key Note */}
          <div className={`mt-3 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-sm border border-white/10`}>
            <span className="text-[10px] text-white/80 font-medium">{signal.note}</span>
          </div>
        </div>

        {/* Subtle texture overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.3)_100%)]" />
        
        {/* Heat glow effect for high scores */}
        {signal.heatScore >= 80 && (
          <div className="absolute inset-0 bg-gradient-to-t from-red-500/20 via-transparent to-transparent animate-pulse" />
        )}
      </div>

      {/* Info Section */}
      <div className="p-3 space-y-2 bg-card">
        {/* Heat Score */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Flame className={`h-4 w-4 ${color}`} />
            <span className={`text-sm font-bold ${color}`}>{signal.heatScore}</span>
          </div>
          <Badge variant="secondary" className={`text-[10px] ${bgColor} ${color} border-0`}>
            {label}
          </Badge>
        </div>

        {/* Activity Indicators */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Camera className="h-3 w-3" />
            {signal.activity.scans}
          </span>
          <span className="flex items-center gap-1">
            <Search className="h-3 w-3" />
            {signal.activity.searches}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {signal.activity.watches}
          </span>
        </div>
      </div>
    </div>
  );
}

function LockedTeaserCard() {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="aspect-[2/3] relative overflow-hidden bg-gradient-to-br from-muted via-muted/80 to-muted">
        <div className="absolute inset-0 backdrop-blur-sm bg-background/40 flex flex-col items-center justify-center p-4 text-center">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3 border border-border">
            <Lock className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-semibold text-foreground mb-1">More Books Rising</p>
          <p className="text-xs text-muted-foreground mb-4">Elite members see the full Heat Index</p>
          <Button asChild size="sm" className="text-xs">
            <Link to="/plans">
              <Sparkles className="h-3 w-3 mr-1" />
              Unlock
            </Link>
          </Button>
        </div>
      </div>
      <div className="p-3 bg-muted/30">
        <div className="h-4 bg-muted rounded animate-pulse" />
      </div>
    </div>
  );
}

function ExplanationStrip() {
  return (
    <section className="py-12 bg-muted/30 border-y border-border">
      <div className="container max-w-6xl mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">Real Collector Data</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Heat Index tracks what collectors actually search, scan, and save. 
              Books rise based on genuine interest, not seller promotions.
            </p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Eye className="h-4 w-4 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">Transparent Scoring</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              No paid placements. No manipulation. We show scan activity, search volume, 
              and watchlist adds so you understand why books are heating up.
            </p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Flame className="h-4 w-4 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">Early Signals</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Collector interest often precedes market movement. Heat Index helps spot 
              what's gaining attention before prices react.
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
  
  // Build grid with locked cards interspersed
  const gridItems: React.ReactNode[] = [];
  let visibleCount = 0;
  
  for (let i = 0; i < SAMPLE_SIGNALS.length && visibleCount < 12; i++) {
    // Add locked card after every 4 visible cards
    if (visibleCount > 0 && visibleCount % 4 === 0) {
      gridItems.push(<LockedTeaserCard key={`locked-${visibleCount}`} />);
    }
    const signal = SAMPLE_SIGNALS[i];
    gridItems.push(
      <HeatCard 
        key={signal.title + signal.issue}
        signal={signal}
        rank={i + 1}
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
        <header className="py-10 md:py-14 text-center px-4 bg-gradient-to-b from-red-500/5 via-transparent to-transparent">
          <div className="container max-w-3xl mx-auto space-y-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Flame className="h-8 w-8 text-red-500 animate-pulse" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              Heat Index
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              See what collectors are actively hunting — based on real scans, searches, and watchlists.
            </p>
            <p className="text-sm text-muted-foreground/70">
              Updated in real-time • No paid placements
            </p>
          </div>
        </header>

        {/* Primary CTA */}
        <section className="pb-6 text-center px-4">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg" className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600">
              <Link to="/plans">
                <Flame className="h-4 w-4 mr-2" />
                Unlock Full Heat Index
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/scanner">Try Scanner Assist</Link>
            </Button>
          </div>
        </section>

        {/* Signal Grid */}
        <section className="py-6 px-4">
          <div className="container max-w-6xl mx-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
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
            <p className="text-muted-foreground">
              Elite members get full access to the Heat Index plus Scanner Assist, Deal Finder, and more.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild size="lg" className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600">
                <Link to="/plans">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Upgrade to Elite
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Footer tooltip */}
        <div className="pb-8 text-center">
          <p className="text-xs text-muted-foreground">
            Powered by the Grail Index™ — GrailSeeker's collector activity scoring system.
          </p>
        </div>
      </div>
    </>
  );
}
