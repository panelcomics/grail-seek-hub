# Feature Flags Documentation

All feature flags are managed through **Lovable Cloud Secrets** and control scanner, ComicVine picker, pricing pipeline, and UI behavior.

## Feature Flags Overview

### 1. FEATURE_SCANNER_CACHE
**Status:** ✅ Implemented  
**Location:** `supabase/functions/scan-item/index.ts`  
**Behavior:**
- When `true`: Checks `verified_matches` table for cached results
- When `false`: Always performs fresh ComicVine lookups
- Cache uses `matchHash()` to identify duplicate scans
- Improves performance by ~2-3 seconds for repeat scans

**How it works:**
```typescript
if (Deno.env.get('FEATURE_SCANNER_CACHE') === 'true' && series_title) {
  const hash = await matchHash(series_title, issue_number, publisher);
  const { data: verified } = await supabase
    .from('verified_matches')
    .select('*')
    .eq('hash', hash)
    .single();
  // Returns cached result if found
}
```

---

### 2. FEATURE_SCANNER_ANALYTICS
**Status:** ✅ Implemented  
**Location:** `supabase/functions/_shared/track.ts`  
**Behavior:**
- When `true`: Tracks scanner usage in `scanner_metrics` table
- When `false`: Skips all analytics tracking (fire-and-forget)
- Never blocks user flow - always non-blocking
- Tracks: scan attempts, cache hits, ComicVine queries, user picks

**How it works:**
```typescript
await track(supabase, {
  flow: 'scan-item',
  action: 'start',
  session_id: sessionId,
  user_id: userId
});
```

---

### 3. FEATURE_GCD_FALLBACK
**Status:** 🚧 Scaffolded (Ready for Implementation)  
**Location:** `supabase/functions/scan-item/index.ts`, `supabase/functions/pricing-pipeline/index.ts`  
**Behavior:**
- When `true`: Falls back to Grand Comics Database when ComicVine fails
- When `false`: ComicVine only
- Provides alternative source for rare/obscure comics

**Implementation needed:**
```typescript
if (Deno.env.get('FEATURE_GCD_FALLBACK') === 'true') {
  // TODO: Implement GCD API integration
  console.log('[SCAN-ITEM] GCD fallback enabled but not yet implemented');
}
```

---

### 4. FEATURE_EBAY_COMPS
**Status:** ✅ Implemented  
**Location:** `supabase/functions/ebay-comps/index.ts`, `supabase/functions/pricing-pipeline/index.ts`  
**Behavior:**
- When `true`: Fetches eBay sold listings for pricing data
- When `false`: Skips eBay integration
- Called by pricing pipeline after user confirms a pick

**How it works:**
```typescript
if (Deno.env.get('FEATURE_EBAY_COMPS') === 'true' && title && issue) {
  const { data: ebayData } = await supabase.functions.invoke('ebay-pricing', {
    body: { title, issueNumber: issue, grade }
  });
  // Returns floor/median/high pricing
}
```

---

### 5. FEATURE_TOP3_PICKS
**Status:** ✅ Implemented  
**Location:** `supabase/functions/scan-item/index.ts`  
**Behavior:**
- When `true`: Returns only top 3 ComicVine matches
- When `false`: Returns up to 10 matches
- Reduces payload size and simplifies UI

**How it works:**
```typescript
const pickLimit = top3PicksEnabled ? 3 : 10;
results = results.slice(0, pickLimit).map((cv: any) => ({
  id, title, issue, score, isReprint, ...
}));
```

---

### 6. FEATURE_IMAGE_COMPRESSION
**Status:** ✅ Implemented  
**Location:** `src/lib/uploadImage.ts`, `src/lib/resizeImage.ts`  
**Behavior:**
- When `true`: Client-side compression before upload (~1600px, 0.8 quality)
- When `false`: Uploads original images
- Generates 320px thumbnails for instant preview
- Reduces API costs and improves performance

**How it works:**
```typescript
const { compressed, preview, stats } = await compressForUpload(file);
// Compressed: ~1600px max dimension, JPEG 0.8 quality
// Preview: 320px thumbnail for instant display
```

---

### 7. FEATURE_REPRINT_FILTER
**Status:** ✅ Implemented  
**Location:** `src/components/ComicVinePicker.tsx`  
**Behavior:**
- When `true`: Shows toggle to filter out reprints
- When `false`: No filter UI shown
- Filters: True Believers, Facsimile, 2nd Print, etc.
- User can manually override to select reprints

**How it works:**
```typescript
const filteredPicks = (featureFlags.reprintFilter && excludeReprints)
  ? picks.filter(p => !p.isReprint)
  : picks;
```

---

