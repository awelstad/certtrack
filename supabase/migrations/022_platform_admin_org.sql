-- ============================================================
-- Migration 022: Create "Clearwork Admin" organization for platform admin
--
-- Run in Supabase SQL Editor.
-- After running, go to /super-admin, find "Clearwork Admin" in the list,
-- click "Details", then click "Set as My Home Org" to move your profile there.
-- ============================================================

DO $$
DECLARE
  admin_org_id UUID;
BEGIN
  -- Create the Clearwork Admin org (idempotent)
  INSERT INTO public.organizations (name, slug, plan)
  SELECT 'Clearwork Admin', 'clearwork-admin', 'pro'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.organizations WHERE slug = 'clearwork-admin'
  );

  SELECT id INTO admin_org_id FROM public.organizations WHERE slug = 'clearwork-admin';

  RAISE NOTICE 'Clearwork Admin org id: %', admin_org_id;
END $$;

NOTIFY pgrst, 'reload schema';
