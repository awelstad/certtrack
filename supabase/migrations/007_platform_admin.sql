-- Add platform admin flag to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN NOT NULL DEFAULT false;

-- After running this, mark your own account as platform admin:
-- UPDATE profiles SET is_platform_admin = true WHERE id = '<YOUR_AUTH_UUID>';
