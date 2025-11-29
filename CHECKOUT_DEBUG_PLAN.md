# Checkout Flow Debug Plan

## What I Fixed

### 1. Added Comprehensive Debug Logging
- **Button Click Detection**: Console log fires immediately when "Continue to Payment" is clicked
- **Validation Steps**: Each validation check now logs success/failure with actual field values
- **State Changes**: useEffect tracks all checkout state transitions (showCheckout, checkoutMode, clientSecret, orderId)
- **Render Path**: Logs which UI branch renders (shipping form vs payment form vs error)

### 2. Hardened Button Behavior
- Added `type="button"` to prevent accidental form submission
- Added `e.preventDefault()` and `e.stopPropagation()` to prevent event bubbling
- Explicit click handler wrapper for better debugging

### 3. Files Changed
- `src/pages/ListingDetail.tsx` - Added debug logs throughout handleBuyNow, button click, and render conditionals

## Expected Console Log Sequence (Normal Flow)

When you click "Continue to Payment", you should see:

```
[CHECKOUT-DEBUG] Button clicked! Starting validation...
[CHECKOUT-DEBUG] User validated: cc996c89-6380-4af3-8740-15f8b49957a4
[CHECKOUT-DEBUG] Shipping info validated
[CHECKOUT-DEBUG] Shipping method validated: ship_nationwide (or local_pickup)
[CHECKOUT] Starting payment intent creation...
[CHECKOUT] Calling marketplace-create-payment-intent... {listingId: "..."}
[CHECKOUT] Payment intent created successfully: {orderId: "..."}
[CHECKOUT-STATE] State updated: {showCheckout: true, checkoutMode: true, hasClientSecret: true, ...}
[CHECKOUT-RENDER] Rendering Stripe Elements payment form
```

## What Each Log Means

| Log Prefix | Meaning | What to Check If Missing |
|-----------|---------|-------------------------|
| `[CHECKOUT-DEBUG] Button clicked!` | Button click registered | Check if button is visible/enabled |
| `[CHECKOUT-DEBUG] User validated` | User logged in correctly | User auth state |
| `[CHECKOUT-DEBUG] Shipping info validated` | All required fields filled | Check field values in log |
| `[CHECKOUT-DEBUG] Shipping method validated` | Rate selected (if nationwide) | Check selectedRate state |
| `[CHECKOUT] Starting payment intent...` | Passed all validations | - |
| `[CHECKOUT] Payment intent created successfully` | Edge function returned valid response | Check edge function logs |
| `[CHECKOUT-STATE] State updated` | React state changed | Check if UI re-renders |
| `[CHECKOUT-RENDER] Rendering Stripe...` | Payment form should appear | Check if Elements loads |

## Manual Test Steps

### Test 1: Basic Checkout Flow
1. Navigate to `/listing/e8916a81-0768-4a61-8db8-7bd64ce168a2`
2. Click "Buy It Now" button
3. Fill shipping info:
   - Full Name: "Test Buyer"
   - Street: "123 Test St"
   - City: "New Orleans"
   - State: "LA"
   - ZIP: "70124"
4. Select shipping method: "Ship Nationwide"
5. Wait for shipping rates to load and select one
6. **Open browser console** (F12 or Cmd+Opt+J)
7. Click "Continue to Payment"
8. **Check console for debug logs**

### Test 2: Local Pickup Flow
1-4. Same as above
5. Select "Local Pickup" instead
6. Open console
7. Click "Continue to Payment"
8. Should skip rate validation, proceed directly to payment intent creation

## Troubleshooting Decision Tree

**If NO logs appear at all:**
- Button click isn't firing → Check if button is disabled or hidden
- JavaScript error before handler → Check browser console for errors
- Old code cached → Hard refresh (Cmd+Shift+R or Ctrl+Shift+R)

**If logs stop at validation step:**
- Check which field is missing in the validation log output
- Verify shipping rate is selected for nationwide shipping

**If logs show edge function called but no success:**
- Check edge function logs in Lovable Cloud backend
- Check network tab for failed request
- Look for error toast message on screen

**If logs show success but no payment form:**
- Check `[CHECKOUT-STATE]` log - verify checkoutMode=true and hasClientSecret=true
- Check `[CHECKOUT-RENDER]` log - which branch is rendering?
- Check if stripePromise failed to initialize (STRIPE_PUBLISHABLE_KEY missing)

## Next Steps for User

1. **Test in Preview Latest** with console open
2. **Copy all console logs** starting from `[CHECKOUT-DEBUG] Button clicked!`
3. **Take screenshot** of what you see after clicking "Continue to Payment"
4. **Report back** which log is the last one you see

This will pinpoint the exact failure point in the checkout flow.
