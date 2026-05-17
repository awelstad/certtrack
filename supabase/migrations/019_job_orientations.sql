-- Job-specific orientation with video + quiz
CREATE TABLE job_orientations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  job_id           uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  title            text NOT NULL DEFAULT 'Site Safety Orientation',
  description      text,
  video_url        text,
  passing_score    integer NOT NULL DEFAULT 80 CHECK (passing_score BETWEEN 0 AND 100),
  questions        jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by       uuid REFERENCES profiles(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE(job_id)
);

ALTER TABLE job_orientations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_all" ON job_orientations
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Worker completion records (public insert via admin client)
CREATE TABLE orientation_completions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orientation_id   uuid NOT NULL REFERENCES job_orientations(id) ON DELETE CASCADE,
  job_id           uuid NOT NULL,
  organization_id  uuid NOT NULL,
  worker_name      text NOT NULL,
  worker_id        uuid REFERENCES workers(id),
  score            integer,
  passed           boolean NOT NULL DEFAULT true,
  answers          jsonb,
  completed_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE orientation_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_select" ON orientation_completions
  FOR SELECT USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
