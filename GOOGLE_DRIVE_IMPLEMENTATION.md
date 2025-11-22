# Google Drive Integration - Implementation Plan

## Implementation Status

**Last Updated**: 2025-01-22

### ✅ Completed (Backend)
- [x] Google OAuth Service (`backend/src/core/google_oauth.py`)
  - Authorization URL generation
  - Token exchange (code → access/refresh tokens)
  - User info retrieval from Google
  - Token refresh mechanism
- [x] Google Drive API Service (`backend/src/core/google_drive.py`)
  - File metadata retrieval
  - File download with progress tracking
  - Google Docs export (to DOCX, XLSX, PPTX)
  - File listing with folder support
- [x] Database Migration (`backend/migrations/004_add_google_oauth.sql`)
  - Added Google OAuth fields to users table
  - Added source tracking to documents table
  - Created unique indexes
  - Migration successfully applied
- [x] SQLAlchemy Models Updated (`backend/src/db/models.py`)
  - User model: google_id, google_access_token, google_refresh_token, google_token_expiry, avatar_url, name
  - Document model: source, source_id
- [x] Google Dependencies (`backend/requirements.txt`)
  - google-auth==2.27.0
  - google-auth-oauthlib==1.2.0
  - google-auth-httplib2==0.2.0
  - google-api-python-client==2.116.0
- [x] Auth API Endpoints (`backend/src/api/auth.py`)
  - GET `/auth/google/url` - Get authorization URL
  - POST `/auth/google/callback` - Handle OAuth callback
  - GET `/auth/google/drive/files` - List user's Google Drive files
  - POST `/auth/google/drive/import` - Import files from Drive to workspace

### ✅ Completed (Frontend)
- [x] Google Sign-In Button (`frontend/src/components/GoogleSignInButton.tsx`)
  - OAuth initiation with Google branding
  - State management and error handling
- [x] Google OAuth Callback (`frontend/src/pages/GoogleCallback.tsx`)
  - Handles OAuth redirect from Google
  - State validation (CSRF protection)
  - Token exchange and user data storage
  - Error handling with user feedback
- [x] Google Drive Picker (`frontend/src/components/GoogleDrivePicker.tsx`)
  - File browsing modal with Drive API integration
  - Multi-select file selection
  - File type icons and metadata display
  - Import progress tracking
- [x] Login Page Integration (`frontend/src/pages/Login.tsx`)
  - "Continue with Google" button
  - Divider between email and OAuth signup
- [x] CreateWorkspace Integration (`frontend/src/pages/CreateWorkspace.tsx`)
  - Google Drive data source option
  - Drive picker integration
  - Workspace creation with Drive files
- [x] API Client (`frontend/src/services/api.ts`)
  - getGoogleAuthUrl() method
  - handleGoogleCallback() method
  - listGoogleDriveFiles() method
  - importFromGoogleDrive() method
- [x] Routing (`frontend/src/App.tsx`)
  - Added /auth/google/callback route

### 📋 Pending
- [ ] Environment variables setup (.env.example with Google credentials)
- [ ] End-to-end testing with real Google OAuth
- [ ] Documentation for Google Cloud Console setup
- [ ] Production deployment configuration

---

## Overview
Allow users to sign in with Google and directly select files from Google Drive when creating workspaces, eliminating the need for manual uploads.

---

## User Flow

### Scenario 1: New User (Google Sign-In)
1. User lands on homepage → Clicks "Start Free Trial"
2. Sees **"Continue with Google"** button
3. Google OAuth popup → User grants permissions:
   - Email access (profile)
   - Google Drive read-only access
4. Redirected to dashboard → Account created, tokens stored
5. User creates workspace → Can select "Google Drive" as source
6. Google Drive Picker opens → User selects files
7. Files imported into workspace

### Scenario 2: Existing User (Email/Password)
1. User signs in with email/password
2. In Create Workspace → Clicks "Connect Google Drive"
3. One-time OAuth popup → Grant Drive access
4. Token stored for future use
5. Drive Picker opens → Select files

---

## Technical Architecture

### Backend Components

#### 1. Google OAuth Setup
**File**: `backend/src/core/google_oauth.py` (new)

