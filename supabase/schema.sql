-- ============================================================
-- CertTrack — Database Schema
-- Run this in the Supabase SQL Editor
-- Safe to re-run: drops all tables before recreating
-- ============================================================


-- ============================================================
-- TEARDOWN (drop in reverse dependency order)
-- Covers both current and any previously named tables
-- ============================================================

-- Current schema tables
DROP TABLE IF EXISTS equipment_inspection_signatures     CASCADE;
DROP TABLE IF EXISTS equipment_inspection_photos         CASCADE;
DROP TABLE IF EXISTS equipment_inspection_items          CASCADE;
DROP TABLE IF EXISTS equipment_inspections               CASCADE;
DROP TABLE IF EXISTS equipment_inspection_template_items CASCADE;
DROP TABLE IF EXISTS equipment_inspection_templates      CASCADE;
DROP TABLE IF EXISTS equipment                           CASCADE;
DROP TABLE IF EXISTS equipment_types                     CASCADE;
DROP TABLE IF EXISTS jha_signatures                      CASCADE;
DROP TABLE IF EXISTS jha_attendees                       CASCADE;
DROP TABLE IF EXISTS jha_required_ppe                    CASCADE;
DROP TABLE IF EXISTS jha_controls                        CASCADE;
DROP TABLE IF EXISTS jha_hazards                         CASCADE;
DROP TABLE IF EXISTS jha_steps                           CASCADE;
DROP TABLE IF EXISTS jhas                                CASCADE;
DROP TABLE IF EXISTS jha_template_fields                 CASCADE;
DROP TABLE IF EXISTS jha_templates                       CASCADE;
DROP TABLE IF EXISTS orientation_signatures              CASCADE;
DROP TABLE IF EXISTS orientation_modules                 CASCADE;
DROP TABLE IF EXISTS job_required_certifications         CASCADE;
DROP TABLE IF EXISTS worker_certifications               CASCADE;
DROP TABLE IF EXISTS certification_types                 CASCADE;
DROP TABLE IF EXISTS qr_scan_logs                        CASCADE;
DROP TABLE IF EXISTS reminders                           CASCADE;
DROP TABLE IF EXISTS audit_logs                          CASCADE;
DROP TABLE IF EXISTS documents                           CASCADE;
DROP TABLE IF EXISTS jobs                                CASCADE;
DROP TABLE IF EXISTS workers                             CASCADE;
DROP TABLE IF EXISTS profiles                            CASCADE;
DROP TABLE IF EXISTS organizations                       CASCADE;

-- Legacy table names from previous schema version
DROP TABLE IF EXISTS inspection_items        CASCADE;
DROP TABLE IF EXISTS inspections             CASCADE;
DROP TABLE IF EXISTS inspection_templates    CASCADE;
DROP TABLE IF EXISTS orientation_completions CASCADE;
DROP TABLE IF EXISTS orientations            CASCADE;
DROP TABLE IF EXISTS job_requirements        CASCADE;
DROP TABLE IF EXISTS job_workers             CASCADE;
DROP TABLE IF EXISTS job_sites               CASCADE;
DROP TABLE IF EXISTS worker_certs            CASCADE;
DROP TABLE IF EXISTS cert_types              CASCADE;
DROP TABLE IF EXISTS scan_events             CASCADE;
DROP TABLE IF EXISTS audit_log               CASCADE;
DROP TABLE IF EXISTS companies               CASCADE;

DROP FUNCTION IF EXISTS set_updated_at()     CASCADE;
DROP FUNCTION IF EXISTS generate_public_id() CASCADE;


-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION generate_public_id()
RETURNS text LANGUAGE plpgsql AS $$
BEGIN
  RETURN lower(substring(replace(gen_random_uuid()::text, '-', '') FROM 1 FOR 12));
END;
$$;


-- ============================================================
-- CORE
-- ============================================================

