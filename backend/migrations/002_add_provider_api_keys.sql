-- Add provider_api_keys table for storing user API keys
CREATE TABLE IF NOT EXISTS provider_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    api_key_encrypted TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Ensure one key per provider per user
    UNIQUE(user_id, provider)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_provider_api_keys_user_id ON provider_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_provider_api_keys_provider ON provider_api_keys(provider);
