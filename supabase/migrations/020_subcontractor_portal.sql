-- Subcontractor invite records
CREATE TABLE subcontractor_invites (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  job_id           uuid REFERENCES jobs(id) ON DELETE SET NULL,
  company_name     text NOT NULL,
  email            text NOT NULL,
  token            uuid NOT NULL DEFAULT gen_random_uuid(),
  status           text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  invited_by       uuid REFERENCES profiles(id),
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE subcontractor_invites ENABLE ROW LEVEL SECURITY;

-- GC org members can manage invites for their org
CREATE POLICY "org_members_manage_invites" ON subcontractor_invites
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Sub-specific profile columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sub_company_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sub_job_id uuid REFERENCES jobs(id);
