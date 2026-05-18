-- Migration 025: Worker system unification + kiosk accounts + worker portal RLS

-- ── workers table ────────────────────────────────────────────────────────────

-- Bridge: link a workers record to an auth account (set when they log in via orientation or portal invite)
ALTER TABLE workers ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

-- Flag: whether orientation is required before this worker can check in via kiosk
ALTER TABLE workers ADD COLUMN IF NOT EXISTS requires_orientation BOOLEAN NOT NULL DEFAULT false;

-- Track when a portal invite was sent
ALTER TABLE workers ADD COLUMN IF NOT EXISTS portal_invite_sent_at TIMESTAMPTZ;

-- Index for quick lookup by auth account
CREATE INDEX IF NOT EXISTS workers_auth_user_id_idx ON workers(auth_user_id) WHERE auth_user_id IS NOT NULL;

-- ── profiles table ───────────────────────────────────────────────────────────

-- Kiosk accounts are locked to a single job
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS kiosk_job_id UUID REFERENCES jobs(id) ON DELETE SET NULL;

-- ── RLS: workers can read their own workers record ────────────────────────────

-- Workers (role='worker') can read the workers row that is linked to their auth account
CREATE POLICY "worker_read_own_record" ON workers
  FOR SELECT
  USING (auth_user_id = auth.uid());

-- ── RLS: workers can read/insert their own certifications ────────────────────

-- workers can see their own certifications (via the linked workers row)
CREATE POLICY "worker_read_own_certs" ON worker_certifications
  FOR SELECT
  USING (
    worker_id IN (
      SELECT id FROM workers WHERE auth_user_id = auth.uid()
    )
  );

-- workers can submit new certifications for themselves (status will be 'pending')
CREATE POLICY "worker_insert_own_certs" ON worker_certifications
  FOR INSERT
  WITH CHECK (
    worker_id IN (
      SELECT id FROM workers WHERE auth_user_id = auth.uid()
    )
  );

-- ── RLS: kiosk accounts ───────────────────────────────────────────────────────

-- Kiosk accounts (role='kiosk') can read site_attendance for their assigned job
-- The existing "org members can read site attendance" policy covers kiosk since
-- they have an organization_id. No additional policy needed for reads.

-- Kiosk can read workers in their org (existing org-member policies cover this).
-- Kiosk can insert site_attendance (existing org-member insert policy covers this).

-- Kiosk can read job_orientations for their job (to check worker orientation status)
CREATE POLICY "kiosk_read_orientations" ON job_orientations
  FOR SELECT
  USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

-- Kiosk can read orientation_completions for their job
CREATE POLICY "kiosk_read_completions" ON orientation_completions
  FOR SELECT
  USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );
