-- ============================================================
-- Migration 023: Add platform_admin role for super admin account
--
-- Run in Supabase SQL Editor.
-- Updates the platform admin's profile role to 'platform_admin'.
-- ============================================================

UPDATE public.profiles
SET role = 'platform_admin'
WHERE id IN (
  SELECT au.id
  FROM auth.users au
  WHERE au.email = 'awelstad@gmail.com'
)
AND is_platform_admin = true;
