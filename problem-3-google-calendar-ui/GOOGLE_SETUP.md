# Google Calendar API Setup Guide

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your Project ID

## Step 2: Enable Google Calendar API

1. In Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Google Calendar API"
3. Click on it and press "Enable"

## Step 3: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Web application"
4. Set the following:
   - **Name**: "Calendar UI App"
   - **Authorized JavaScript origins**: 
     - `http://localhost:5173` (for development)
     - `http://localhost:3000` (if using different port)
   - **Authorized redirect URIs**:
     - `http://localhost:5173` (for development)
5. Click "Create"
6. **Copy the Client ID** (you'll need this)

## Step 4: Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Choose "External" user type
3. Fill in required fields:
   - **App name**: "Calendar UI App"
   - **User support email**: Your email
   - **Developer contact information**: Your email
4. Click "Save and Continue"
5. In "Scopes" section, add:
   - `https://www.googleapis.com/auth/calendar.readonly`
6. Click "Save and Continue"
7. Add test users (your email) if needed
8. Click "Save and Continue"

## Step 5: Update Your App

Replace the Client ID in `frontend/src/main.tsx`:

```typescript
const GOOGLE_CLIENT_ID = 'YOUR_NEW_CLIENT_ID_HERE'
```

## Step 6: Test the App

1. Run the development server:
   ```bash
   cd frontend
   npm run dev
   ```

2. Open the app in your browser
3. Click "Sign in with Google"
4. Grant permissions to access your calendar

## Troubleshooting 403 Error

If you still get a 403 error:

1. **Check API Quotas**: Go to "APIs & Services" > "Quotas" and ensure you haven't exceeded limits
2. **Verify Scopes**: Make sure the scope `https://www.googleapis.com/auth/calendar.readonly` is added
3. **Check Test Users**: If your app is in testing, add your email as a test user
4. **Verify Redirect URIs**: Make sure the redirect URI matches exactly

## Common Issues

- **"Access blocked"**: Add your email as a test user in OAuth consent screen
- **"Invalid client"**: Check that the Client ID is correct
- **"Redirect URI mismatch"**: Verify the redirect URI in Google Console matches your app URL

## Production Deployment

For production, you'll need to:
1. Add your production domain to authorized origins
2. Publish your OAuth consent screen
3. Update the Client ID for production