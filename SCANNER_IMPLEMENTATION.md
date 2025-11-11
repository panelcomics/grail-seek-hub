# Scanner → Listing Flow Implementation

## Overview
Complete implementation of robust scanner-to-listing flow that preserves user images, uses ComicVine only for prefill, and always allows manual listing.

---

## Requirements Satisfaction

### 1. **Image Handling** ✅

**Requirement**: Store and display user's captured/uploaded image as primary, never replace with ComicVine art.

**Implementation**:
- **Scanner.tsx** (lines 40-42):
  ```typescript
  const [imageUrl, setImageUrl] = useState<string | null>(null); // User's image
  const [prefillData, setPrefillData] = useState<PrefillData | null>(null);
  const [status, setStatus] = useState<ScannerStatus>("idle");
  ```

- **Capture** (lines 96-115): `setImageUrl(capturedImageData)` stores user's image
- **Upload** (lines 117-136): `setImageUrl(uploadedImageData)` stores user's image
- **ScannerListingForm.tsx** (lines 63-74): User's image displayed with "Your Photo (Primary Listing Image)" label
- **Storage** (lines 68-80): User's image uploaded to Supabase Storage as `primary_image_url`
- **ComicVine reference** stored separately in `images.comicvine_reference` (line 98)

### 2. **Recognition & Prefill** ✅

**Requirement**: Use ComicVine data only to prefill form fields when confidence >= 65%, all fields remain editable.

**Implementation**:
- **Scanner.tsx** (lines 138-264): Recognition pipeline
  - Calls `scan-item` edge function (line 176)
  - Calculates confidence score (line 218)
  - Builds `PrefillData` object (lines 226-236)
  - **65% threshold check** (line 239):
    ```typescript
    if (calculatedConfidence >= 65 && title && issueNumber) {
      setStatus("prefilled"); // Show "Review details" state
    } else {
      setStatus("manual"); // Show manual form with partial/no data
    }
    ```

- **ScannerListingForm.tsx** (lines 46-53): All fields are editable `useState` with `initialData` as defaults:
  ```typescript
  const [title, setTitle] = useState(initialData.title || "");
  const [series, setSeries] = useState(initialData.series || "");
  const [issueNumber, setIssueNumber] = useState(initialData.issueNumber || "");
  // ... all fields editable
  ```

### 3. **Listing Form Component** ✅

**Requirement**: Create `ScannerListingForm.tsx` with user image display and all editable fields.

**Implementation - ScannerListingForm.tsx**:
- **Props** (lines 11-29):
  ```typescript
  interface ScannerListingFormProps {
    imageUrl: string; // Required - user's image
    initialData?: PrefillData; // Optional prefill
    confidence?: number | null; // Optional confidence for display
  }
  ```

- **Fields** (lines 156-283) - All editable:
  - Title/Series Name (required)
  - Issue Number
  - Publisher
  - Year
  - Grade (if graded)
  - Condition (dropdown)
  - Notes/Description

- **Image Display** (lines 143-180):
  - User's photo shown prominently as "Primary Listing Image"
  - ComicVine reference shown separately as smaller thumbnail (if available)

- **Submission** (lines 56-127):
  - Uploads user's image to `comic-photos` bucket
  - Creates `inventory_item` with `images.front` = user's image
  - Saves ComicVine reference separately

### 4. **ComicVine Reference Cover** ✅

**Requirement**: Show ComicVine cover only as small labeled thumbnail, not as main listing image.

**Implementation - ScannerListingForm.tsx** (lines 169-191):
```typescript
{showReferenceCover && (
  <div className="space-y-2">
    <Label className="text-base font-semibold text-muted-foreground">
      ComicVine Reference Cover
    </Label>
    <div className="aspect-[2/3] bg-muted rounded-lg overflow-hidden border-2 border-border opacity-70">
      <img src={initialData.comicvineCoverUrl} ... />
    </div>
    <Alert>
      <AlertDescription className="text-xs">
        This is for reference only. Your photo above will be the listing image.
      </AlertDescription>
    </Alert>
  </div>
)}
```

### 5. **Error & No-Match Handling** ✅

**Requirement**: Always show `ScannerListingForm` with user's image even on recognition failure.

**Implementation - Scanner.tsx**:
- **No results** (lines 194-210):
  ```typescript
  if (results.length === 0) {
    setStatus("manual");
    setPrefillData({});
    setConfidence(0);
    toast({
      title: "No confident match",
      description: "You can still list this comic manually with your photo.",
    });
    return;
  }
  ```

