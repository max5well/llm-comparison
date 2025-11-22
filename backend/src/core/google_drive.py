"""Google Drive API Service for file operations."""

from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from googleapiclient.http import MediaIoBaseDownload
import io
import os


class GoogleDriveService:
    """Handle Google Drive file operations."""

    def __init__(self, access_token: str, refresh_token: str = None):
        """
        Initialize Google Drive service with user credentials.

        Args:
            access_token: Valid Google access token
            refresh_token: Optional refresh token for token renewal
        """
        creds = Credentials(
            token=access_token,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=os.getenv('GOOGLE_CLIENT_ID'),
            client_secret=os.getenv('GOOGLE_CLIENT_SECRET')
        )
        self.service = build('drive', 'v3', credentials=creds)

    def get_file_metadata(self, file_id: str) -> dict:
        """
        Get file metadata from Google Drive.

        Args:
            file_id: Google Drive file ID

        Returns:
            dict: File metadata (id, name, mimeType, size, modifiedTime)
        """
        return self.service.files().get(
            fileId=file_id,
            fields='id, name, mimeType, size, modifiedTime, iconLink'
        ).execute()

    def download_file(self, file_id: str) -> bytes:
        """
        Download file content from Google Drive.

        Args:
            file_id: Google Drive file ID

        Returns:
            bytes: File content
        """
        request = self.service.files().get_media(fileId=file_id)
        file_buffer = io.BytesIO()
        downloader = MediaIoBaseDownload(file_buffer, request)

        done = False
        while not done:
            status, done = downloader.next_chunk()
            if status:
                print(f"Download progress: {int(status.progress() * 100)}%")

        file_buffer.seek(0)
        return file_buffer.read()

    def export_google_doc(self, file_id: str, mime_type: str) -> bytes:
        """
        Export Google Docs/Sheets/Slides to standard format.

        Args:
            file_id: Google Drive file ID
            mime_type: Target MIME type (e.g., 'application/pdf', 'text/plain')

        Returns:
            bytes: Exported file content
        """
        request = self.service.files().export_media(
            fileId=file_id,
            mimeType=mime_type
        )
        file_buffer = io.BytesIO()
        downloader = MediaIoBaseDownload(file_buffer, request)

        done = False
        while not done:
            status, done = downloader.next_chunk()

        file_buffer.seek(0)
        return file_buffer.read()

    def list_files(self, folder_id: str = None, page_size: int = 100) -> list:
        """
        List files in Google Drive.

        Args:
            folder_id: Optional folder ID to list files from
            page_size: Number of files to return (max 1000)

        Returns:
            list: List of file metadata dictionaries
        """
        query_parts = []

        if folder_id:
            query_parts.append(f"'{folder_id}' in parents")

        # Only show files, not folders
        query_parts.append("mimeType != 'application/vnd.google-apps.folder'")

        query = " and ".join(query_parts) if query_parts else None

        results = self.service.files().list(
            q=query,
            pageSize=min(page_size, 1000),
            fields="files(id, name, mimeType, size, modifiedTime, iconLink)",
            orderBy="modifiedTime desc"
        ).execute()

        return results.get('files', [])

    def get_export_mime_type(self, google_mime_type: str) -> str:
        """
        Get appropriate export MIME type for Google Docs formats.

        Args:
            google_mime_type: Google-specific MIME type

        Returns:
            str: Standard export MIME type
        """
        export_map = {
            'application/vnd.google-apps.document': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',  # DOCX
            'application/vnd.google-apps.spreadsheet': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',  # XLSX
            'application/vnd.google-apps.presentation': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',  # PPTX
            'application/vnd.google-apps.drawing': 'application/pdf',
        }
        return export_map.get(google_mime_type, 'application/pdf')

    def is_google_doc(self, mime_type: str) -> bool:
        """Check if file is a Google Docs format that needs export."""
        google_mime_types = [
            'application/vnd.google-apps.document',
            'application/vnd.google-apps.spreadsheet',
            'application/vnd.google-apps.presentation',
            'application/vnd.google-apps.drawing'
        ]
        return mime_type in google_mime_types