CREATE TABLE organizations (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  slug        text        NOT NULL UNIQUE,
  logo_url    text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE profiles (
  id              uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role            text        NOT NULL CHECK (role IN ('owner', 'admin', 'pm', 'superintendent', 'worker', 'subcontractor_admin', 'gc_read_only')),
  full_name       text        NOT NULL,
  phone           text,
  avatar_url      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE workers (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  profile_id      uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  public_id       text        NOT NULL UNIQUE DEFAULT generate_public_id(),
  first_name      text        NOT NULL,
  last_name       text        NOT NULL,
  email           text,
  phone           text,
  trade           text,
  employer        text,
  status          text        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  avatar_url      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE jobs (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name              text        NOT NULL,
  address           text,
  city              text,
  state             text,
  zip               text,
  status            text        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'on_hold', 'cancelled')),
  superintendent_id uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  start_date        date,
  end_date          date,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE documents (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  related_table   text        NOT NULL,
  related_id      uuid        NOT NULL,
  file_name       text        NOT NULL,
  file_url        text        NOT NULL,
  file_type       text,
  file_size       bigint,
  uploaded_by     uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_id        uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  action          text        NOT NULL,
  entity_type     text        NOT NULL,
  entity_id       uuid,
  metadata        jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE reminders (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  worker_id       uuid        REFERENCES workers(id) ON DELETE CASCADE,
  related_table   text,
  related_id      uuid,
  reminder_type   text        NOT NULL,
  due_at          timestamptz NOT NULL,
  sent_at         timestamptz,
  status          text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'dismissed')),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- qr_scan_logs.equipment_id FK is added after the equipment table is created below
CREATE TABLE qr_scan_logs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        REFERENCES organizations(id) ON DELETE CASCADE,
  worker_id       uuid        REFERENCES workers(id) ON DELETE SET NULL,
  equipment_id    uuid,
  scanned_by      uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  public_id       text        NOT NULL,
  scan_type       text        NOT NULL CHECK (scan_type IN ('worker', 'equipment')),
  ip_address      text,
  user_agent      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- CERTIFICATIONS
-- ============================================================

CREATE TABLE certification_types (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name              text        NOT NULL,
  description       text,
  validity_days     int,
  requires_document boolean     NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE worker_certifications (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  worker_id             uuid        NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  certification_type_id uuid        NOT NULL REFERENCES certification_types(id) ON DELETE RESTRICT,
  issue_date            date,
  expiry_date           date,
  status                text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  document_url          text,
  notes                 text,
  reviewed_by           uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at           timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE job_required_certifications (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  job_id                uuid        NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  certification_type_id uuid        NOT NULL REFERENCES certification_types(id) ON DELETE CASCADE,
  created_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, certification_type_id)
);


-- ============================================================
-- ORIENTATIONS
-- ============================================================

CREATE TABLE orientation_modules (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  job_id          uuid        REFERENCES jobs(id) ON DELETE CASCADE,
  title           text        NOT NULL,
  content         text,
  version         int         NOT NULL DEFAULT 1,
  status          text        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_by      uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE orientation_signatures (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  orientation_module_id uuid        NOT NULL REFERENCES orientation_modules(id) ON DELETE CASCADE,
  worker_id             uuid        NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  job_id                uuid        REFERENCES jobs(id) ON DELETE SET NULL,
  signature_data        text,
  signed_at             timestamptz NOT NULL DEFAULT now(),
  created_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (orientation_module_id, worker_id)
);


-- ============================================================
-- JHA
-- ============================================================

CREATE TABLE jha_templates (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            text        NOT NULL,
  description     text,
  created_by      uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE jha_template_fields (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id   uuid        NOT NULL REFERENCES jha_templates(id) ON DELETE CASCADE,
  field_name    text        NOT NULL,
  field_type    text        NOT NULL CHECK (field_type IN ('text', 'textarea', 'select', 'checkbox', 'date', 'number')),
  field_options jsonb,
  required      boolean     NOT NULL DEFAULT false,
  sort_order    int         NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE jhas (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  job_id            uuid        NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  template_id       uuid        REFERENCES jha_templates(id) ON DELETE SET NULL,
  title             text        NOT NULL,
  work_description  text,
  work_area         text,
  work_date         date,
  status            text        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed')),
  superintendent_id uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  field_values      jsonb,
  created_by        uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE jha_steps (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  jha_id      uuid        NOT NULL REFERENCES jhas(id) ON DELETE CASCADE,
  step_number int         NOT NULL,
  description text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE jha_hazards (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  jha_id      uuid        NOT NULL REFERENCES jhas(id) ON DELETE CASCADE,
  step_id     uuid        REFERENCES jha_steps(id) ON DELETE CASCADE,
  description text        NOT NULL,
  risk_level  text        NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE jha_controls (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  jha_id      uuid        NOT NULL REFERENCES jhas(id) ON DELETE CASCADE,
  hazard_id   uuid        NOT NULL REFERENCES jha_hazards(id) ON DELETE CASCADE,
  description text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE jha_required_ppe (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  jha_id     uuid        NOT NULL REFERENCES jhas(id) ON DELETE CASCADE,
  ppe_item   text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE jha_attendees (
  id        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  jha_id    uuid        NOT NULL REFERENCES jhas(id) ON DELETE CASCADE,
  worker_id uuid        NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  added_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (jha_id, worker_id)
);

CREATE TABLE jha_signatures (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  jha_id          uuid        NOT NULL REFERENCES jhas(id) ON DELETE CASCADE,
  worker_id       uuid        NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  signature_data  text,
  signed_at       timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (jha_id, worker_id)
);


-- ============================================================
-- EQUIPMENT
-- ============================================================

CREATE TABLE equipment_types (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                     text NOT NULL,
  category                 text,
  inspection_interval_days int
);

CREATE TABLE equipment (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  public_id         text        NOT NULL UNIQUE DEFAULT generate_public_id(),
  equipment_type_id uuid        REFERENCES equipment_types(id) ON DELETE SET NULL,
  name              text        NOT NULL,
  make              text,
  model             text,
  serial_number     text,
  year              int,
  job_id            uuid        REFERENCES jobs(id) ON DELETE SET NULL,
  status            text        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'out_of_service', 'retired')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Add deferred FK now that equipment exists
ALTER TABLE qr_scan_logs
  ADD CONSTRAINT qr_scan_logs_equipment_id_fkey
  FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE SET NULL;

CREATE TABLE equipment_inspection_templates (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid        REFERENCES organizations(id) ON DELETE CASCADE,
  equipment_type_id uuid        REFERENCES equipment_types(id) ON DELETE SET NULL,
  title             text        NOT NULL,
  description       text,
  checklist_items   jsonb       NOT NULL DEFAULT '[]',
  created_by        uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE equipment_inspection_template_items (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid        NOT NULL REFERENCES equipment_inspection_templates(id) ON DELETE CASCADE,
  category    text,
  item_text   text        NOT NULL,
  required    boolean     NOT NULL DEFAULT true,
  sort_order  int         NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE equipment_inspections (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  equipment_id    uuid        NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  job_id          uuid        REFERENCES jobs(id) ON DELETE SET NULL,
  template_id     uuid        REFERENCES equipment_inspection_templates(id) ON DELETE SET NULL,
  inspector_id    uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  inspected_at    timestamptz NOT NULL DEFAULT now(),
  status          text        NOT NULL CHECK (status IN ('pass', 'fail', 'needs_repair')),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE equipment_inspection_items (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id    uuid        NOT NULL REFERENCES equipment_inspections(id) ON DELETE CASCADE,
  template_item_id uuid        REFERENCES equipment_inspection_template_items(id) ON DELETE SET NULL,
  category         text,
  item_text        text        NOT NULL,
  result           text        NOT NULL CHECK (result IN ('pass', 'fail', 'na')),
  notes            text,
  sort_order       int         NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE equipment_inspection_photos (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid        NOT NULL REFERENCES equipment_inspections(id) ON DELETE CASCADE,
  file_url      text        NOT NULL,
  caption       text,
  uploaded_by   uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE equipment_inspection_signatures (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id  uuid        NOT NULL REFERENCES equipment_inspections(id) ON DELETE CASCADE,
  worker_id      uuid        REFERENCES workers(id) ON DELETE SET NULL,
  profile_id     uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  signature_data text,
  signed_at      timestamptz NOT NULL DEFAULT now(),
  created_at     timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- INDEXES
-- ============================================================

-- Core
CREATE INDEX idx_profiles_organization_id              ON profiles(organization_id);
CREATE INDEX idx_workers_organization_id               ON workers(organization_id);
CREATE INDEX idx_workers_public_id                     ON workers(public_id);
CREATE INDEX idx_workers_profile_id                    ON workers(profile_id);
CREATE INDEX idx_workers_status                        ON workers(status);
CREATE INDEX idx_jobs_organization_id                  ON jobs(organization_id);
CREATE INDEX idx_jobs_superintendent_id                ON jobs(superintendent_id);
CREATE INDEX idx_jobs_status                           ON jobs(status);
CREATE INDEX idx_documents_organization_id             ON documents(organization_id);
CREATE INDEX idx_documents_related                     ON documents(related_table, related_id);
CREATE INDEX idx_audit_logs_organization_id            ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_actor_id                   ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_entity                     ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_reminders_organization_id             ON reminders(organization_id);
CREATE INDEX idx_reminders_worker_id                   ON reminders(worker_id);
CREATE INDEX idx_reminders_due_at                      ON reminders(due_at);
CREATE INDEX idx_reminders_status                      ON reminders(status);
CREATE INDEX idx_qr_scan_logs_organization_id          ON qr_scan_logs(organization_id);
CREATE INDEX idx_qr_scan_logs_worker_id                ON qr_scan_logs(worker_id);
CREATE INDEX idx_qr_scan_logs_equipment_id             ON qr_scan_logs(equipment_id);
CREATE INDEX idx_qr_scan_logs_public_id                ON qr_scan_logs(public_id);

-- Certifications
CREATE INDEX idx_certification_types_organization_id   ON certification_types(organization_id);
CREATE INDEX idx_worker_certifications_organization_id ON worker_certifications(organization_id);
CREATE INDEX idx_worker_certifications_worker_id       ON worker_certifications(worker_id);
CREATE INDEX idx_worker_certifications_type_id         ON worker_certifications(certification_type_id);
CREATE INDEX idx_worker_certifications_status          ON worker_certifications(status);
CREATE INDEX idx_worker_certifications_expiry_date     ON worker_certifications(expiry_date);
CREATE INDEX idx_job_required_certs_job_id             ON job_required_certifications(job_id);

-- Orientations
CREATE INDEX idx_orientation_modules_organization_id   ON orientation_modules(organization_id);
CREATE INDEX idx_orientation_modules_job_id            ON orientation_modules(job_id);
CREATE INDEX idx_orientation_sigs_module_id            ON orientation_signatures(orientation_module_id);
CREATE INDEX idx_orientation_sigs_worker_id            ON orientation_signatures(worker_id);
CREATE INDEX idx_orientation_sigs_job_id               ON orientation_signatures(job_id);

-- JHA
CREATE INDEX idx_jha_templates_organization_id         ON jha_templates(organization_id);
CREATE INDEX idx_jhas_organization_id                  ON jhas(organization_id);
CREATE INDEX idx_jhas_job_id                           ON jhas(job_id);
CREATE INDEX idx_jhas_status                           ON jhas(status);
CREATE INDEX idx_jha_steps_jha_id                      ON jha_steps(jha_id);
CREATE INDEX idx_jha_hazards_jha_id                    ON jha_hazards(jha_id);
CREATE INDEX idx_jha_hazards_step_id                   ON jha_hazards(step_id);
CREATE INDEX idx_jha_controls_hazard_id                ON jha_controls(hazard_id);
CREATE INDEX idx_jha_controls_jha_id                   ON jha_controls(jha_id);
CREATE INDEX idx_jha_attendees_jha_id                  ON jha_attendees(jha_id);
CREATE INDEX idx_jha_attendees_worker_id               ON jha_attendees(worker_id);
CREATE INDEX idx_jha_signatures_jha_id                 ON jha_signatures(jha_id);
CREATE INDEX idx_jha_signatures_worker_id              ON jha_signatures(worker_id);

-- Equipment
CREATE INDEX idx_equipment_types_category              ON equipment_types(category);
CREATE INDEX idx_equipment_organization_id             ON equipment(organization_id);
CREATE INDEX idx_equipment_public_id                   ON equipment(public_id);
CREATE INDEX idx_equipment_job_id                      ON equipment(job_id);
CREATE INDEX idx_equipment_type_id                     ON equipment(equipment_type_id);
CREATE INDEX idx_equipment_status                      ON equipment(status);
CREATE INDEX idx_insp_templates_organization_id        ON equipment_inspection_templates(organization_id);
CREATE INDEX idx_insp_templates_type_id                ON equipment_inspection_templates(equipment_type_id);
CREATE INDEX idx_insp_template_items_template_id       ON equipment_inspection_template_items(template_id);
CREATE INDEX idx_equipment_inspections_org_id          ON equipment_inspections(organization_id);
CREATE INDEX idx_equipment_inspections_equipment_id    ON equipment_inspections(equipment_id);
CREATE INDEX idx_equipment_inspections_job_id          ON equipment_inspections(job_id);
CREATE INDEX idx_equipment_inspections_inspector_id    ON equipment_inspections(inspector_id);
CREATE INDEX idx_equipment_insp_items_inspection_id    ON equipment_inspection_items(inspection_id);
CREATE INDEX idx_equipment_insp_photos_inspection_id   ON equipment_inspection_photos(inspection_id);
CREATE INDEX idx_equipment_insp_sigs_inspection_id     ON equipment_inspection_signatures(inspection_id);


-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

CREATE TRIGGER set_updated_at_organizations
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_workers
  BEFORE UPDATE ON workers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_jobs
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_certification_types
  BEFORE UPDATE ON certification_types
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_worker_certifications
  BEFORE UPDATE ON worker_certifications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_orientation_modules
  BEFORE UPDATE ON orientation_modules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_jha_templates
  BEFORE UPDATE ON jha_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_jhas
  BEFORE UPDATE ON jhas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_equipment
  BEFORE UPDATE ON equipment
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_equipment_inspection_templates
  BEFORE UPDATE ON equipment_inspection_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_equipment_inspections
  BEFORE UPDATE ON equipment_inspections
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- ROW LEVEL SECURITY (enable on all protected tables)
-- Policies are added separately per-module
-- ============================================================

ALTER TABLE organizations                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles                            ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers                             ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs                                ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents                           ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs                          ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders                           ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_scan_logs                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE certification_types                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_certifications               ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_required_certifications         ENABLE ROW LEVEL SECURITY;
ALTER TABLE orientation_modules                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE orientation_signatures              ENABLE ROW LEVEL SECURITY;
ALTER TABLE jha_templates                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE jha_template_fields                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE jhas                                ENABLE ROW LEVEL SECURITY;
ALTER TABLE jha_steps                           ENABLE ROW LEVEL SECURITY;
ALTER TABLE jha_hazards                         ENABLE ROW LEVEL SECURITY;
ALTER TABLE jha_controls                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE jha_required_ppe                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE jha_attendees                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE jha_signatures                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_types                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment                           ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_inspection_templates      ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_inspection_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_inspections               ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_inspection_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_inspection_photos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_inspection_signatures     ENABLE ROW LEVEL SECURITY;
