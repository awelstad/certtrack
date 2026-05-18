-- Migration 024: Orientation worker auth + session resume + pass IDs

-- Worker identity fields on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS worker_number TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- Enhance orientation_completions with pass tracking
ALTER TABLE orientation_completions
  ADD COLUMN IF NOT EXISTS pass_id          TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS worker_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS worker_email     TEXT,
  ADD COLUMN IF NOT EXISTS employer         TEXT,
  ADD COLUMN IF NOT EXISTS employer_type    TEXT;

-- Session table for resume capability
CREATE TABLE IF NOT EXISTS orientation_sessions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  orientation_id  UUID        NOT NULL REFERENCES job_orientations(id) ON DELETE CASCADE,
  job_id          UUID        NOT NULL,
  organization_id UUID        NOT NULL,
  step            TEXT        NOT NULL DEFAULT 'confirm_job',
  answers         JSONB       NOT NULL DEFAULT '{}',
  employer        TEXT,
  employer_type   TEXT,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (worker_id, orientation_id)
);

ALTER TABLE orientation_sessions ENABLE ROW LEVEL SECURITY;

-- Workers can manage their own session
CREATE POLICY "worker_own_session" ON orientation_sessions
  FOR ALL USING (worker_id = auth.uid());

-- Org managers can view sessions for their org
CREATE POLICY "org_manager_view_sessions" ON orientation_sessions
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid())
        IN ('platform_admin', 'owner', 'admin', 'pm', 'superintendent')
  );
