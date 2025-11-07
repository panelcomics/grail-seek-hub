import { useEffect, useState } from "react";

/** 
 * Data contracts you can swap to Supabase/Lovable queries:
 * - dealers:   id, name, city, state, avatarUrl, rating, salesCount, featured (bool), plan ("free"|"premium")
 * - listings:  id, title, imageUrl, grade, price, isTrending (bool), endingSoon (bool)
 * - posts:     id, title, body, imageUrl, createdAt, type ("trading_post")
 */

export default function HomePage() {
  // ---- replace these with real fetches (Supabase, etc.)
  const [dealers, setDealers] = useState([]);
  const [listings, setListings] = useState([]);
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    // TODO: swap to your real queries.
    setDealers(mockDealers);
    setListings(mockListings);
    setPosts(mockPosts);
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* TEST MODE banner */}
      <TestModeBanner show />

      {/* HERO */}
      <Hero />

      {/* FEATURED (Paid) DEALERS */}
      <FeaturedDealers dealers={dealers.filter(d => d.featured)} />

      {/* TRENDING GRAILS */}
      <TrendingGrails listings={listings.filter(l => l.isTrending)} />

      {/* TRADING POST (community feed) */}
      <TradingPost posts={posts} />

      {/* TOP SELLERS (no revenue shown) */}
      <TopSellers
        dealers={dealers}
        title="Top Dealers This Month"
        showRevenue={false}   // <- keep false; set true for admin-only view
      />
    </main>
  );
}

/* ---------- Components ---------- */

function TestModeBanner({ show }) {
  if (!show) return null;
  return (
    <div className="w-full bg-destructive text-destructive-foreground text-center text-sm py-1">
      TEST MODE — No real payments processed
    </div>
  );
}

