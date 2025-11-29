# Geocoding & Local Deals Fix Summary

## Issue Fixed
ZIP code geocoding (e.g., 70002 for Metairie, LA) was failing and throwing Lovable error modal despite profile save succeeding.

## Changes Made

### 1. Fixed `geocode-profile` Edge Function
**Location**: `supabase/functions/geocode-profile/index.ts`

#### Key Improvements:
- **State normalization**: All state codes now converted to uppercase (LA → LA)
- **Two-tier fallback strategy**:
  1. First try: ZIP + state combo
  2. Fallback: ZIP-only lookup if state search fails
- **Non-blocking error handling**: Returns HTTP 200 with `geocoded: false` instead of 404 error
- **Always saves location fields**: Profile updated with city/state/ZIP even if coordinates fail

#### Example Response (Success):
```json
{
  "success": true,
  "geocoded": true,
  "lat": 29.9882,
  "lng": -90.1520,
  "formatted_address": "70002, Metairie, Louisiana, United States",
  "message": "Location saved with coordinates"
}
```

#### Example Response (Graceful Failure):
```json
{
  "success": true,
  "geocoded": false,
  "message": "Location saved without coordinates (geocoding failed)"
}
```

### 2. Updated `ProfileEditForm.tsx`
**Location**: `src/components/ProfileEditForm.tsx`

#### Changes:
- Now checks `geocodeResult.geocoded` flag instead of just response status
- Shows appropriate toast message based on whether coordinates were found
- Never throws error modal - all geocoding failures handled gracefully
- Falls back to console.warn instead of console.error for geocoding issues

#### User Experience:
✅ **With coordinates**: "Profile updated successfully - Your profile and location have been saved with coordinates"
⚠️ **Without coordinates**: "Location saved (without coordinates) - We couldn't find exact coordinates for this ZIP code, but your profile was updated."

### 3. Local Deals Implementation (Already Working)
**Location**: `src/lib/localDealsQuery.ts` + `src/components/home/LocalDealsCarousel.tsx`

#### How It Works:
1. **Viewer Location**: Reads user's profile `lat`/`lng` coordinates
2. **Fetch Listings**: Queries all active buy_now listings (limit 100 initially)
3. **Join Seller Profiles**: Fetches seller profiles with `lat`/`lng` where NOT NULL
4. **Distance Calculation**: Uses Haversine formula via `calculateDistance()` helper
5. **Filter by Radius**: Keeps only listings within selected radius (25/50/100 miles)
6. **Sort by Distance**: Orders results closest-first
7. **Display**: Shows up to 8 results with distance badge (e.g., "15 mi away")

#### Query Flow:
```typescript
// 1. Get viewer coordinates
const location = await checkUserLocation(user.id);
// { hasLocation: true, lat: 29.9882, lng: -90.1520 }

// 2. Fetch deals within radius
const deals = await fetchLocalDeals({
  viewerLat: 29.9882,
  viewerLng: -90.1520,
  radiusMiles: 50, // User-selected: 25, 50, or 100
  limit: 8
});

// 3. Returns listings with calculated distance_miles property
// Only includes sellers who have lat/lng in their profiles
```

#### Example Listing Result:
```typescript
{
  listing_id: "uuid",
  title: "Amazing Spider-Man #300",
  price_cents: 25000,
  profiles: {
    username: "comicshop",
    lat: 30.0123,
    lng: -90.2456,
    city: "New Orleans",
    state: "LA"
  },
  distance_miles: 12.4, // ← Calculated distance
  // ... other listing fields
}
```

## Testing Checklist

### Geocoding (Profile Settings)
- [x] Enter US address with state code (LA, CA, NY, etc.)
- [x] ZIP-only lookup works (no city/state required)
- [x] State code normalized to uppercase automatically
- [x] Profile saves successfully even if geocoding fails
- [x] No Lovable error modal on geocoding failure
- [x] Appropriate toast messages based on geocoding result

### Local Deals Carousel
- [x] Only shows if user has lat/lng in profile
- [x] Fetches listings within selected radius (25/50/100 mi)
- [x] Displays distance badge on each card
- [x] Sorts results by distance (closest first)
- [x] Falls back to "Add your location" prompt if no coordinates
- [x] Shows "No listings within X miles" if radius too small

## Console Logging

### Geocoding Function
```
[GEOCODE] Input: { postal_code: '70002', state: 'LA' }
[GEOCODE] Querying with state: https://nominatim.openstreetmap.org/...
[GEOCODE] Success with state: { lat: 29.9882, lng: -90.1520, display_name: '...' }
[GEOCODE] Profile updated successfully for user: uuid { geocoded: true }
```

### Local Deals Query
```
[LOCAL-DEALS] Fetching within 50 miles of [29.9882, -90.1520]
[LOCAL-DEALS] Found 8 listings within 50 miles in 156.23ms
```

## API Details

### Nominatim (OpenStreetMap) Geocoder
- **Endpoint**: `https://nominatim.openstreetmap.org/search`
- **Free tier**: No API key required
- **Rate limit**: ~1 req/sec (respectful usage)
- **User-Agent**: Required per usage policy (`GrailSeeker-Marketplace/1.0`)
- **Query params**: `postalcode`, `state`, `country`, `format=json`, `limit=1`

### Distance Calculation
- **Formula**: Haversine (great-circle distance)
- **Earth radius**: 3,959 miles (constant)
- **Precision**: Rounded to 1 decimal place (e.g., 12.4 mi)
- **Helper**: `src/lib/distanceUtils.ts`

## Database Requirements

### Profile Fields
```sql
profiles.lat DOUBLE PRECISION
profiles.lng DOUBLE PRECISION
profiles.city TEXT
profiles.state TEXT (uppercase)
profiles.country TEXT (uppercase)
profiles.postal_code TEXT
```

### Listings Query
```sql
-- Must join to profiles to get seller location
SELECT l.*, p.lat, p.lng, p.city, p.state
FROM listings l
INNER JOIN profiles p ON l.user_id = p.user_id
WHERE l.status = 'active'
  AND l.type = 'buy_now'
  AND p.lat IS NOT NULL
  AND p.lng IS NOT NULL;
```

## Next Steps

✅ Geocoding is now non-blocking and handles edge cases
✅ Local Deals uses actual geolocation filtering
✅ Both systems are production-ready

### Optional Enhancements (Future):
- Add geocoding for international addresses (currently US-only)
- Cache geocoding results to avoid redundant API calls
- Add "Local Pickup" toggle for sellers to enable/disable local discovery
- Add distance filter UI on Browse Marketplace page
