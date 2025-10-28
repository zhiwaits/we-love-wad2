-- Create auth_tokens table to persist authentication tokens across server restarts
-- This solves the issue where saved user accounts stop working after backend restart

CREATE TABLE IF NOT EXISTS auth_tokens (
    id SERIAL PRIMARY KEY,
    token VARCHAR(255) NOT NULL UNIQUE,
    user_id UUID NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_auth_tokens_token ON auth_tokens(token);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_expires_at ON auth_tokens(expires_at);

-- Optional: Add a cleanup trigger to remove expired tokens
-- (This can also be run periodically as a cron job instead)
-- DELETE FROM auth_tokens WHERE expires_at < NOW();
