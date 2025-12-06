import { useEffect, useState, useRef } from "react";
import ItemCard from "@/components/ItemCard";
import { ListingCardSkeleton } from "@/components/ui/listing-card-skeleton";
import { resolvePrice } from "@/lib/listingPriceUtils";
import { getListingImageUrl } from "@/lib/sellerUtils";
import { fetchLocalDeals, checkUserLocation } from "@/lib/localDealsQuery";
import { Listing } from "@/types/listing";
import { useAuth } from "@/contexts/AuthContext";
import LocalDiscovery from "@/components/LocalDiscovery";

export function LocalDealsCarousel() {
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRadius, setSelectedRadius] = useState(50); // Default 50 miles
  const [userLocation, setUserLocation] = useState<{
    hasLocation: boolean;
    lat?: number;
    lng?: number;
  }>({ hasLocation: false });
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (user?.id) {
      checkLocation();
    } else {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (userLocation.hasLocation && userLocation.lat && userLocation.lng) {
      fetchListings();
    }
  }, [userLocation, selectedRadius]);

  const checkLocation = async () => {
    if (!user?.id) return;
    
    try {
      const location = await checkUserLocation(user.id);
      setUserLocation(location);
      
      if (!location.hasLocation) {
        setLoading(false);
      }
    } catch (error) {
      console.error('[LOCAL-DEALS-CAROUSEL] Error checking location:', error);
      setLoading(false);
    }
  };

  const fetchListings = async () => {
    if (!userLocation.lat || !userLocation.lng) return;

    const effectRequestId = ++requestIdRef.current;
    setLoading(true);

    try {
      const data = await fetchLocalDeals({
        viewerLat: userLocation.lat,
        viewerLng: userLocation.lng,
        radiusMiles: selectedRadius,
        limit: 8,
      });

      // Only apply if this is the latest request
      if (effectRequestId !== requestIdRef.current) {
        return;
      }

      setListings(data || []);
    } catch (error) {
      console.error('[LOCAL-DEALS-CAROUSEL] Error fetching:', error);
    } finally {
      if (effectRequestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  };

  const handleRadiusChange = (radius: number) => {
    setSelectedRadius(radius);
  };

  return (
    <section className="py-4 md:py-8 px-0">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-4 md:mb-6">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">Local Deals Near You</h2>
        </div>

        <LocalDiscovery
          onRadiusChange={handleRadiusChange}
          selectedRadius={selectedRadius}
          isLoading={loading}
          hasResults={listings.length > 0}
        />

        {loading ? (
          <div className="overflow-x-auto overflow-y-visible pb-4 scrollbar-hide snap-x snap-mandatory">
            <div className="flex gap-3 md:gap-4 px-0 min-w-min">
              {[...Array(5)].map((_, i) => (
                <ListingCardSkeleton key={i} />
              ))}
            </div>
          </div>
        ) : userLocation.hasLocation && listings.length > 0 ? (
          <div className="overflow-x-auto overflow-y-visible pb-4 scrollbar-hide snap-x snap-mandatory">
            <div className="flex gap-3 md:gap-4 px-0 min-w-min">
              {listings.map((listing) => {
                const price = resolvePrice(listing);
                const profile = Array.isArray(listing.profiles) ? listing.profiles[0] : listing.profiles;
                const distanceMiles = (listing as any).distance_miles;
                
                return (
                  <div key={listing.listing_id} className="w-[280px] sm:w-64 flex-shrink-0 snap-center">
                    <ItemCard
                      id={listing.listing_id}
                      title={listing.title || listing.series || "Untitled"}
                      price={price === null ? undefined : price}
                      condition={listing.condition || listing.cgc_grade || "Unknown"}
                      image={getListingImageUrl(listing.inventory_items || listing)}
                      category="comic"
                      isAuction={listing.for_auction}
                      showMakeOffer={listing.offers_enabled}
                      showTradeBadge={listing.is_for_trade}
                      sellerName={profile?.username}
                      sellerCity={distanceMiles ? `${Math.round(distanceMiles)} mi away` : undefined}
                      isVerifiedSeller={profile?.is_verified_seller}
                      completedSalesCount={profile?.completed_sales_count || 0}
                      sellerTier={profile?.seller_tier}
                      isFeaturedSeller={profile?.is_featured_seller}
                      isSlab={listing.is_slab}
                      grade={listing.cgc_grade}
                      gradingCompany={listing.grading_company}
                      certificationNumber={listing.certification_number}
                      series={listing.series}
                      issueNumber={listing.issue_number}
                      keyInfo={listing.key_details || listing.variant_description || listing.details}
                      imageRotation={listing.primary_image_rotation}
                      isSigned={listing.is_signed}
                      signatureType={listing.signature_type}
                      signedBy={listing.signed_by}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ) : !userLocation.hasLocation ? (
          <div className="container mx-auto px-4">
            <p className="text-sm text-muted-foreground py-4">
              Add your city and ZIP code in your profile settings to see local deals near you.
            </p>
          </div>
        ) : (
          <div className="container mx-auto px-4">
            <p className="text-sm text-muted-foreground py-4">
              No listings found within {selectedRadius} miles. Try increasing your search radius.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
