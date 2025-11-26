# Google OAuth Setup Guide

Follow these steps to enable Google Sign-In and Google Drive integration.

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a Project** → **New Project**
3. Enter project name: `LLM Compare` (or your preferred name)
4. Click **Create**

## Step 2: Enable Required APIs

1. In your project, go to **APIs & Services** → **Library**
2. Search and enable these APIs:
   - **Google Drive API**
   - **Google+ API** (for user profile info)

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** (unless you have a Google Workspace)
3. Click **Create**
4. Fill in the required fields:
   - **App name**: `LLM Compare`
   - **User support email**: Your email
   - **Developer contact**: Your email
5. Click **Save and Continue**
6. **Scopes**: Click **Add or Remove Scopes**
   - Add these scopes:
     - `userinfo.email`
     - `userinfo.profile`
     - `https://www.googleapis.com/auth/drive.readonly`
7. Click **Save and Continue**
8. **Test users** (for development):
   - Click **Add Users**
   - Add your Gmail address
   - Click **Save and Continue**
9. Click **Back to Dashboard**

## Step 4: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Select **Application type**: **Web application**
4. **Name**: `LLM Compare Web Client`
5. **Authorized JavaScript origins**:
   - Add: `http://localhost:3000`
   - Add: `http://localhost:8001` (your backend)
6. **Authorized redirect URIs**:
   - Add: `http://localhost:3000/auth/google/callback`
7. Click **Create**
8. **Copy your credentials**:
   - You'll see a popup with **Client ID** and **Client Secret**
   - Keep this window open or download the JSON

## Step 5: Update Your .env File

1. Open `backend/.env` in your editor
2. Find the Google OAuth section (at the bottom)
3. Replace the placeholders with your credentials:

```bash
# Google OAuth & Drive Integration
GOOGLE_CLIENT_ID=your_client_id_from_step_4.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_from_step_4
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
```

## Step 6: Restart Your Backend

The backend needs to reload the environment variables:

```bash
# Kill the current backend process
# Then restart it:
cd backend
python3 src/main.py
```

## Step 7: Test the Integration

1. Go to http://localhost:3000/login
2. Click **Continue with Google**
3. You should be redirected to Google's OAuth page
4. Sign in with your Google account (must be a test user you added)
5. Grant permissions
6. You should be redirected back to your app

## Troubleshooting

### "Failed to initiate Google Sign-In"
- Check that `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in `.env`
- Restart your backend server
- Check backend logs for errors

### "redirect_uri_mismatch" error
- Make sure the redirect URI in Google Cloud Console **exactly matches**: `http://localhost:3000/auth/google/callback`
- No trailing slashes
- Check for typos

### "Access blocked: This app's request is invalid"
- Make sure you added your email as a test user in OAuth consent screen
- Check that all required scopes are enabled

### "Failed to create workspace" when using Google Drive
- Make sure you're signed in with Google first
- Try signing out and signing in again
- Check that Google Drive API is enabled in Google Cloud Console

## Production Deployment

When deploying to production:

1. Update OAuth consent screen to **Published** (requires verification)
2. Add your production domain to:
   - Authorized JavaScript origins: `https://yourdomain.com`
   - Authorized redirect URIs: `https://yourdomain.com/auth/google/callback`
3. Update `.env` with production `GOOGLE_REDIRECT_URI`

## Security Notes

- Never commit `.env` file to git (it's already in `.gitignore`)
- Keep your `GOOGLE_CLIENT_SECRET` confidential
- Regularly rotate credentials in production
- Use environment-specific credentials (dev vs prod)
