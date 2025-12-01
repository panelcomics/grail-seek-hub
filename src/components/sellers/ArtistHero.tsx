import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Palette, Scroll, Heart, MessageSquare } from "lucide-react";
import { SellerBadge } from "@/components/SellerBadge";
import { VerifiedSellerBadge } from "@/components/VerifiedSellerBadge";
import { FeaturedSellerBadge } from "@/components/FeaturedSellerBadge";
import { RoleBadge } from "@/components/creators/RoleBadge";

interface ArtistHeroProps {
  artistName: string;
  avatarUrl: string | null;
  bio?: string | null;
  sellerTier?: string | null;
  isVerifiedSeller?: boolean;
  isFeaturedSeller?: boolean;
  isVerifiedArtist?: boolean;
  completedSalesCount?: number;
  followerCount: number;
  isFollowing: boolean;
  followLoading: boolean;
  onFollowClick: () => void;
  onMessageClick: () => void;
  onShopClick: () => void;
  // TODO: Add creator role fields when creator_roles integration is complete
  isArtist?: boolean;
  isWriter?: boolean;
}

export function ArtistHero({
  artistName,
  avatarUrl,
  bio,
  sellerTier,
  isVerifiedSeller = false,
  isFeaturedSeller = false,
  isVerifiedArtist = false,
  completedSalesCount = 0,
  followerCount,
  isFollowing,
  followLoading,
  onFollowClick,
  onMessageClick,
  onShopClick,
  isArtist = false,
  isWriter = false,
}: ArtistHeroProps) {
  return (
    <div className="relative overflow-hidden">
      {/* Hero banner with comic texture gradient */}
      <div className="relative h-[400px] md:h-[500px] bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5">
        <div className="absolute inset-0 comic-texture opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        
        {/* Content */}
        <div className="container mx-auto px-4 h-full flex flex-col md:flex-row items-center justify-center md:justify-start gap-8 relative z-10 pt-12 md:pt-24">
          {/* Artist portrait */}
          <div className="w-48 h-48 md:w-64 md:h-64 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center overflow-hidden border-4 border-background shadow-2xl flex-shrink-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={artistName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-6xl md:text-8xl font-bold text-primary">
                {artistName[0]?.toUpperCase() || "A"}
              </span>
            )}
          </div>

          {/* Artist info */}
          <div className="flex-1 text-center md:text-left max-w-2xl">
            <div className="flex flex-col gap-4">
              {/* Name + badges */}
              <div className="space-y-3">
                <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground">
                  {artistName}
                </h1>
                
                {/* Role subtitle */}
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                  <RoleBadge isArtist={isArtist} isWriter={isWriter} variant="secondary" />
                  {isFeaturedSeller && <FeaturedSellerBadge />}
                  <VerifiedSellerBadge salesCount={completedSalesCount} size="md" />
                  {sellerTier && <SellerBadge tier={sellerTier} />}
                  {isVerifiedArtist && (
                    <Badge variant="secondary" className="gap-1.5 bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-purple-500/30">
                      <Palette className="h-3.5 w-3.5" />
                      Verified Artist
                    </Badge>
                  )}
                </div>
              </div>

              {/* Bio preview */}
              {bio && (
                <p className="text-lg text-muted-foreground line-clamp-2 max-w-xl">
                  {bio}
                </p>
              )}

              {/* CTA buttons */}
              <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                <Button
                  size="lg"
                  onClick={onShopClick}
                  className="gap-2 shadow-lg hover:shadow-xl transition-all"
                >
                  <Scroll className="w-5 h-5" />
                  Shop Original Art
                </Button>
                
                <Button
                  size="lg"
                  variant={isFollowing ? "outline" : "default"}
                  onClick={onFollowClick}
                  disabled={followLoading}
                  className="gap-2"
                >
                  {followLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      {isFollowing ? 'Unfollowing...' : 'Following...'}
                    </>
                  ) : (
                    <>
                      <Heart className={`w-5 h-5 ${isFollowing ? 'fill-current' : ''}`} />
                      {isFollowing ? `Following (${followerCount})` : `Follow (${followerCount})`}
                    </>
                  )}
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  onClick={onMessageClick}
                  className="gap-2"
                >
                  <MessageSquare className="w-5 h-5" />
                  Message
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
