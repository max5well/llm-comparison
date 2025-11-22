"""Google OAuth 2.0 Service for user authentication and Drive access."""

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
import os
import secrets

SCOPES = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/drive.readonly'
]


class GoogleOAuthService:
    """Handle Google OAuth 2.0 authentication flow."""

    def __init__(self):
        self.client_id = os.getenv('GOOGLE_CLIENT_ID')
        self.client_secret = os.getenv('GOOGLE_CLIENT_SECRET')
        self.redirect_uri = os.getenv(
            'GOOGLE_REDIRECT_URI',
            'http://localhost:3000/auth/google/callback'
        )

        if not self.client_id or not self.client_secret:
            print("⚠️  Warning: Google OAuth credentials not configured")

    def get_authorization_url(self, state: str = None) -> tuple[str, str]:
        """
        Generate Google OAuth authorization URL.

        Args:
            state: Optional CSRF protection token

        Returns:
            tuple: (authorization_url, state_token)
        """
        if not state:
            state = secrets.token_urlsafe(32)

        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [self.redirect_uri]
                }
            },
            scopes=SCOPES,
            redirect_uri=self.redirect_uri
        )

        authorization_url, _ = flow.authorization_url(
            access_type='offline',  # Get refresh token
            include_granted_scopes='true',
            state=state,
            prompt='consent'  # Force consent to ensure refresh token
        )

        return authorization_url, state

    def exchange_code_for_tokens(self, code: str) -> dict:
        """
        Exchange authorization code for access and refresh tokens.

        Args:
            code: Authorization code from OAuth callback

        Returns:
            dict: Token information
        """
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [self.redirect_uri]
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
            "scopes": credentials.scopes,
            "expiry": credentials.expiry.isoformat() if credentials.expiry else None
        }

    def get_user_info(self, access_token: str) -> dict:
        """
        Get user profile information from Google.

        Args:
            access_token: Valid Google access token

        Returns:
            dict: User profile (id, email, name, picture)
        """
        import requests

        response = requests.get(
            'https://www.googleapis.com/oauth2/v2/userinfo',
            headers={'Authorization': f'Bearer {access_token}'}
        )
        response.raise_for_status()
        return response.json()

    def refresh_access_token(self, refresh_token: str) -> dict:
        """
        Refresh an expired access token.

        Args:
            refresh_token: Valid refresh token

        Returns:
            dict: New token information
        """
        credentials = Credentials(
            token=None,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=self.client_id,
            client_secret=self.client_secret
        )

        # Refresh the token
        from google.auth.transport.requests import Request
        credentials.refresh(Request())

        return {
            "access_token": credentials.token,
            "expiry": credentials.expiry.isoformat() if credentials.expiry else None
        }
