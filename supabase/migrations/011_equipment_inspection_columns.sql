-- ============================================================
-- Migration 011: Add missing columns to equipment_inspections
-- The table was created from schema.sql using inspector_id/inspected_at
-- but the app code expects inspector_name, inspection_date, results, etc.
-- Run in Supabase SQL Editor
-- ============================================================

ALTER TABLE equipment_inspections
  ADD COLUMN IF NOT EXISTS inspector_name      TEXT,
  ADD COLUMN IF NOT EXISTS inspector_signature TEXT,
  ADD COLUMN IF NOT EXISTS inspection_date     DATE,
  ADD COLUMN IF NOT EXISTS results             JSONB NOT NULL DEFAULT '[]';

-- Back-fill inspection_date from inspected_at for any existing rows
UPDATE equipment_inspections
  SET inspection_date = inspected_at::date
  WHERE inspection_date IS NULL;

NOTIFY pgrst, 'reload schema';
