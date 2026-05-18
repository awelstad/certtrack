-- Migration 026: Organization-level settings flags
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS workers_can_upload_certs BOOLEAN NOT NULL DEFAULT true;
