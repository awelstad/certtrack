-- ============================================================
-- Migration 003: Orientation modules and signatures
-- Run once in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS orientation_modules (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  job_id                UUID REFERENCES jobs(id) ON DELETE SET NULL,
  title                 TEXT NOT NULL,
  content               TEXT,
  is_required           BOOLEAN NOT NULL DEFAULT true,
  include_in_compliance BOOLEAN NOT NULL DEFAULT false,
  created_by            UUID REFERENCES profiles(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orientation_signatures (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orientation_id  UUID NOT NULL REFERENCES orientation_modules(id) ON DELETE CASCADE,
  worker_id       UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  signed_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address      TEXT,
  UNIQUE(orientation_id, worker_id)
);

-- ── RLS ──────────────────────────────────────────────────────

ALTER TABLE orientation_modules    ENABLE ROW LEVEL SECURITY;
ALTER TABLE orientation_signatures ENABLE ROW LEVEL SECURITY;

-- orientation_modules: all org members can read
CREATE POLICY "org members can view orientation_modules"
  ON orientation_modules FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- managers can create / update / delete
CREATE POLICY "managers can manage orientation_modules"
  ON orientation_modules FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
        AND role IN ('owner','admin','pm','superintendent')
    )
  );

-- orientation_signatures: org members can read
CREATE POLICY "org members can view orientation_signatures"
  ON orientation_signatures FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- any org member can insert a signature (server action enforces correct worker_id)
CREATE POLICY "org members can sign orientations"
  ON orientation_signatures FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- managers can delete signatures (e.g. to reset / re-sign)
CREATE POLICY "managers can delete orientation_signatures"
  ON orientation_signatures FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
        AND role IN ('owner','admin','pm','superintendent')
    )
  );
