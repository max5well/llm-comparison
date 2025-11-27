#!/usr/bin/env python3
import os
from dotenv import load_dotenv

# Load .env file
load_dotenv()

print("=== Environment Variables Debug ===")
print("Raw OS environment:")
print(f"OPENAI_API_KEY (os.environ): {repr(os.environ.get('OPENAI_API_KEY', 'NOT_FOUND'))}")
print(f"ANTHROPIC_API_KEY (os.environ): {repr(os.environ.get('ANTHROPIC_API_KEY', 'NOT_FOUND'))}")
print(f"ANTHROPIC_BASE_URL (os.environ): {repr(os.environ.get('ANTHROPIC_BASE_URL', 'NOT_FOUND'))}")

print("\n dotenv.load_dotenv() result:")
dotenv_result = load_dotenv()
print(f"dotenv_result: {dotenv_result}")

print("\nAfter dotenv.load_dotenv():")
print(f"OPENAI_API_KEY: {repr(os.environ.get('OPENAI_API_KEY', 'NOT_FOUND'))}")
print(f"ANTHROPIC_API_KEY: {repr(os.environ.get('ANTHROPIC_API_KEY', 'NOT_FOUND'))}")
print(f"ANTHROPIC_BASE_URL: {repr(os.environ.get('ANTHROPIC_BASE_URL', 'NOT_FOUND'))}")

print("\n=== Pydantic Settings Test ===")
from pydantic_settings import BaseSettings
from typing import Optional
from functools import lru_cache

class TestSettings(BaseSettings):
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    anthropic_base_url: Optional[str] = None

    class Config:
        env_file = ".env"
        case_sensitive = False

@lru_cache()
def get_test_settings():
    return TestSettings()

# Let's read the .env file directly first
print("\n=== Direct .env file reading ===")
with open('.env', 'r') as f:
    lines = f.readlines()
    for i, line in enumerate(lines):
        if 'OPENAI_API_KEY' in line:
            print(f"Line {i}: {repr(line)}")
            print(f"Length: {len(line)}")
            break

print("\n=== Key extraction test ===")
for line in lines:
    if line.startswith('OPENAI_API_KEY='):
        key_part = line[len('OPENAI_API_KEY='):].strip()
        print(f"Extracted key: {repr(key_part)}")
        print(f"Key length: {len(key_part)}")
        break

# Now test with a minimal settings class
print("\n=== Pydantic Settings Test (minimal) ===")
class MinimalTestSettings(BaseSettings):
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    anthropic_base_url: Optional[str] = None

    class Config:
        env_file = ".env"
        case_sensitive = False

minimal_settings = MinimalTestSettings()
print(f"Pydantic OPENAI_API_KEY: {repr(minimal_settings.openai_api_key)}")
print(f"Pydantic ANTHROPIC_API_KEY: {repr(minimal_settings.anthropic_api_key)}")
print(f"Pydantic ANTHROPIC_BASE_URL: {repr(minimal_settings.anthropic_base_url)}")