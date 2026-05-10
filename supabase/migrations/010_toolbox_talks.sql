-- ============================================================
-- Migration 010: Toolbox Talks + Equipment Public ID
-- Run in Supabase SQL Editor
-- ============================================================

-- ── Toolbox Talks ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS toolbox_talks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  job_id           UUID REFERENCES jobs(id) ON DELETE SET NULL,
  title            TEXT NOT NULL,
  topic            TEXT,
  content          TEXT,
  conducted_by     TEXT,
  talk_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  public_token     UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS toolbox_talk_signatures (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  talk_id          UUID NOT NULL REFERENCES toolbox_talks(id) ON DELETE CASCADE,
  organization_id  UUID NOT NULL,
  printed_name     TEXT NOT NULL,
  worker_identifier TEXT,
  signed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Global template library (not org-scoped — visible to all)
CREATE TABLE IF NOT EXISTS toolbox_talk_templates (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT NOT NULL,
  topic      TEXT,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS toolbox_talks_org_idx   ON toolbox_talks(organization_id);
CREATE INDEX IF NOT EXISTS toolbox_talks_token_idx ON toolbox_talks(public_token);
CREATE INDEX IF NOT EXISTS tts_talk_idx            ON toolbox_talk_signatures(talk_id);

-- ── RLS ───────────────────────────────────────────────────
ALTER TABLE toolbox_talks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE toolbox_talk_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE toolbox_talk_templates  ENABLE ROW LEVEL SECURITY;

-- Authenticated org members can read their org's talks
CREATE POLICY "toolbox_talks: org members can read"
  ON toolbox_talks FOR SELECT TO authenticated
  USING (organization_id = get_my_org_id());

-- Managers can create talks
CREATE POLICY "toolbox_talks: managers can create"
  ON toolbox_talks FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_my_org_id() AND is_manager());

-- Managers can update (status changes, edits)
CREATE POLICY "toolbox_talks: managers can update"
  ON toolbox_talks FOR UPDATE TO authenticated
  USING (organization_id = get_my_org_id() AND is_manager());

-- Public (anon) can read talks by token for the sign page
CREATE POLICY "toolbox_talks: anon can read by token"
  ON toolbox_talks FOR SELECT TO anon
  USING (true);

-- Org members can view signatures
CREATE POLICY "toolbox_talk_signatures: org members can read"
  ON toolbox_talk_signatures FOR SELECT TO authenticated
  USING (organization_id = get_my_org_id());

-- Anyone (field worker with QR link) can add a signature
CREATE POLICY "toolbox_talk_signatures: anyone can sign"
  ON toolbox_talk_signatures FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- All authenticated users can read templates
CREATE POLICY "toolbox_talk_templates: authenticated can read"
  ON toolbox_talk_templates FOR SELECT TO authenticated
  USING (true);

-- ── Equipment: add public_id for QR codes ─────────────────
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS public_id UUID NOT NULL DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS equipment_public_id_idx ON equipment(public_id);

-- Public (anon) can read equipment by public_id
CREATE POLICY "equipment: anon can view"
  ON equipment FOR SELECT TO anon
  USING (true);

NOTIFY pgrst, 'reload schema';