- **Low confidence** (lines 239-257):
  ```typescript
  if (calculatedConfidence < 65 || (!title && !issueNumber)) {
    setStatus("manual");
    toast({
      title: "Low confidence match",
      description: "Review the suggested details or edit as needed.",
    });
  }
  ```

- **Network errors** (lines 259-285):
  ```typescript
  catch (err: any) {
    setStatus("manual");
    setPrefillData({});
    setConfidence(0);
    toast({
      title: "Recognition error",
      description: "You can still list this comic manually with your photo.",
    });
  }
  ```

- **Form always renders** (line 411):
  ```typescript
  const showListingForm = imageUrl && (status === "prefilled" || status === "manual");
  ```

### 6. **Remove Debug UI from Production** ✅

**Requirement**: Hide all debug info, confidence scores, raw IDs in production builds.

**Implementation**:
- **Scanner.tsx** (line 490):
  ```typescript
  {import.meta.env.DEV && <RecognitionDebugOverlay debugData={debugData} />}
  ```
  - Debug overlay only renders when `import.meta.env.DEV === true`
  - In production builds, `import.meta.env.DEV` is `false`

- **RecognitionDebugOverlay.tsx** (lines 17-18):
  ```typescript
  if (!import.meta.env.DEV) return null;
  ```
  - Double-gated: component itself also checks dev mode

- **User-facing messages** are clean:
  - ✅ Success: "Match found! {title} #{issue}" (no confidence %)
  - ✅ Low confidence: "Low confidence match" or "No confident match" (no raw numbers)
  - ✅ Error: "Recognition error" (no stack traces)

---

## State Management

**Scanner.tsx** maintains clean state:
```typescript
const [imageUrl, setImageUrl] = useState<string | null>(null);
const [prefillData, setPrefillData] = useState<PrefillData | null>(null);
const [status, setStatus] = useState<ScannerStatus>("idle" | "recognizing" | "prefilled" | "manual");
const [confidence, setConfidence] = useState<number | null>(null);
```

**Flow**:
1. User captures/uploads → `imageUrl` set
2. Recognition runs → `status = "recognizing"`
3. Results processed:
   - High confidence → `status = "prefilled"`, `prefillData` populated
   - Low/no confidence → `status = "manual"`, `prefillData` empty or partial
4. Form renders with `imageUrl` + `prefillData`

---

## Backward Compatibility

**Scope guardrails maintained**:
- ❌ No changes to global layout/header
- ❌ No changes to auth provider
- ❌ No changes to marketplace browse pages
- ❌ No changes to profile system
- ✅ Only touched:
  - `/scanner` page (Scanner.tsx)
  - New `ScannerListingForm.tsx` component
  - Existing edge functions unchanged (scan-item, comic-scanner)

---

## Testing Checklist

### Image Preservation
- [ ] Capture photo → verify user's photo displayed in form
- [ ] Upload image → verify user's image displayed in form
- [ ] Submit form → verify user's image saved to storage and used as listing image
- [ ] ComicVine cover shown as separate reference thumbnail (when available)

### Recognition Flow
- [ ] High confidence (≥65%) → "Review details" message, prefilled form
- [ ] Low confidence (<65%) → "Low confidence" message, editable form with partial data
- [ ] No results → "No confident match" message, blank form
- [ ] Network error → "Recognition error" message, blank form

### Manual Listing
- [ ] All fields editable even with prefill
- [ ] Can submit with blank fields (except title)
- [ ] Can override all ComicVine suggestions
- [ ] Form submits successfully with user's image

### Debug UI
- [ ] Dev mode: Debug overlay visible in bottom-right
- [ ] Production: No debug overlay
- [ ] Production: No confidence percentages in toasts
- [ ] Production: No raw IDs or error stacks

### State Management
- [ ] Navigate away and back → no ghost states
- [ ] "Scan Another Comic" button resets state
- [ ] Multiple scans in sequence work correctly

---

## File Changes Summary

### Created
1. **src/components/ScannerListingForm.tsx** (332 lines)
   - Complete listing form component
   - User image display with ComicVine reference
   - All editable fields
   - Supabase integration for storage and database

### Modified
2. **src/pages/Scanner.tsx** (495 lines)
   - Simplified state management (imageUrl, prefillData, status)
   - 65% confidence threshold implementation
   - Clean recognition pipeline
   - Conditional form rendering
   - Dev-only debug overlay

### Documentation
3. **SCANNER_IMPLEMENTATION.md** (this file)
   - Complete requirements mapping
   - Implementation details
   - Testing checklist
