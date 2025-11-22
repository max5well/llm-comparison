-- Migration: Add Google OAuth support
-- Date: 2025-01-22
-- Description: Add columns for Google authentication and Drive integration

-- Add Google OAuth columns to users table (without UNIQUE constraint in ALTER)
ALTER TABLE users ADD COLUMN google_id TEXT;
ALTER TABLE users ADD COLUMN google_access_token TEXT;
ALTER TABLE users ADD COLUMN google_refresh_token TEXT;
ALTER TABLE users ADD COLUMN google_token_expiry TIMESTAMP;
ALTER TABLE users ADD COLUMN avatar_url TEXT;
ALTER TABLE users ADD COLUMN name TEXT;

-- Create unique index for Google ID (enforces uniqueness)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id_unique ON users(google_id) WHERE google_id IS NOT NULL;

-- Add source tracking to documents table (to track Drive imports)
ALTER TABLE documents ADD COLUMN source TEXT DEFAULT 'upload';
ALTER TABLE documents ADD COLUMN source_id TEXT;

-- Create index for source lookups
CREATE INDEX IF NOT EXISTS idx_documents_source ON documents(source, source_id);
