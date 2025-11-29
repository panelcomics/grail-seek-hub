# Onboarding Flow Implementation

## Overview
Implemented a clean 2-step onboarding flow for new GrailSeeker users that collects essential profile information (username + location) and optional profile image. The flow ensures all users complete onboarding before accessing the platform while gracefully handling existing users.

---

## Routes & Components Added/Modified

### 1. **Route: `/onboarding`** (already existed, enhanced)
   - **File**: `src/pages/Onboarding.tsx`
   - **Changes**:
     - Added onboarding completion status check on mount
     - Redirects existing completed users to homepage with toast message
     - Pre-fills suggested username from email (sanitized)
     - Integrated geocoding with proper error handling
     - Normalizes state to uppercase
     - Shows appropriate success messages based on geocoding result
     - Added helpful copy and step descriptions

### 2. **Hook: `useOnboardingCheck`** (NEW)
   - **File**: `src/hooks/useOnboardingCheck.tsx`
   - **Purpose**: Checks if authenticated users have completed onboarding
   - **Behavior**:
     - Runs on protected pages (skips auth, onboarding, terms, privacy, help, about)
     - Checks `onboarding_completed`, `username`, and `postal_code` fields
     - Redirects incomplete users to `/onboarding`
     - Prevents users from bypassing onboarding by navigating directly

### 3. **Auth Flow Updates**
   - **File**: `src/pages/Auth.tsx`
   - **Changes**:
     - Sign-in now checks onboarding status after successful login
     - Redirects to `/onboarding` if not completed
     - Sign-up already redirects to `/onboarding` (line 141)
     - Google OAuth and magic links redirect to `/` (will be caught by useOnboardingCheck hook)

### 4. **Homepage Integration**
   - **File**: `src/pages/Index.tsx`
   - **Changes**:
     - Added `useOnboardingCheck()` call at component top
     - Welcome banner already shows after onboarding completion (`?onboarding_complete=true`)

---

## Database Schema

### Existing Columns Used (No New Columns Added)
All required fields already exist in the `profiles` table:

| Column | Type | Purpose |
|--------|------|---------|
| `onboarding_completed` | `boolean` (nullable) | Tracks if user finished onboarding |
| `username` | `text` (nullable) | Required in Step 1 |
| `country` | `text` (nullable) | Required in Step 2 |
| `state` | `text` (nullable) | Required in Step 2 |
| `postal_code` | `text` (nullable) | Required in Step 2 |
| `city` | `text` (nullable) | Optional in Step 2 |
| `lat` | `numeric` (nullable) | Set by geocoding |
| `lng` | `numeric` (nullable) | Set by geocoding |
| `profile_image_url` | `text` (nullable) | Optional in Step 2 |

### Backfill Existing Users
For existing users who already have `username` and `postal_code`, you can optionally backfill `onboarding_completed` to `true`:

```sql
-- Backfill onboarding_completed for existing users with username and location
UPDATE profiles
SET onboarding_completed = true
WHERE username IS NOT NULL 
  AND postal_code IS NOT NULL 
  AND onboarding_completed IS NOT true;
```

---

## How Onboarding Completion is Determined

A user is considered "onboarded" if ALL of the following are true:
1. `profiles.onboarding_completed = true`
2. `profiles.username IS NOT NULL`
3. `profiles.postal_code IS NOT NULL`

The system checks all three conditions to ensure data integrity even if the flag is accidentally set without data.

---

## User Flows

### Flow 1: Brand New User Signup
1. User signs up at `/auth` (email/password or Google OAuth)
2. Profile row created in database with `onboarding_completed = null`
3. User automatically redirected to `/onboarding`
4. Completes Step 1 (username) → saves to DB
5. Completes Step 2 (location + optional image) → geocoding called → saves to DB with `onboarding_completed = true`
6. Redirected to `/?onboarding_complete=true`
7. Homepage shows welcome banner with "Start Listing" button
8. **Local Deals Near You** carousel uses saved `lat`/`lng` coordinates

### Flow 2: Existing User Sign-In (Already Completed)
1. User signs in at `/auth`
2. Auth checks `onboarding_completed` status
3. If completed → redirects to `/`
4. No onboarding required

