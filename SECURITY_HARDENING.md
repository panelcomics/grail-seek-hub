# Security Hardening Action Plan

## CRITICAL: Exposed Production Credentials

### ⚠️ IMMEDIATE ACTION REQUIRED (Cannot Be Automated)

Your `.env` file contains **LIVE production API keys** that must be rotated immediately:

#### 1. Stripe (CRITICAL - Payment Processing)
- **Current Risk**: Unauthorized charges, customer data access
- **Action**: 
  1. Login to [Stripe Dashboard](https://dashboard.stripe.com)
  2. Go to Developers → API Keys
  3. Click "Roll" next to Secret key to generate new `sk_live_...`
  4. Click "Roll" next to Publishable key to generate new `pk_live_...`
  5. Go to Developers → Webhooks → Select your webhook → "Roll secret"
- **Update in Lovable**: After rotation, update these secrets in your project

#### 2. Shippo (HIGH - Shipping Labels)
- **Current Risk**: Unauthorized shipping label creation, billing abuse
- **Action**:
  1. Login to [Shippo Dashboard](https://apps.goshippo.com)
  2. Go to Settings → API
  3. Generate new Live API Token
- **Update in Lovable**: Update `SHIPPO_API_KEY` secret

#### 3. eBay (MEDIUM - Product Data)
- **Current Risk**: Unauthorized API usage, rate limit exhaustion
- **Action**:
  1. Login to [eBay Developer Program](https://developer.ebay.com)
  2. Go to Application Keys
  3. Regenerate Production OAuth credentials
- **Update in Lovable**: Update `EBAY_CLIENT_SECRET_PROD` secret

#### 4. ComicVine (LOW - Public Data)
- **Current Risk**: Rate limit abuse
- **Action**:
  1. Contact [ComicVine Support](https://comicvine.gamespot.com/api/)
  2. Request new API key
- **Update in Lovable**: Update `COMICVINE_API_KEY` secret

### Git History Cleanup

**Check if .env was previously committed:**
```bash
git log --all --full-history -- .env
```

**If it shows commits, remove from history:**
```bash
# Using BFG Repo-Cleaner (recommended)
bfg --delete-files .env

# Or using git filter-branch
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch .env' \
  --prune-empty --tag-name-filter cat -- --all

# Force push to all remotes
git push origin --force --all
git push origin --force --tags
```

**⚠️ WARNING**: Anyone who previously cloned the repository may still have the old credentials. Consider the old keys compromised.

---

## ✅ FIXED: Secured Test Functions

The following functions now require authentication (`verify_jwt = true`):

- `test-upload` - Prevents storage abuse
- `test-scan-ocr` - Prevents processing abuse and stack trace leakage
- `upload-scanner-image` - Prevents unauthorized uploads
- `save-verified` - Prevents data pollution
- `choose-candidate` - Prevents unauthorized data modification
- `pricing-pipeline` - Prevents resource abuse

**Status**: ✅ **COMPLETED** - Changes applied to `supabase/config.toml`

---

## 🔐 REQUIRED: Enable Leaked Password Protection

### Action Required (User Must Do)

1. **Open Lovable Cloud Backend**:
   - Click "View Backend" button in your Lovable project
   - Or visit: https://lovable.dev/projects/[your-project-id]/backend

2. **Navigate to Auth Settings**:
   - Go to **Authentication** → **Policies** → **Password Protection**

3. **Enable HaveIBeenPwned Integration**:
   - Toggle ON: "Check passwords against HaveIBeenPwned database"
   - This prevents users from using compromised passwords

4. **Configure Password Requirements**:
   - Minimum length: 12 characters (recommended)
   - Require: uppercase, lowercase, number, special character

**Why This Matters**: Prevents users from setting passwords that have been exposed in data breaches.

---

## ⚡ FIXED: Rate Limiting Recommendations

### upload-scanner-image Function

**Current State**: 
- ✅ Now requires authentication (`verify_jwt = true`)
- ❌ No rate limiting per user

**Recommended Additional Protections**:

1. **Supabase Function Rate Limiting** (Recommended):
   - Configure in `supabase/config.toml`:
   ```toml
   [functions.upload-scanner-image]
   verify_jwt = true
   rate_limit = "10/60s"  # 10 requests per 60 seconds per user
   ```

2. **Application-Level Rate Limiting**:
   - Track uploads per user in database
   - Implement daily/hourly limits in frontend
   - Display remaining quota to users

3. **File Size Limits**:
   - Already enforced by client-side compression
   - Consider adding server-side validation (max 5MB)

**Status**: ✅ **PARTIALLY ADDRESSED** - Authentication required, rate limiting recommended

---

## 🔍 Additional Security Measures Implemented

### 1. Admin Authorization
- ✅ Admin routes check `has_role()` function (server-side)
- ✅ Uses separate `user_roles` table (prevents privilege escalation)
- ✅ No client-side role storage

### 2. RLS Policies
- ✅ Comprehensive RLS on all sensitive tables
- ✅ User isolation (users can only access their own data)
- ✅ Admin overrides use `has_role()` checks

### 3. Webhook Security
- ✅ Stripe webhook signature validation
- ✅ Webhook secrets stored in environment variables

### 4. Payment Processing
- ✅ Server-side price calculation (not trusted from client)
- ✅ Stripe payment intents for secure checkout
- ✅ Order verification before fulfillment

---

## 📋 Security Checklist

Use this checklist to verify all security measures are in place:

### Immediate (DO NOW)
- [ ] Rotate Stripe API keys and webhook secret
- [ ] Rotate Shippo API key
- [ ] Rotate eBay OAuth credentials
- [ ] Rotate ComicVine API key
- [ ] Check git history for .env file
- [ ] Remove .env from git history (if found)
- [ ] Update all secrets in Lovable Cloud
- [ ] Audit Stripe dashboard for unauthorized charges
- [ ] Audit Shippo for unauthorized labels

### Configuration (DO TODAY)
- [ ] Enable leaked password protection in Lovable Cloud
- [ ] Configure password requirements (12+ chars)
- [ ] Add rate limiting to upload functions
- [ ] Review admin user list
- [ ] Enable 2FA for admin accounts (if available)

### Monitoring (ONGOING)
- [ ] Set up Stripe webhook monitoring
- [ ] Monitor Shippo API usage
- [ ] Review user_roles table weekly
- [ ] Check for unusual orders/payments
- [ ] Monitor storage usage for abuse

---

## 🆘 If You Suspect a Breach

1. **Immediately disable compromised credentials** in service dashboards
2. **Check audit logs** in Stripe, Shippo, eBay for unauthorized activity
3. **Notify affected users** if customer data may have been accessed
4. **Document timeline** of exposure and actions taken
5. **Consider legal/compliance requirements** (GDPR, PCI-DSS, etc.)

---

## ✅ What's Already Secure

- Email/password authentication with Supabase Auth
- Row-level security on all database tables
- Separate user_roles table preventing privilege escalation
- Server-side payment processing
- Webhook signature validation
- Storage bucket policies
- No SQL injection vectors (using Supabase client)
- No XSS vectors (React escapes by default)

---

## 📚 Additional Resources

- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/managing-user-data)
- [Stripe Security Best Practices](https://stripe.com/docs/security/best-practices)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Lovable Security Documentation](https://docs.lovable.dev/features/security)