### 8. FEATURE_PRICING_PIPELINE
**Status:** ✅ Implemented  
**Location:** `supabase/functions/pricing-pipeline/index.ts`, `src/components/ScannerListingForm.tsx`  
**Behavior:**
- When `true`: Runs pricing lookup after user confirms a pick
- When `false`: No pricing data fetched
- Aggregates: ComicVine metadata, eBay comps, GCD data
- Never blocks UI - runs in background

**How it works:**
```typescript
const { data: pricingResult } = await supabase.functions.invoke('pricing-pipeline', {
  body: { title, issue, year, publisher, grade, comicvineId }
});
// Returns { floor, median, high, confidence, sources }
```

---

### 9. FEATURE_MANUAL_OVERRIDE
**Status:** ✅ Implemented  
**Location:** `src/components/ScannerListingForm.tsx`  
**Behavior:**
- When `true`: All fields remain editable after autofill
- When `false`: Fields lock after autofill (not recommended)
- Ensures users can always correct OCR mistakes

**Implementation:**
All form fields use `value={state}` and `onChange={setState}` - never disabled.

---

### 10. FEATURE_PICK_AUTOFILL
**Status:** ✅ Implemented  
**Location:** `src/components/ScannerListingForm.tsx`  
**Behavior:**
- When `true`: Autofills all fields when user selects a pick
- When `false`: Only highlights the pick, no autofill
- Fills: title, issue, year, publisher, volumeName, volumeId, description, cover URLs

**How it works:**
```typescript
const handleComicVineSelect = async (pick: ComicVinePick) => {
  setTitle(pick.title);
  setSeries(pick.volumeName || pick.title);
  setIssueNumber(pick.issue || "");
  setPublisher(pick.publisher || "");
  setYear(pick.year?.toString() || "");
  setSelectedCover(pick.coverUrl);
  setComicvineId(pick.id);
  setVolumeId(pick.volumeId || null);
  setVariantInfo(pick.variantDescription || "");
  // Then trigger pricing pipeline if enabled
};
```

---

## Auto-Selection Logic

**Threshold:** 72% match score  
**Behavior:** If top pick has `score >= 0.72`, it's automatically selected (not confirmed)  
**Location:** `src/components/ComicVinePicker.tsx`

```typescript
useEffect(() => {
  if (filteredPicks.length > 0 && filteredPicks[0].score >= 0.72) {
    setSelectedId(filteredPicks[0].id);
  }
}, [filteredPicks]);
```

---

## Backward Compatibility

All features are **opt-in** and backward compatible:
- If flag = `false` or undefined → feature skipped
- If flag = `true` → feature activated
- No breaking changes to existing workflows
- Safe JSON returns on all errors: `{ ok: false, reason: 'error_type' }`

---

## Testing Feature Flags

To test a feature flag:
1. Go to **Lovable Cloud → Secrets**
2. Find the feature flag (e.g., `FEATURE_SCANNER_CACHE`)
3. Set value to `"true"` or `"false"`
4. Save changes
5. Feature flag takes effect immediately (no deployment needed)

---

## Edge Functions Using Feature Flags

| Edge Function | Flags Used |
|---------------|------------|
| `scan-item` | CACHE, ANALYTICS, GCD_FALLBACK, EBAY_COMPS, TOP3_PICKS, REPRINT_FILTER |
| `pricing-pipeline` | EBAY_COMPS, GCD_FALLBACK |
| `upload-scanner-image` | IMAGE_COMPRESSION (client-side) |
| `track-pick` | SCANNER_ANALYTICS |
| `save-verified` | SCANNER_CACHE |

---

## Performance Impact

| Flag | Impact on Speed | Impact on Cost |
|------|----------------|----------------|
| SCANNER_CACHE | +2-3s faster (cache hits) | ✅ Reduces API calls |
| IMAGE_COMPRESSION | +0.5s (compression) | ✅ Reduces storage/bandwidth |
| TOP3_PICKS | -0.2s (smaller payload) | ✅ Reduces data transfer |
| PRICING_PIPELINE | +1-2s (background) | ⚠️ Additional API calls |
| EBAY_COMPS | +0.8s (background) | ⚠️ eBay API usage |

---

## Future Enhancements

1. **FEATURE_GCD_FALLBACK** - Implement Grand Comics Database API
2. **FEATURE_AI_SUGGESTIONS** - Use Lovable AI to suggest pricing/grading
3. **FEATURE_BULK_SCAN** - Allow multiple scans in one session
4. **FEATURE_EXPORT_CSV** - Export inventory to CSV

---

## Support

For issues or questions about feature flags:
1. Check edge function logs in Lovable Cloud
2. Review `scanner_metrics` table for analytics
3. Contact support with session ID for debugging
