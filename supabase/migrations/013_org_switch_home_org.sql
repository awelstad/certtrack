-- ============================================================
-- Migration 013: Replace platform_active_org_id with home_org_id approach
-- Instead of overriding get_my_org_id(), we swap organization_id directly
-- and save the original in home_org_id so we can restore it on exit.
-- Run in Supabase SQL Editor
-- ============================================================

-- Add home_org_id to track where the platform admin came from
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS home_org_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- Revert get_my_org_id() to the simple original — no special logic needed
CREATE OR REPLACE FUNCTION get_my_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid()
$$;

-- Clear any leftover platform_active_org_id values
UPDATE profiles SET platform_active_org_id = NULL WHERE platform_active_org_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
