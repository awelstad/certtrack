-- Migration 009: Allow org admins to replace (upsert) their org logo
-- Without an UPDATE policy, upsert fails on the second upload attempt.

CREATE POLICY "worker-avatars: admins can update org logo"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'worker-avatars' AND
    (storage.foldername(name))[1] = get_my_org_id()::text AND
    is_admin()
  )
  WITH CHECK (
    bucket_id = 'worker-avatars' AND
    (storage.foldername(name))[1] = get_my_org_id()::text AND
    is_admin()
  );

-- Reload PostgREST schema cache (fixes "schema out of sync" error)
NOTIFY pgrst, 'reload schema';