```python
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
import os

SCOPES = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/drive.readonly'
]

class GoogleOAuthService:
    def __init__(self):
        self.client_id = os.getenv('GOOGLE_CLIENT_ID')
        self.client_secret = os.getenv('GOOGLE_CLIENT_SECRET')
        self.redirect_uri = os.getenv('GOOGLE_REDIRECT_URI', 'http://localhost:3000/auth/google/callback')

    def get_authorization_url(self, state: str) -> str:
        """Generate Google OAuth URL"""
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                }
            },
            scopes=SCOPES,
            redirect_uri=self.redirect_uri
        )

        authorization_url, _ = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            state=state,
            prompt='consent'  # Force consent to get refresh token
        )
        return authorization_url

    def exchange_code_for_tokens(self, code: str) -> dict:
        """Exchange authorization code for access/refresh tokens"""
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                }
            },
            scopes=SCOPES,
            redirect_uri=self.redirect_uri
        )

        flow.fetch_token(code=code)
        credentials = flow.credentials

        return {
            "access_token": credentials.token,
            "refresh_token": credentials.refresh_token,
            "token_uri": credentials.token_uri,
            "client_id": credentials.client_id,
            "client_secret": credentials.client_secret,
            "scopes": credentials.scopes
        }

    def get_user_info(self, access_token: str) -> dict:
        """Get user email and profile from Google"""
        import requests
        response = requests.get(
            'https://www.googleapis.com/oauth2/v2/userinfo',
            headers={'Authorization': f'Bearer {access_token}'}
        )
        return response.json()
```

#### 2. Database Schema Updates
**File**: `backend/migrations/004_add_google_tokens.sql` (new)

```sql
-- Add Google OAuth columns to users table
ALTER TABLE users ADD COLUMN google_id TEXT UNIQUE;
ALTER TABLE users ADD COLUMN google_access_token TEXT;
ALTER TABLE users ADD COLUMN google_refresh_token TEXT;
ALTER TABLE users ADD COLUMN google_token_expiry TIMESTAMP;
ALTER TABLE users ADD COLUMN avatar_url TEXT;

-- Index for faster Google ID lookups
CREATE INDEX idx_users_google_id ON users(google_id);
```

#### 3. Google Drive API Service
**File**: `backend/src/core/google_drive.py` (new)

```python
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from googleapiclient.http import MediaIoBaseDownload
import io

class GoogleDriveService:
    def __init__(self, access_token: str, refresh_token: str):
        creds = Credentials(
            token=access_token,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=os.getenv('GOOGLE_CLIENT_ID'),
            client_secret=os.getenv('GOOGLE_CLIENT_SECRET')
        )
        self.service = build('drive', 'v3', credentials=creds)

    def get_file_metadata(self, file_id: str) -> dict:
        """Get file name, size, mime type"""
        return self.service.files().get(
            fileId=file_id,
            fields='id, name, mimeType, size, modifiedTime'
        ).execute()

    def download_file(self, file_id: str) -> bytes:
        """Download file content"""
        request = self.service.files().get_media(fileId=file_id)
        file_buffer = io.BytesIO()
        downloader = MediaIoBaseDownload(file_buffer, request)

        done = False
        while not done:
            status, done = downloader.next_chunk()

        file_buffer.seek(0)
        return file_buffer.read()

    def list_files(self, folder_id: str = None, page_size: int = 100) -> list:
        """List files in Drive (optional: within specific folder)"""
        query = f"'{folder_id}' in parents" if folder_id else None

        results = self.service.files().list(
            q=query,
            pageSize=page_size,
            fields="files(id, name, mimeType, size, modifiedTime)"
        ).execute()

        return results.get('files', [])
```

#### 4. API Endpoints
**File**: `backend/src/api/auth.py` (update)

