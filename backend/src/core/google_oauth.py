"""Google OAuth 2.0 Service for user authentication and Drive access."""

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
import secrets
from src.core.config import get_settings

# Scopes for user login (profile only, no Drive access)
LOGIN_SCOPES = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
]

# Scopes for Drive connection (includes Drive access)
DRIVE_SCOPES = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/drive.readonly'
]


class GoogleOAuthService:
    """Handle Google OAuth 2.0 authentication flow."""

    def __init__(self):
        settings = get_settings()
        self.client_id = settings.google_client_id
        self.client_secret = settings.google_client_secret
        self.redirect_uri = settings.google_redirect_uri

        if not self.client_id or not self.client_secret:
            print("⚠️  Warning: Google OAuth credentials not configured")

    def get_authorization_url(self, state: str = None, redirect_uri: str = None, scopes: list = None) -> tuple[str, str]:
        """
        Generate Google OAuth authorization URL.

        Args:
            state: Optional CSRF protection token
            redirect_uri: Optional custom redirect URI (defaults to self.redirect_uri)
            scopes: Optional list of OAuth scopes (defaults to LOGIN_SCOPES)

        Returns:
            tuple: (authorization_url, state_token)
        """
        if not state:
            state = secrets.token_urlsafe(32)

        redirect = redirect_uri or self.redirect_uri
        oauth_scopes = scopes or LOGIN_SCOPES  # Default to login scopes (no Drive)

        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [redirect]
                }
            },
            scopes=oauth_scopes,
            redirect_uri=redirect
        )

        authorization_url, _ = flow.authorization_url(
            access_type='offline',  # Get refresh token
            include_granted_scopes='true',
            state=state,
            prompt='select_account'  # Show account chooser for multi-account users
        )

        return authorization_url, state

    def exchange_code_for_tokens(self, code: str, redirect_uri: str = None, scopes: list = None) -> dict:
        """
        Exchange authorization code for access and refresh tokens.

        Args:
            code: Authorization code from OAuth callback
            redirect_uri: Optional custom redirect URI (defaults to self.redirect_uri)
            scopes: Optional list of OAuth scopes (defaults to LOGIN_SCOPES)

        Returns:
            dict: Token information
        """
        redirect = redirect_uri or self.redirect_uri
        oauth_scopes = scopes or LOGIN_SCOPES

        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [redirect]
                }
            },
            scopes=oauth_scopes,
            redirect_uri=redirect
        )

        # Use include_granted_scopes='false' to prevent scope expansion
        # and handle the OAuth flow more flexibly
        try:
            flow.fetch_token(code=code, include_granted_scopes='false')
        except Exception as e:
            # If there's still a scope mismatch, try with a more permissive approach
            if "Scope has changed" in str(e):
                print(f"⚠️  Scope detected, attempting flexible token exchange...")
                # Create a new flow without strict scope validation
                flow = Flow.from_client_config(
                    {
                        "web": {
                            "client_id": self.client_id,
                            "client_secret": self.client_secret,
                            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                            "token_uri": "https://oauth2.googleapis.com/token",
                            "redirect_uris": [redirect]
                        }
                    },
                    scopes=None,  # Let OAuth library handle scopes automatically
                    redirect_uri=redirect
                )
                flow.fetch_token(code=code)
            else:
                raise e

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
