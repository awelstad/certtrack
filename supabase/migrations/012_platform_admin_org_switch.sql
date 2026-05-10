-- ============================================================
-- Migration 012: Platform admin org switching
-- Adds platform_active_org_id to profiles so a platform admin
-- can "enter" any org and see its data through normal RLS.
-- Run in Supabase SQL Editor
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS platform_active_org_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- Update get_my_org_id() to respect the override for platform admins only.
-- Regular users are unaffected — the CASE returns their normal organization_id.
CREATE OR REPLACE FUNCTION get_my_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT CASE
    WHEN p.is_platform_admin
    THEN COALESCE(p.platform_active_org_id, p.organization_id)
    ELSE p.organization_id
  END
  FROM profiles p
  WHERE id = auth.uid()
$$;

NOTIFY pgrst, 'reload schema';
