"""
Encryption utilities for securely storing API keys.
"""
from cryptography.fernet import Fernet
from src.core.config import settings
import base64
import hashlib


def get_encryption_key() -> bytes:
    """
    Generate a consistent encryption key from the JWT secret.
    This allows us to encrypt/decrypt without storing a separate key.
    """
    # Use the JWT secret to derive an encryption key
    key_material = settings.jwt_secret_key.encode()
    # Derive a 32-byte key using SHA-256
    derived_key = hashlib.sha256(key_material).digest()
    # Fernet requires a URL-safe base64-encoded 32-byte key
    return base64.urlsafe_b64encode(derived_key)


def encrypt_api_key(api_key: str) -> str:
    """
    Encrypt an API key for secure storage.

    Args:
        api_key: The plaintext API key

    Returns:
        Encrypted API key as a string
    """
    if not api_key:
        return ""

    f = Fernet(get_encryption_key())
    encrypted = f.encrypt(api_key.encode())
    return encrypted.decode()


def decrypt_api_key(encrypted_key: str) -> str:
    """
    Decrypt an API key from storage.

    Args:
        encrypted_key: The encrypted API key

    Returns:
        Decrypted API key as plaintext
    """
    if not encrypted_key:
        return ""

    f = Fernet(get_encryption_key())
    decrypted = f.decrypt(encrypted_key.encode())
    return decrypted.decode()