```python
from src.core.google_oauth import GoogleOAuthService

google_oauth = GoogleOAuthService()

@router.get("/auth/google")
async def google_login(request: Request):
    """Initiate Google OAuth flow"""
    state = secrets.token_urlsafe(32)
    # Store state in session or cache for validation
    request.session['oauth_state'] = state

    auth_url = google_oauth.get_authorization_url(state)
    return {"authorization_url": auth_url}

@router.get("/auth/google/callback")
async def google_callback(
    code: str,
    state: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """Handle Google OAuth callback"""
    # Validate state
    stored_state = request.session.get('oauth_state')
    if state != stored_state:
        raise HTTPException(status_code=400, detail="Invalid state parameter")

    # Exchange code for tokens
    tokens = google_oauth.exchange_code_for_tokens(code)
    user_info = google_oauth.get_user_info(tokens['access_token'])

    # Find or create user
    user = db.query(User).filter(User.google_id == user_info['id']).first()

    if not user:
        # Create new user
        user = User(
            id=uuid.uuid4(),
            email=user_info['email'],
            google_id=user_info['id'],
            google_access_token=tokens['access_token'],
            google_refresh_token=tokens['refresh_token'],
            avatar_url=user_info.get('picture'),
            api_key=secrets.token_urlsafe(32)
        )
        db.add(user)
    else:
        # Update tokens
        user.google_access_token = tokens['access_token']
        user.google_refresh_token = tokens['refresh_token']

    db.commit()

    return {
        "user_id": str(user.id),
        "api_key": user.api_key,
        "email": user.email,
        "avatar_url": user.avatar_url
    }

@router.post("/workspace/{workspace_id}/import-from-drive")
async def import_from_google_drive(
    workspace_id: str,
    file_ids: list[str],
    user_id: str = Query(...),
    db: Session = Depends(get_db)
):
    """Import files from Google Drive to workspace"""
    user = db.query(User).filter(User.id == UUID(user_id)).first()
    if not user or not user.google_access_token:
        raise HTTPException(status_code=401, detail="Google Drive not connected")

    drive_service = GoogleDriveService(
        user.google_access_token,
        user.google_refresh_token
    )

    imported_docs = []
    for file_id in file_ids:
        # Get file metadata
        metadata = drive_service.get_file_metadata(file_id)

        # Download file content
        content = drive_service.download_file(file_id)

        # Create document record
        doc = Document(
            id=uuid.uuid4(),
            workspace_id=UUID(workspace_id),
            filename=metadata['name'],
            file_size=int(metadata.get('size', 0)),
            content_type=metadata['mimeType'],
            source='google_drive',
            source_id=file_id,
            processing_status='pending'
        )
        db.add(doc)

        # Save file to disk
        file_path = f"uploads/{workspace_id}/{doc.id}"
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, 'wb') as f:
            f.write(content)

        imported_docs.append(doc)

    db.commit()

    return {
        "imported_count": len(imported_docs),
        "documents": [{"id": str(d.id), "filename": d.filename} for d in imported_docs]
    }
```

---

### Frontend Components

#### 1. Google Sign-In Button
**File**: `frontend/src/components/GoogleSignInButton.tsx` (new)

```tsx
import React from 'react';

interface GoogleSignInButtonProps {
  onSuccess: (response: any) => void;
  label?: string;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onSuccess,
  label = 'Continue with Google'
}) => {
  const handleGoogleLogin = async () => {
    try {
      // Get authorization URL from backend
      const response = await fetch('/api/auth/google');
      const { authorization_url } = await response.json();

      // Open Google OAuth in popup
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        authorization_url,
        'Google Sign In',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Listen for callback
      window.addEventListener('message', (event) => {
        if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
          onSuccess(event.data.payload);
          popup?.close();
        }
      });
    } catch (error) {
      console.error('Google login failed:', error);
    }
  };

  return (
    <button
      onClick={handleGoogleLogin}
      className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white border-2 border-gray-300 rounded-xl hover:border-blue-500 hover:shadow-md transition-all font-medium"
    >
      <svg width="20" height="20" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      <span>{label}</span>
    </button>
  );
};
```

#### 2. Google Drive Picker
**File**: `frontend/src/components/GoogleDrivePicker.tsx` (new)

```tsx
import React, { useEffect } from 'react';

interface GoogleDrivePickerProps {
  onFilesSelected: (files: any[]) => void;
  accessToken: string;
}

export const GoogleDrivePicker: React.FC<GoogleDrivePickerProps> = ({
  onFilesSelected,
  accessToken
}) => {
  useEffect(() => {
    // Load Google Picker API
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => {
      (window as any).gapi.load('picker', () => {
        console.log('Google Picker loaded');
      });
    };
    document.body.appendChild(script);
  }, []);

  const openPicker = () => {
    const picker = new (window as any).google.picker.PickerBuilder()
      .addView((window as any).google.picker.ViewId.DOCS)
      .setOAuthToken(accessToken)
      .setDeveloperKey(process.env.REACT_APP_GOOGLE_API_KEY)
      .setCallback((data: any) => {
        if (data.action === 'picked') {
          onFilesSelected(data.docs);
        }
      })
      .setSelectableMimeTypes('application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain')
      .enableFeature((window as any).google.picker.Feature.MULTISELECT_ENABLED)
      .build();

    picker.setVisible(true);
  };

  return (
    <button
      onClick={openPicker}
      className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center gap-2"
    >
      <svg width="20" height="20" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
        {/* Google Drive icon SVG paths */}
      </svg>
      <span>Select from Google Drive</span>
    </button>
  );
};
```

#### 3. Update Login Page
**File**: `frontend/src/pages/Login.tsx` (update)

Add Google Sign-In button above email form:

```tsx
import { GoogleSignInButton } from '../components/GoogleSignInButton';

// Inside the form:
<GoogleSignInButton
  onSuccess={(data) => {
    localStorage.setItem('user_id', data.user_id);
    localStorage.setItem('api_key', data.api_key);
    navigate('/dashboard');
  }}
/>

<div className="relative my-6">
  <div className="absolute inset-0 flex items-center">
    <div className="w-full border-t border-gray-300"></div>
  </div>
  <div className="relative flex justify-center text-sm">
    <span className="px-4 bg-white text-gray-500">Or continue with email</span>
  </div>
</div>

{/* Existing email form */}
```