### Flow 3: Existing User Sign-In (Incomplete Profile)
1. User signs in at `/auth`
2. Auth checks `onboarding_completed` status
3. If NOT completed OR missing username/postal_code → redirects to `/onboarding`
4. User completes missing steps
5. Redirected to homepage

### Flow 4: User Visits `/onboarding` Manually (Already Completed)
1. User navigates to `/onboarding` directly
2. Onboarding page checks status on mount
3. If already completed → shows toast "You're already set up!" → redirects to `/`

### Flow 5: Google OAuth / Magic Link Callback
1. User authenticates via Google OAuth or magic link
2. Redirects to `/` by default
3. Homepage's `useOnboardingCheck` hook runs
4. If incomplete → redirects to `/onboarding`

---

## Geocoding Integration

### How It Works
- Uses existing `geocode-profile` Edge Function (Nominatim API)
- Called in Step 2 after user enters location
- **Behavior**:
  - Normalizes `state` to uppercase (e.g., "la" → "LA")
  - First tries: `state + ZIP + city` lookup
  - Falls back to: `ZIP only` if first fails
  - Returns `{ geocoded: true, lat, lng }` on success
  - Returns `{ geocoded: false }` on failure (non-blocking)

### Error Handling
- If geocoding **succeeds**: Saves `lat`/`lng` to profile → shows "Location saved with coordinates for Local Deals"
- If geocoding **fails**: Still saves `country`/`state`/`postal_code` → shows "Location saved (coordinates couldn't be found, but you can still use the platform)"
- **Never blocks** profile save or onboarding completion

### Local Deals Integration
- After onboarding, user's `lat`/`lng` coordinates are available
- **Local Deals Near You** carousel (existing) uses these coordinates
- Filters listings within 25/50/100 mile radius
- If no coordinates: Shows "Add your city & ZIP" message

---

## Testing Checklist

### ✅ Test 1: New User Signup Flow
1. Create new account at `/auth`
2. Should auto-redirect to `/onboarding`
3. Complete Step 1 (username) → click Continue
4. Complete Step 2 (country=US, state=LA, ZIP=70002) → click Finish
5. Should redirect to `/?onboarding_complete=true`
6. Welcome banner should appear with "Start Listing" button

**Expected Result**:
- Username saved
- Location saved (LA, 70002)
- `lat`/`lng` saved (if geocoding succeeds)
- `onboarding_completed = true`

### ✅ Test 2: Geocode Success
1. Sign up new user
2. Enter valid ZIP: 70002 (Metairie, LA)
3. Click Finish

**Expected Result**:
- Toast: "Profile set! You're ready to hunt Grails. Your location was saved with coordinates for Local Deals."
- Check database: `lat` and `lng` should be populated

### ✅ Test 3: Geocode Failure (Non-Blocking)
1. Sign up new user
2. Enter rare/invalid ZIP: 99999
3. Click Finish

**Expected Result**:
- Toast: "Profile set! You're ready to hunt Grails. Your location was saved (coordinates couldn't be found...)"
- Profile still saves
- User can still access platform
- Check database: `lat` and `lng` should be NULL, but `postal_code` saved

### ✅ Test 4: Existing User Sign-In (Already Completed)
1. Use existing account with username + location already set
2. Sign in at `/auth`
3. Should redirect to `/` (NOT `/onboarding`)

**Expected Result**:
- No onboarding required
- Direct access to homepage

### ✅ Test 5: Existing User Sign-In (Incomplete)
1. Create account but don't complete onboarding (or manually set `onboarding_completed = false` in DB)
2. Sign in at `/auth`
3. Should redirect to `/onboarding`

**Expected Result**:
- Forced to complete onboarding
- Cannot access other pages until complete

### ✅ Test 6: Bypass Attempt (Direct Navigation)
1. Complete onboarding
2. Manually navigate to `/onboarding`
3. Should redirect to `/` with toast "You're already set up!"

**Expected Result**:
- Cannot re-enter onboarding once completed

### ✅ Test 7: Incomplete User Tries Bypassing
1. Create account, start onboarding but don't finish
2. Navigate directly to `/scanner` or `/marketplace`
3. `useOnboardingCheck` hook should catch and redirect to `/onboarding`

