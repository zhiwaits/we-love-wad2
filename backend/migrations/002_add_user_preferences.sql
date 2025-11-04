-- Add user preferences columns to profiles table
-- This enables the recommendation system by storing user's preferred categories and tags

-- Add preferred_categories as a text array to store multiple category preferences
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS preferred_categories TEXT[] DEFAULT '{}';

-- Add preferred_tags as a text array to store multiple tag preferences
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS preferred_tags TEXT[] DEFAULT '{}';

-- Create indexes for faster lookups when filtering recommended events
CREATE INDEX IF NOT EXISTS idx_profiles_preferred_categories ON profiles USING GIN (preferred_categories);
CREATE INDEX IF NOT EXISTS idx_profiles_preferred_tags ON profiles USING GIN (preferred_tags);

-- Add comments for documentation
COMMENT ON COLUMN profiles.preferred_categories IS 'Array of event categories the user is interested in (e.g., Academic, Workshop, Recreation)';
COMMENT ON COLUMN profiles.preferred_tags IS 'Array of event tags the user is interested in (e.g., music, technology, sports)';