#### 4. Update Create Workspace
**File**: `frontend/src/pages/CreateWorkspace.tsx` (update)

Add Google Drive option in data source selection:

```tsx
const [dataSource, setDataSource] = useState<'upload' | 'google-drive'>('upload');

// UI:
<div className="space-y-4">
  <div className="grid grid-cols-2 gap-4">
    <button
      onClick={() => setDataSource('upload')}
      className={`p-6 rounded-xl border-2 ${
        dataSource === 'upload'
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <i className="fa-solid fa-upload text-3xl mb-3"></i>
      <h3 className="font-semibold">Upload Files</h3>
      <p className="text-sm text-gray-600">From your computer</p>
    </button>

    <button
      onClick={() => setDataSource('google-drive')}
      className={`p-6 rounded-xl border-2 ${
        dataSource === 'google-drive'
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <svg className="w-12 h-12 mx-auto mb-3">{/* Google Drive icon */}</svg>
      <h3 className="font-semibold">Google Drive</h3>
      <p className="text-sm text-gray-600">Import from Drive</p>
    </button>
  </div>

  {dataSource === 'google-drive' && (
    <GoogleDrivePicker
      accessToken={user.google_access_token}
      onFilesSelected={handleDriveFilesSelected}
    />
  )}
</div>
```

---

## Environment Variables

Add to `.env`:

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_API_KEY=your-api-key
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# Frontend
REACT_APP_GOOGLE_API_KEY=your-api-key
```

---

## Setup Steps

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project: "LLM Compare"
3. Enable APIs:
   - Google Drive API
   - Google Picker API
   - Google+ API (for user info)
4. Create OAuth 2.0 credentials:
   - Authorized redirect URIs:
     - `http://localhost:3000/auth/google/callback`
     - `https://your-domain.com/auth/google/callback`
   - Authorized JavaScript origins:
     - `http://localhost:3000`
     - `https://your-domain.com`
5. Copy Client ID and Client Secret

### 2. Install Dependencies

**Backend:**
```bash
pip install google-auth google-auth-oauthlib google-auth-httplib2 google-api-python-client
```

**Frontend:**
```bash
npm install @react-oauth/google
```

### 3. Run Migration
```bash
sqlite3 llm_compare.db < backend/migrations/004_add_google_tokens.sql
```

### 4. Test OAuth Flow
1. Start backend: `python src/main.py`
2. Start frontend: `npm run dev`
3. Click "Continue with Google"
4. Grant permissions
5. Verify user created with Google ID

---

## Security Considerations

1. **Token Storage**:
   - Encrypt tokens in database (use `cryptography` library)
   - Never expose refresh tokens to frontend

2. **HTTPS Only in Production**:
   - OAuth requires HTTPS for production redirect URIs

3. **Scope Minimization**:
   - Only request `drive.readonly` (not full access)

4. **Token Refresh**:
   - Implement automatic token refresh before expiry
   - Handle token revocation gracefully

5. **CSRF Protection**:
   - Validate `state` parameter in OAuth callback

---

## Testing Checklist

- [ ] User can sign in with Google
- [ ] User info (email, avatar) displayed correctly
- [ ] Google Drive Picker opens
- [ ] Files selected from Drive
- [ ] Files downloaded and imported to workspace
- [ ] Existing users can connect Drive later
- [ ] Token refresh works automatically
- [ ] Works with multiple file types
- [ ] Error handling for revoked tokens
- [ ] HTTPS works in production

---

## Future Enhancements

1. **Folder Import**: Allow importing entire Drive folders
2. **Real-time Sync**: Auto-update when Drive files change
3. **Shared Drives**: Support Google Workspace shared drives
4. **File Permissions**: Respect Drive sharing settings
5. **Incremental Sync**: Only download changed files

---

## Estimated Implementation Time

- **Backend OAuth Setup**: 2-3 hours
- **Google Drive API Integration**: 3-4 hours
- **Frontend Components**: 2-3 hours
- **Create Workspace Integration**: 2 hours
- **Testing & Debugging**: 2-3 hours

**Total**: ~12-15 hours

---

## Next Steps

1. Set up Google Cloud project and get credentials
2. Implement backend OAuth endpoints
3. Add database migration for Google tokens
4. Create frontend Google Sign-In component
5. Integrate Drive Picker into Create Workspace
6. Test end-to-end flow
7. Deploy and verify HTTPS works

---

**Ready to start implementation?**
