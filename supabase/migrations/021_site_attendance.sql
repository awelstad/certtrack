-- Site attendance: check-in / check-out via QR scanner kiosk

CREATE TABLE IF NOT EXISTS site_attendance (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  job_id          UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  worker_id       UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  event           TEXT NOT NULL CHECK (event IN ('check_in', 'check_out')),
  scanned_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS site_attendance_org_job_idx    ON site_attendance(organization_id, job_id);
CREATE INDEX IF NOT EXISTS site_attendance_worker_idx     ON site_attendance(worker_id);
CREATE INDEX IF NOT EXISTS site_attendance_scanned_at_idx ON site_attendance(scanned_at);

ALTER TABLE site_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can read site attendance"
  ON site_attendance FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "org members can insert site attendance"
  ON site_attendance FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));
