# Google OAuth Setup Guide

This guide will help you set up Google Sign-In for LangkahKecil.

## Prerequisites

- A Google account
- Access to Google Cloud Console (https://console.cloud.google.com/)

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click **"New Project"**
4. Enter project name: `LangkahKecil` (or your preferred name)
5. Click **"Create"**
6. Wait for the project to be created and select it

## Step 2: Configure OAuth Consent Screen

1. In Google Cloud Console, go to **APIs & Services** → **OAuth consent screen**
2. Select **External** (unless you're using Google Workspace, then select Internal)
3. Click **"Create"**
4. Fill in the required information:
   - **App name**: `LangkahKecil`
   - **User support email**: Your email address
   - **Developer contact information**: Your email address
5. Click **"Save and Continue"**
6. On the **Scopes** page:
   - Click **"Add or Remove Scopes"**
   - Select the following scopes:
     - `.../auth/userinfo.email`
     - `.../auth/userinfo.profile`
     - `openid`
   - Click **"Update"**
   - Click **"Save and Continue"**
7. On the **Test users** page (for development):
   - Click **"Add Users"**
   - Add your email address and any test user emails
   - Click **"Save and Continue"**
8. Review and click **"Back to Dashboard"**

## Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **"+ Create Credentials"** → **"OAuth client ID"**
3. If prompted, select **"Web application"** as the application type
4. Fill in the form:
   - **Name**: `LangkahKecil Web Client`
   - **Authorized JavaScript origins**:
     ```
     http://localhost:5000
     http://localhost:3000
     ```
   - **Authorized redirect URIs**:
     ```
     http://localhost:5000
     http://localhost:3000
     ```
   > **Note**: For production, add your production domain URLs here
5. Click **"Create"**
6. **IMPORTANT**: Copy the **Client ID** and **Client Secret** immediately
   - You won't be able to see the Client Secret again after closing this dialog
   - The Client ID looks like: `123456789-abcdefghijklmnop.apps.googleusercontent.com`
   - The Client Secret looks like: `GOCSPX-abcdefghijklmnopqrstuvwxyz`

## Step 4: Update Environment Variables

### Backend Configuration

Edit `backend/.env.example` and update:

```env
GOOGLE_CLIENT_ID=your-actual-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-actual-client-secret
```

Replace:
- `your-actual-client-id.apps.googleusercontent.com` with your **Client ID**
- `your-actual-client-secret` with your **Client Secret**

### Frontend Configuration

Edit `frontend/.env.example` and update:

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-actual-client-id.apps.googleusercontent.com
```

Replace `your-actual-client-id.apps.googleusercontent.com` with your **Client ID** (same as backend)

> **Important**: Only the Client ID goes in the frontend (it's public). The Client Secret stays in the backend only.

## Step 5: Restart Services

After updating the environment variables:

```bash
# Restart backend
docker-compose restart backend

# Restart frontend
docker-compose restart frontend

# Or restart everything
docker-compose restart
```

## Step 6: Test Google Sign-In

1. Open your application at `http://localhost:5000`
2. Go to the login or register page
3. Click the **"Sign in with Google"** button
4. You should see the Google sign-in popup
5. Select your Google account
6. Grant permissions if prompted
7. You should be redirected back and logged in

## Troubleshooting

### Error: "invalid_client" or "OAuth client was not found"

- **Cause**: Client ID is incorrect or not set
- **Solution**: 
  - Verify `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in `frontend/.env.example` matches your Client ID
  - Restart the frontend container
  - Clear browser cache and try again

### Error: "redirect_uri_mismatch"

- **Cause**: The redirect URI in your app doesn't match what's configured in Google Cloud Console
- **Solution**: 
  - Check that `http://localhost:5000` is in your **Authorized redirect URIs** in Google Cloud Console
  - Make sure there are no trailing slashes or typos

### Error: "access_denied"

- **Cause**: User denied permission or app is in testing mode
- **Solution**: 
  - Make sure your email is added as a test user in OAuth consent screen
  - Or publish your app (for production use)

### Google Sign-In button doesn't appear

- **Cause**: `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is not set or invalid
- **Solution**: 
  - Check `frontend/.env.example` has the correct Client ID
  - Restart frontend container
  - Check browser console for errors

## Production Setup

For production deployment:

1. **Update OAuth Consent Screen**:
   - Change from "Testing" to "In production"
   - Complete all required fields
   - Submit for verification (if needed)

2. **Update Authorized URLs**:
   - Add your production domain to **Authorized JavaScript origins**
   - Add your production domain to **Authorized redirect URIs**
   - Example:
     ```
     https://yourdomain.com
     https://www.yourdomain.com
     ```

3. **Update Environment Variables**:
   - Set production values in your production `.env` files (not `.env.example`)
   - Never commit `.env` files with real credentials

## Security Notes

- ⚠️ **Never commit** `.env` files with real credentials to version control
- ✅ **Always use** `.env.example` files with placeholder values
- ✅ The Client Secret should **only** be in the backend
- ✅ The Client ID can be public (it's in the frontend)

## Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Identity Platform](https://developers.google.com/identity)

