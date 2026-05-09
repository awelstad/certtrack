-- ============================================================
-- Migration 001: Add job_workers assignment table
-- Run once in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS job_workers (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id     uuid        NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  worker_id  uuid        NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  added_by   uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  added_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, worker_id)
);

ALTER TABLE job_workers ENABLE ROW LEVEL SECURITY;

-- Org members can read assignments for their org's jobs
CREATE POLICY "org members read job_workers"
  ON job_workers FOR SELECT
  USING (
    job_id IN (
      SELECT id FROM jobs WHERE organization_id = get_my_org_id()
    )
  );

-- Managers can insert/update/delete assignments for their org's jobs
CREATE POLICY "managers manage job_workers"
  ON job_workers FOR ALL
  USING (
    is_manager()
    AND job_id IN (SELECT id FROM jobs WHERE organization_id = get_my_org_id())
  )
  WITH CHECK (
    is_manager()
    AND job_id IN (SELECT id FROM jobs WHERE organization_id = get_my_org_id())
  );
