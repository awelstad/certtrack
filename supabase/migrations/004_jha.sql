-- ============================================================
-- Migration 004: JHA templates, signatures, status update
-- Run once in Supabase SQL Editor
-- ============================================================

-- Update JHA status column to allow new values
-- (drop existing check constraint if present, add new one)
ALTER TABLE jhas DROP CONSTRAINT IF EXISTS jhas_status_check;
ALTER TABLE jhas ADD CONSTRAINT jhas_status_check
  CHECK (status IN ('draft','active','completed','archived'));

-- Ensure field_values column exists (may have been skipped in initial schema)
ALTER TABLE jhas ADD COLUMN IF NOT EXISTS field_values JSONB;

-- ── JHA Templates ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS jha_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  default_steps   JSONB NOT NULL DEFAULT '[]',
  default_ppe     JSONB NOT NULL DEFAULT '[]',
  created_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE jha_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view jha_templates"
  ON jha_templates FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "managers can manage jha_templates"
  ON jha_templates FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
        AND role IN ('owner','admin','pm','superintendent')
    )
  );

-- ── JHA Signatures ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS jha_signatures (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jha_id            UUID NOT NULL REFERENCES jhas(id) ON DELETE CASCADE,
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  worker_id         UUID REFERENCES workers(id) ON DELETE SET NULL,
  printed_name      TEXT NOT NULL,
  signature_data    TEXT,
  worker_identifier TEXT,
  signed_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE jha_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view jha_signatures"
  ON jha_signatures FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "org members can add jha_signatures"
  ON jha_signatures FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "managers can delete jha_signatures"
  ON jha_signatures FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
        AND role IN ('owner','admin','pm','superintendent')
    )
  );
