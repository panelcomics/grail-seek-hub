import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, User, Palette, Share2 } from "lucide-react";
import { toast } from "sonner";
import { FavoriteButton } from "@/components/FavoriteButton";
import { ImageMagnifier } from "@/components/ImageMagnifier";

interface OriginalArt {
  id: string;
  title: string;
  artist_name: string | null;
  description: string | null;
  image_url: string | null;
  price: number | null;
  for_sale: boolean;
  medium: string | null;
  dimensions: string | null;
  date_created: string | null;
  provenance: string | null;
  owner_user_id: string;
  created_at: string;
}

interface OwnerProfile {
  username: string | null;
  is_verified_seller: boolean;
  seller_badge: string | null;
}

export default function OriginalArtDetail() {
  const { id } = useParams<{ id: string }>();
  const [art, setArt] = useState<OriginalArt | null>(null);
  const [owner, setOwner] = useState<OwnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArt = async () => {
      if (!id) return;

      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from("original_art")
          .select("*")
          .eq("id", id)
          .eq("visibility", "public")
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (!data) {
          setError("This artwork could not be found.");
          return;
        }

        setArt(data);

        // Fetch owner profile
        if (data.owner_user_id) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("username, is_verified_seller")
            .eq("user_id", data.owner_user_id)
            .maybeSingle();

          if (profileData) {
            setOwner({
              username: profileData.username,
              is_verified_seller: profileData.is_verified_seller || false,
              seller_badge: null,
            });
          }
        }
      } catch (err: any) {
        console.error("Error fetching original art:", err);
        setError("Failed to load artwork details.");
      } finally {
        setLoading(false);
      }
    };

    fetchArt();
  }, [id]);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleContactSeller = () => {
    if (owner?.username) {
      // For now, navigate to the seller profile - could add messaging later
      window.location.href = `/seller/${owner.username}`;
    }
  };

  if (loading) {
    return (
      <main className="flex-1 bg-background">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid md:grid-cols-2 gap-8">
            <Skeleton className="aspect-square rounded-lg" />
            <div className="space-y-4">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-12 w-40" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !art) {
    return (
      <main className="flex-1 bg-background">
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Artwork Not Found</h1>
          <p className="text-muted-foreground mb-8">{error || "This artwork may have been removed or is no longer available."}</p>
          <Button asChild>
            <Link to="/original-art">Browse Original Art</Link>
          </Button>
        </div>
      </main>
    );
  }

  const formattedPrice = art.price ? `$${art.price.toLocaleString()}` : "Price on Request";

  return (
    <main className="flex-1 bg-background">
      <Helmet>
        <title>{art.title} | Original Art | GrailSeeker</title>
        <meta name="description" content={art.description || `Original artwork by ${art.artist_name}`} />
      </Helmet>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/original-art">Original Art</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{art.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Image with Magnifier */}
          <div className="relative">
            <ImageMagnifier
              src={art.image_url || "/placeholder.svg"}
              alt={art.title}
              className="aspect-square bg-muted rounded-lg border-2 border-border"
              magnifierSize={180}
              zoomLevel={3}
            />
            
            {/* Actions */}
            <div className="flex gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <FavoriteButton listingId={art.id} />
            </div>
          </div>

          {/* Details */}
          <div className="space-y-6">
            <div>
              <Badge variant="secondary" className="mb-2">
                <Palette className="h-3 w-3 mr-1" />
                Original Art
              </Badge>
              <h1 className="text-3xl font-bold">{art.title}</h1>
              {art.artist_name && (
                <p className="text-lg text-muted-foreground mt-1">
                  by <span className="font-medium text-foreground">{art.artist_name}</span>
                </p>
              )}
            </div>

            {/* Price */}
            <div className="bg-muted/50 rounded-lg p-4 border border-border">
              <p className="text-sm text-muted-foreground mb-1">Price</p>
              <p className="text-3xl font-bold text-primary">{formattedPrice}</p>
              {art.for_sale && (
                <Badge className="mt-2 bg-success text-success-foreground">Available for Purchase</Badge>
              )}
            </div>

            {/* Description */}
            {art.description && (
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{art.description}</p>
              </div>
            )}

            {/* Artwork Details */}
            <Card>
              <CardContent className="p-4 grid grid-cols-2 gap-4">
                {art.medium && (
                  <div>
                    <p className="text-sm text-muted-foreground">Medium</p>
                    <p className="font-medium">{art.medium}</p>
                  </div>
                )}
                {art.dimensions && (
                  <div>
                    <p className="text-sm text-muted-foreground">Dimensions</p>
                    <p className="font-medium">{art.dimensions}</p>
                  </div>
                )}
                {art.date_created && (
                  <div>
                    <p className="text-sm text-muted-foreground">Date Created</p>
                    <p className="font-medium">{art.date_created}</p>
                  </div>
                )}
                {art.provenance && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Provenance</p>
                    <p className="font-medium">{art.provenance}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Seller Info */}
            {owner && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{owner.username || "Seller"}</p>
                        {owner.is_verified_seller && (
                          <Badge variant="outline" className="text-xs">Verified Seller</Badge>
                        )}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleContactSeller}>
                      View Profile
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Purchase CTA */}
            {art.for_sale && art.price && (
              <div className="bg-accent/10 rounded-lg p-4 border border-accent/20">
                <p className="text-sm text-muted-foreground mb-3">
                  Interested in this artwork? Contact the seller to arrange purchase.
                </p>
                <Button className="w-full" size="lg" onClick={handleContactSeller}>
                  Contact Seller
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
