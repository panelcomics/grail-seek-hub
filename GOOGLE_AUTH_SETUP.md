# Google Authentication Setup Guide

## Issue: Google Sign-In 403 Error

The 403 error when attempting to sign in with Google indicates that Google OAuth is not yet configured in your Lovable Cloud backend.

## How to Fix

### Step 1: Configure Google OAuth in Lovable Cloud

1. Click the **"View Backend"** button to open your Lovable Cloud dashboard
2. Navigate to **Users → Auth Settings → Google Settings**
3. Follow the instructions to configure Google OAuth:
   - Create a Google Cloud project (if you don't have one)
   - Set up OAuth consent screen
   - Create OAuth 2.0 credentials
   - Add your site URL to authorized domains
   - Add redirect URLs

### Step 2: Required Configuration

You'll need to set up:
- **Client ID** (from Google Cloud Console)
- **Client Secret** (from Google Cloud Console)
- **Authorized JavaScript origins**: Your app's URL
- **Authorized redirect URIs**: Your app's callback URL

### Detailed Instructions

For complete step-by-step instructions, see the Supabase documentation:
- [Enable Google Auth](https://supabase.com/docs/guides/auth/social-login/auth-google)

### Alternative: Use Email/Password Login

While Google OAuth is being configured, users can:
1. Sign up with email and password
2. Use the "Magic Link" option for passwordless login

---

## Current Behavior

- **Google Sign-In button**: Now shows a clear error message directing users to use email/password
- **Fallback**: Email/password authentication works immediately
- **No blocking**: Users can still access the app via standard authentication

## After Configuration

Once Google OAuth is properly configured:
1. Users will be able to sign in with Google
2. The 403 error will be resolved
3. OAuth flow will complete successfully