function Hero() {
  return (
    <section className="px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 py-8 md:py-12">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-2xl bg-card shadow-sm border p-6 md:p-8">
          <div className="mb-5 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm md:text-base font-medium text-foreground">
              Now Accepting Verified Artist Applications — Showcase and sell your original art!
            </p>
            <a href="/artist-verification" className="mt-3 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-primary-foreground text-sm md:text-base hover:bg-primary/90 transition-colors">
              Apply Now →
            </a>
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
            Your Grail Is <span className="text-foreground">Waiting</span>
          </h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            The ultimate marketplace for comics, collectibles, and cards. Buy, sell, or trade — local or nationwide.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <a href="/marketplace" className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-3 text-primary-foreground font-semibold hover:bg-primary/90 transition-colors">
              Start Hunting
            </a>
            <a href="/marketplace" className="inline-flex items-center justify-center rounded-lg border bg-background px-5 py-3 font-semibold hover:bg-accent transition-colors">
              Browse Local
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionHeader({ title, ctaHref, ctaText = "View All" }) {
  return (
    <div className="mb-4 flex items-end justify-between">
      <h2 className="text-xl md:text-2xl font-bold">{title}</h2>
      {ctaHref && (
        <a href={ctaHref} className="text-primary hover:text-primary/80 text-sm font-semibold transition-colors">
          {ctaText} →
        </a>
      )}
    </div>
  );
}

/* ---- Featured / Paid Dealers ---- */
function FeaturedDealers({ dealers }) {
  if (!dealers?.length) return null;
  return (
    <section className="px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 py-6 md:py-8">
      <div className="mx-auto max-w-6xl">
        <SectionHeader title="Featured Dealers" ctaHref="/sellers" ctaText="View All Sellers" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {dealers.map(d => (
            <a key={d.id} href={`/seller/${d.id}`} className="group rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-3">
                <img src={d.avatarUrl} alt={d.name} className="h-12 w-12 rounded-full object-cover border" />
                <div className="min-w-0">
                  <div className="font-semibold truncate">{d.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{d.city}, {d.state}</div>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <span>⭐ {d.rating.toFixed(1)}</span>
                <span>•</span>
                <span>{d.salesCount} sales</span>
                <span className="ml-auto rounded bg-amber-100 text-amber-800 px-2 py-0.5">Featured</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---- Trending Grails ---- */
function TrendingGrails({ listings }) {
  if (!listings?.length) return null;
  return (
    <section className="px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 py-6 md:py-8">
      <div className="mx-auto max-w-6xl">
        <SectionHeader title="Trending Grails" ctaHref="/marketplace" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {listings.map(l => (
            <a key={l.id} href={`/item/${l.id}`} className="group rounded-xl overflow-hidden border bg-card shadow-sm hover:shadow-md transition-all">
              <div className="aspect-[3/4] bg-muted">
                <img src={l.imageUrl} alt={l.title} className="h-full w-full object-cover" />
              </div>
              <div className="p-3">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  {l.grade && <span className="rounded bg-muted px-2 py-0.5">{l.grade}</span>}
                  {l.endingSoon && <span className="rounded bg-destructive/10 text-destructive px-2 py-0.5">Ending Soon</span>}
                </div>
                <div className="mt-1 font-semibold line-clamp-2">{l.title}</div>
                {l.price && <div className="mt-1 text-sm text-foreground">${l.price}</div>}
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---- Trading Post (community feed) ---- */
function TradingPost({ posts }) {
  if (!posts?.length) return null;
  return (
    <section className="px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 py-6 md:py-8">
      <div className="mx-auto max-w-6xl">
        <SectionHeader title="Trading Post" ctaHref="/trade-board" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {posts.map(p => (
            <a key={p.id} href={`/post/${p.id}`} className="rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-all">
              <div className="flex gap-4">
                {p.imageUrl && (
                  <img src={p.imageUrl} alt="" className="h-24 w-24 rounded-lg object-cover border" />
                )}
                <div className="min-w-0">
                  <div className="font-semibold line-clamp-1">{p.title}</div>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{p.body}</p>
                  <div className="mt-2 text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleDateString()}</div>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---- Top Sellers (no revenue on public) ---- */
function TopSellers({ dealers, title = "Top Sellers", showRevenue = false }) {
  if (!dealers?.length) return null;

  // order by salesCount (or your own metric)
  const sorted = [...dealers].sort((a, b) => b.salesCount - a.salesCount).slice(0, 10);

  return (
    <section className="px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 py-6 md:py-10">
      <div className="mx-auto max-w-6xl">
        <SectionHeader title={title} ctaHref="/sellers" />
        <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="[&>th]:py-3 [&>th]:px-4 [&>th]:text-left [&>th]:font-semibold">
                <th>Seller</th>
                <th>Location</th>
                <th>Total Sales</th>
                {showRevenue && <th>Revenue</th>}
                <th>Rating</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((d, i) => (
                <tr key={d.id} className="border-t hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4">
                    <a href={`/seller/${d.id}`} className="flex items-center gap-3">
                      <img src={d.avatarUrl} alt={d.name} className="h-8 w-8 rounded-full object-cover border" />
                      <div className="font-medium truncate max-w-[180px] sm:max-w-[260px]">
                        {i === 0 && <span className="mr-2 rounded bg-amber-100 px-2 py-0.5 text-amber-800 text-[11px]">Top Seller</span>}
                        {d.name}
                      </div>
                    </a>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">{d.city}, {d.state}</td>
                  <td className="py-3 px-4 whitespace-nowrap">{d.salesCount}</td>
                  {showRevenue && <td className="py-3 px-4 whitespace-nowrap">${formatK(d.revenue)}</td>}
                  <td className="py-3 px-4 whitespace-nowrap">⭐ {d.rating.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Public disclaimer to replace money figures */}
        {!showRevenue && (
          <p className="mt-2 text-xs text-muted-foreground">
            Note: We highlight trusted activity (sales volume & ratings). Revenue is private to each seller.
          </p>
        )}
      </div>
    </section>
  );
}

/* ---------- helpers & mock data (swap out) ---------- */

function formatK(num = 0) {
  if (num >= 1000) return `${(num / 1000).toFixed(num >= 100000 ? 0 : 1)}K`;
  return `${num}`;
}

const mockDealers = [
  { id: "1", name: "Comic Vault", city: "New York", state: "NY", avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=CV", rating: 4.9, salesCount: 347, featured: true, plan: "premium", revenue: 45000 },
  { id: "2", name: "CardMaster Pro", city: "Los Angeles", state: "CA", avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=CM", rating: 4.8, salesCount: 521, featured: true, plan: "premium", revenue: 67000 },
  { id: "3", name: "Grail Hunter", city: "Chicago", state: "IL", avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=GH", rating: 5.0, salesCount: 189, featured: true, plan: "premium", revenue: 28000 },
  { id: "4", name: "Elite Collectibles", city: "Miami", state: "FL", avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=EC", rating: 4.7, salesCount: 892, featured: true, plan: "premium", revenue: 98000 },
  { id: "5", name: "Vintage Vault", city: "Seattle", state: "WA", avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=VV", rating: 4.9, salesCount: 634, featured: false, plan: "free", revenue: 54000 },
  { id: "6", name: "Marvel Merchants", city: "Boston", state: "MA", avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=MM", rating: 4.6, salesCount: 421, featured: false, plan: "free", revenue: 41000 },
  { id: "7", name: "DC Deals", city: "Austin", state: "TX", avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=DD", rating: 4.8, salesCount: 567, featured: false, plan: "free", revenue: 59000 },
  { id: "8", name: "Sports Card Central", city: "Denver", state: "CO", avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=SC", rating: 4.9, salesCount: 756, featured: false, plan: "free", revenue: 72000 },
];

const mockListings = [
  { id: "1", title: "Amazing Spider-Man #300", imageUrl: "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=400", grade: "CGC 9.8", price: 450, isTrending: true, endingSoon: false },
  { id: "2", title: "Batman #1 (1940)", imageUrl: "https://images.unsplash.com/photo-1601645191163-3fc0d5d64e35?w=400", grade: "CGC 7.0", price: 8500, isTrending: true, endingSoon: true },
  { id: "3", title: "X-Men #1 Jim Lee", imageUrl: "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=400", grade: "NM", price: 125, isTrending: true, endingSoon: false },
  { id: "4", title: "Hulk #181 First Wolverine", imageUrl: "https://images.unsplash.com/photo-1601645191163-3fc0d5d64e35?w=400", grade: "CGC 5.5", price: 3200, isTrending: true, endingSoon: false },
  { id: "5", title: "2003 LeBron James RC", imageUrl: "https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400", grade: "PSA 10", price: 2800, isTrending: true, endingSoon: true },
  { id: "6", title: "1952 Mickey Mantle", imageUrl: "https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400", grade: "PSA 8", price: 15000, isTrending: true, endingSoon: false },
  { id: "7", title: "Saga #1 First Print", imageUrl: "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=400", grade: "NM+", price: 180, isTrending: true, endingSoon: false },
  { id: "8", title: "2018 Luka Doncic Prizm", imageUrl: "https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400", grade: "PSA 10", price: 890, isTrending: true, endingSoon: true },
];

const mockPosts = [
  { id: "1", title: "Looking to trade X-Men #94 for Amazing Spider-Man #129", body: "In great condition, willing to meet locally or ship. Looking for similar grade.", imageUrl: "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=200", createdAt: "2024-01-15", type: "trading_post" },
  { id: "2", title: "ISO: Vintage Batman Cards from 1966 Series", body: "Trying to complete my set. Need cards #12, #34, and #67. Cash ready!", imageUrl: "https://images.unsplash.com/photo-1546554137-f86b9593a222?w=200", createdAt: "2024-01-14", type: "trading_post" },
  { id: "3", title: "Trading multiple modern keys for one golden age grail", body: "Have: Walking Dead #1, Saga #1, Invincible #1. Want: Golden/Silver Age key issue.", imageUrl: "https://images.unsplash.com/photo-1601645191163-3fc0d5d64e35?w=200", createdAt: "2024-01-13", type: "trading_post" },
  { id: "4", title: "Huge lot of commons - make an offer!", body: "Over 5000 comics from 1980s-2000s. Great for readers or resellers. Pick up only.", imageUrl: "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=200", createdAt: "2024-01-12", type: "trading_post" },
];