**Expected Result**:
- Cannot access protected pages
- Forced back to onboarding

### ✅ Test 8: Refresh Mid-Onboarding
1. Start onboarding
2. Complete Step 1
3. Refresh browser on Step 2
4. Should reload Step 2 (not crash or reset to Step 1)

**Expected Result**:
- Data persists across refreshes
- Current step maintained

---

## Force Re-Test Onboarding Flow

To manually test the onboarding flow again for an existing user:

### Option 1: SQL Reset (Recommended for Testing)
```sql
-- Reset specific user's onboarding status
UPDATE profiles 
SET onboarding_completed = false,
    username = NULL,
    postal_code = NULL,
    state = NULL,
    lat = NULL,
    lng = NULL
WHERE user_id = 'YOUR_USER_ID_HERE';
```

### Option 2: Create New Test Account
- Use a new email address
- Sign up at `/auth`
- Will automatically enter onboarding flow

### Option 3: Manual Database Toggle
1. Open Supabase dashboard
2. Navigate to `profiles` table
3. Find your user row
4. Set `onboarding_completed = false`
5. Clear `username` and `postal_code`
6. Sign out and sign back in

---

## Validation Rules

### Username (Step 1)
- **Length**: 3-20 characters
- **Format**: Letters, numbers, underscores only
- **No spaces**: "onlyone_word" ✅ | "two words" ❌
- **Uniqueness**: Checked against existing usernames
- **Pre-filled**: Suggested from email prefix (sanitized)

### Location (Step 2)
- **Country**: Required (currently only "United States" supported)
- **State**: Required (2-letter code, normalized to uppercase)
- **ZIP Code**: Required (5-digit format)
- **City**: Optional

---

## UX Polish

### Mobile-First Design
- Responsive card layout with max-width constraint
- Large touch-friendly buttons (min 44px height)
- Clear step indicators at top
- Mobile-optimized spacing and typography

### Helpful Copy
- **Step 1 header**: "Welcome to GrailSeeker! Let's set up your profile so buyers and sellers know who you are."
- **Step 2 header**: "Add your location so we can show you Local Deals near you."
- **Step 2 helper**: "Your ZIP code powers 'Local Deals Near You' so buyers and sellers can find each other within 25/50/100 miles."

### Error Messaging
- Inline validation errors (username format, required fields)
- Toast notifications for success/failure
- Non-blocking geocoding failures (saves anyway)

---

## Regression Prevention

### What Was NOT Changed
- ✅ No changes to Stripe integration
- ✅ No changes to Shippo shipping
- ✅ No changes to marketplace/checkout flow
- ✅ No changes to listing creation
- ✅ No changes to existing profile edit page
- ✅ No changes to Local Deals radius logic (already working)

### Existing Functionality Preserved
- Profile edit page (`/profile`) still works
- Shipping address collection still happens at checkout/label creation
- Local Deals carousel uses existing `lat`/`lng` coordinates
- All other user flows unchanged

---

## Next Steps (If Needed)

### Optional Enhancements
1. **Multi-country support**: Add more countries beyond "United States"
2. **Profile image reminder**: Prompt users without profile images to add one later
3. **Onboarding analytics**: Track completion rates and drop-off points
4. **A/B testing**: Test different copy or step orders
5. **Social proof**: Show "500+ sellers already joined" during onboarding

### Future Integrations
- Stripe Connect onboarding (separate flow for sellers)
- Shipping address collection (happens at first purchase/listing)
- Additional profile fields (bio, social links) - added later via `/profile` page

---

## Summary

The onboarding flow is now **production-ready** with:
- ✅ Clean 2-step wizard (username + location)
- ✅ Automatic redirect for new signups
- ✅ Onboarding status checks on sign-in
- ✅ Bypass prevention (hook on protected pages)
- ✅ Graceful geocoding with non-blocking failures
- ✅ Mobile-first responsive design
- ✅ Helpful copy and error messaging
- ✅ No breaking changes to existing flows
- ✅ Integration with Local Deals via coordinates

**Zero database schema changes required** — all columns already existed.

The flow ensures every user completes essential profile setup while maintaining a smooth UX and never blocking platform access due to geocoding failures.
