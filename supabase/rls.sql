-- ============================================================
-- CertTrack — Row Level Security Policies
-- Run in Supabase SQL Editor after schema.sql
-- Safe to re-run: drops all existing policies first
-- ============================================================


-- ============================================================
-- TEARDOWN: drop all existing policies on our tables
-- ============================================================

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'organizations','profiles','workers','jobs','documents',
        'audit_logs','reminders','qr_scan_logs',
        'certification_types','worker_certifications','job_required_certifications',
        'orientation_modules','orientation_signatures',
        'jha_templates','jha_template_fields','jhas','jha_steps',
        'jha_hazards','jha_controls','jha_required_ppe','jha_attendees','jha_signatures',
        'equipment_types','equipment',
        'equipment_inspection_templates','equipment_inspection_template_items',
        'equipment_inspections','equipment_inspection_items',
        'equipment_inspection_photos','equipment_inspection_signatures'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- Drop storage policies (safe to re-run)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname LIKE 'cert-documents:%'
         OR policyname LIKE 'jha-files:%'
         OR policyname LIKE 'inspection-photos:%'
         OR policyname LIKE 'worker-avatars:%'
         OR policyname LIKE 'documents:%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
  END LOOP;
END $$;


-- ============================================================
-- UPDATE ROLE CONSTRAINT
-- ============================================================

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('owner','admin','pm','superintendent','worker','subcontractor_admin','gc_read_only'));


-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Current user's organization_id
CREATE OR REPLACE FUNCTION get_my_org_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid()
$$;

-- Current user's role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$;

-- Current user's linked worker record id (null if no worker record)
CREATE OR REPLACE FUNCTION get_my_worker_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id FROM workers WHERE profile_id = auth.uid()
$$;

-- True for owner/admin/pm/superintendent/subcontractor_admin
CREATE OR REPLACE FUNCTION is_manager()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT get_my_role() IN ('owner','admin','pm','superintendent','subcontractor_admin')
$$;

-- True for owner/admin only
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT get_my_role() IN ('owner','admin')
$$;


-- ============================================================
-- ORGANIZATIONS
-- ============================================================

-- All org members can view their own org
CREATE POLICY "organizations: members can select"
  ON organizations FOR SELECT TO authenticated
  USING (id = get_my_org_id());

-- Only owner/admin can update
CREATE POLICY "organizations: admin can update"
  ON organizations FOR UPDATE TO authenticated
  USING    (id = get_my_org_id() AND is_admin())
  WITH CHECK (id = get_my_org_id() AND is_admin());

-- No INSERT or DELETE via client (handled server-side with service role)


-- ============================================================
-- PROFILES
-- ============================================================

-- All org members can see all profiles in their org
CREATE POLICY "profiles: org members can select"
  ON profiles FOR SELECT TO authenticated
  USING (organization_id = get_my_org_id());

-- Users can update their own; admin can update anyone in their org
CREATE POLICY "profiles: users can update own, admin can update all"
  ON profiles FOR UPDATE TO authenticated
  USING (
    id = auth.uid() OR
    (organization_id = get_my_org_id() AND is_admin())
  )
  WITH CHECK (
    id = auth.uid() OR
    (organization_id = get_my_org_id() AND is_admin())
  );

-- Admin can delete profiles (cannot delete own)
CREATE POLICY "profiles: admin can delete"
  ON profiles FOR DELETE TO authenticated
  USING (
    organization_id = get_my_org_id() AND
    is_admin() AND
    id <> auth.uid()
  );

-- Profiles are created by the auth trigger (service role) — no INSERT policy needed


-- ============================================================
-- WORKERS
-- ============================================================

-- All org roles can view workers (gc_read_only needs this for compliance)
CREATE POLICY "workers: org members can select"
  ON workers FOR SELECT TO authenticated
  USING (organization_id = get_my_org_id());

-- Managers can create worker records
CREATE POLICY "workers: managers can insert"
  ON workers FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_my_org_id() AND is_manager()
  );

-- Managers can update any worker; a worker can update their own record
CREATE POLICY "workers: managers can update, worker can update own"
  ON workers FOR UPDATE TO authenticated
  USING (
    organization_id = get_my_org_id() AND (
      is_manager() OR profile_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id = get_my_org_id() AND (
      is_manager() OR profile_id = auth.uid()
    )
  );

-- Only admin can delete workers
CREATE POLICY "workers: admin can delete"
  ON workers FOR DELETE TO authenticated
  USING (organization_id = get_my_org_id() AND is_admin());


-- ============================================================
-- JOBS
-- ============================================================

-- All org roles can view jobs
CREATE POLICY "jobs: org members can select"
  ON jobs FOR SELECT TO authenticated
  USING (organization_id = get_my_org_id());

CREATE POLICY "jobs: managers can insert"
  ON jobs FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_my_org_id() AND is_manager());

CREATE POLICY "jobs: managers can update"
  ON jobs FOR UPDATE TO authenticated
  USING    (organization_id = get_my_org_id() AND is_manager())
  WITH CHECK (organization_id = get_my_org_id() AND is_manager());

CREATE POLICY "jobs: admin can delete"
  ON jobs FOR DELETE TO authenticated
  USING (organization_id = get_my_org_id() AND is_admin());


-- ============================================================
-- DOCUMENTS
-- ============================================================

-- Managers see all docs; workers see docs linked to their own worker id
-- gc_read_only cannot view internal documents
CREATE POLICY "documents: managers can select, worker sees own"
  ON documents FOR SELECT TO authenticated
  USING (
    organization_id = get_my_org_id() AND (
      is_manager() OR related_id = get_my_worker_id()
    )
  );

-- Managers can upload docs; workers can upload for themselves
CREATE POLICY "documents: managers can insert, worker for self"
  ON documents FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_my_org_id() AND (
      is_manager() OR related_id = get_my_worker_id()
    )
  );

CREATE POLICY "documents: managers can update"
  ON documents FOR UPDATE TO authenticated
  USING    (organization_id = get_my_org_id() AND is_manager())
  WITH CHECK (organization_id = get_my_org_id() AND is_manager());

CREATE POLICY "documents: admin can delete"
  ON documents FOR DELETE TO authenticated
  USING (organization_id = get_my_org_id() AND is_admin());


-- ============================================================
-- AUDIT LOGS
-- ============================================================

-- Only admin/owner can view audit logs
CREATE POLICY "audit_logs: admin can select"
  ON audit_logs FOR SELECT TO authenticated
  USING (organization_id = get_my_org_id() AND is_admin());

-- Writes are server-side only via service role — no client INSERT policy


-- ============================================================
-- REMINDERS
-- ============================================================

-- Managers see all; worker sees reminders linked to themselves
CREATE POLICY "reminders: managers can select, worker sees own"
  ON reminders FOR SELECT TO authenticated
  USING (
    organization_id = get_my_org_id() AND (
      is_manager() OR worker_id = get_my_worker_id()
    )
  );

CREATE POLICY "reminders: managers can insert"
  ON reminders FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_my_org_id() AND is_manager());

CREATE POLICY "reminders: managers can update"
  ON reminders FOR UPDATE TO authenticated
  USING    (organization_id = get_my_org_id() AND is_manager())
  WITH CHECK (organization_id = get_my_org_id() AND is_manager());

CREATE POLICY "reminders: managers can delete"
  ON reminders FOR DELETE TO authenticated
  USING (organization_id = get_my_org_id() AND is_manager());


-- ============================================================
-- QR SCAN LOGS
-- ============================================================

-- Only admin can view scan logs
CREATE POLICY "qr_scan_logs: admin can select"
  ON qr_scan_logs FOR SELECT TO authenticated
  USING (organization_id = get_my_org_id() AND is_admin());

-- Inserts are done server-side via service role when a QR is scanned
-- No client INSERT policy needed


-- ============================================================
-- CERTIFICATION TYPES
-- ============================================================

-- All org roles can view cert types
CREATE POLICY "certification_types: org members can select"
  ON certification_types FOR SELECT TO authenticated
  USING (organization_id = get_my_org_id());

CREATE POLICY "certification_types: managers can insert"
  ON certification_types FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_my_org_id() AND is_manager());

CREATE POLICY "certification_types: managers can update"
  ON certification_types FOR UPDATE TO authenticated
  USING    (organization_id = get_my_org_id() AND is_manager())
  WITH CHECK (organization_id = get_my_org_id() AND is_manager());

CREATE POLICY "certification_types: admin can delete"
  ON certification_types FOR DELETE TO authenticated
  USING (organization_id = get_my_org_id() AND is_admin());


-- ============================================================
-- WORKER CERTIFICATIONS
-- ============================================================

-- Managers + gc_read_only see all in org; worker sees their own
CREATE POLICY "worker_certifications: managers and gc can select, worker sees own"
  ON worker_certifications FOR SELECT TO authenticated
  USING (
    organization_id = get_my_org_id() AND (
      is_manager() OR
      get_my_role() = 'gc_read_only' OR
      worker_id = get_my_worker_id()
    )
  );

-- Managers can add any cert; worker can self-submit (status locked to 'pending')
CREATE POLICY "worker_certifications: managers can insert, worker self-submits"
  ON worker_certifications FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_my_org_id() AND (
      is_manager() OR
      (worker_id = get_my_worker_id() AND status = 'pending')
    )
  );

-- Managers can approve/reject; worker can only edit their own while still pending
CREATE POLICY "worker_certifications: managers can update, worker edits own pending"
  ON worker_certifications FOR UPDATE TO authenticated
  USING (
    organization_id = get_my_org_id() AND (
      is_manager() OR
      (worker_id = get_my_worker_id() AND status = 'pending')
    )
  )
  WITH CHECK (
    organization_id = get_my_org_id() AND (
      is_manager() OR
      (worker_id = get_my_worker_id() AND status = 'pending')
    )
  );

CREATE POLICY "worker_certifications: admin can delete"
  ON worker_certifications FOR DELETE TO authenticated
  USING (organization_id = get_my_org_id() AND is_admin());


-- ============================================================
-- JOB REQUIRED CERTIFICATIONS
-- ============================================================

CREATE POLICY "job_required_certifications: org members can select"
  ON job_required_certifications FOR SELECT TO authenticated
  USING (organization_id = get_my_org_id());

CREATE POLICY "job_required_certifications: managers can insert"
  ON job_required_certifications FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_my_org_id() AND is_manager());

CREATE POLICY "job_required_certifications: managers can update"
  ON job_required_certifications FOR UPDATE TO authenticated
  USING    (organization_id = get_my_org_id() AND is_manager())
  WITH CHECK (organization_id = get_my_org_id() AND is_manager());

CREATE POLICY "job_required_certifications: managers can delete"
  ON job_required_certifications FOR DELETE TO authenticated
  USING (organization_id = get_my_org_id() AND is_manager());


-- ============================================================
-- ORIENTATION MODULES
-- ============================================================

-- All roles can view modules (workers must read them to sign)
CREATE POLICY "orientation_modules: org members can select"
  ON orientation_modules FOR SELECT TO authenticated
  USING (organization_id = get_my_org_id());

CREATE POLICY "orientation_modules: managers can insert"
  ON orientation_modules FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_my_org_id() AND is_manager());

CREATE POLICY "orientation_modules: managers can update"
  ON orientation_modules FOR UPDATE TO authenticated
  USING    (organization_id = get_my_org_id() AND is_manager())
  WITH CHECK (organization_id = get_my_org_id() AND is_manager());

CREATE POLICY "orientation_modules: admin can delete"
  ON orientation_modules FOR DELETE TO authenticated
  USING (organization_id = get_my_org_id() AND is_admin());


-- ============================================================
-- ORIENTATION SIGNATURES
-- ============================================================

-- Managers see all; worker sees their own signatures
CREATE POLICY "orientation_signatures: managers can select, worker sees own"
  ON orientation_signatures FOR SELECT TO authenticated
  USING (
    organization_id = get_my_org_id() AND (
      is_manager() OR worker_id = get_my_worker_id()
    )
  );

-- Managers can record; worker can sign their own
CREATE POLICY "orientation_signatures: managers can insert, worker signs own"
  ON orientation_signatures FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_my_org_id() AND (
      is_manager() OR worker_id = get_my_worker_id()
    )
  );

-- Signatures are immutable — no UPDATE policy

-- Admin can delete for data correction only
CREATE POLICY "orientation_signatures: admin can delete"
  ON orientation_signatures FOR DELETE TO authenticated
  USING (organization_id = get_my_org_id() AND is_admin());


-- ============================================================
-- JHA TEMPLATES
-- ============================================================

CREATE POLICY "jha_templates: org members can select"
  ON jha_templates FOR SELECT TO authenticated
  USING (organization_id = get_my_org_id());

CREATE POLICY "jha_templates: managers can insert"
  ON jha_templates FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_my_org_id() AND is_manager());

CREATE POLICY "jha_templates: managers can update"
  ON jha_templates FOR UPDATE TO authenticated
  USING    (organization_id = get_my_org_id() AND is_manager())
  WITH CHECK (organization_id = get_my_org_id() AND is_manager());

CREATE POLICY "jha_templates: admin can delete"
  ON jha_templates FOR DELETE TO authenticated
  USING (organization_id = get_my_org_id() AND is_admin());


-- ============================================================
-- JHA TEMPLATE FIELDS (scoped via template → org)
-- ============================================================

CREATE POLICY "jha_template_fields: org members can select"
  ON jha_template_fields FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jha_templates t
      WHERE t.id = jha_template_fields.template_id
        AND t.organization_id = get_my_org_id()
    )
  );

CREATE POLICY "jha_template_fields: managers can insert"
  ON jha_template_fields FOR INSERT TO authenticated
  WITH CHECK (
    is_manager() AND EXISTS (
      SELECT 1 FROM jha_templates t
      WHERE t.id = jha_template_fields.template_id
        AND t.organization_id = get_my_org_id()
    )
  );

CREATE POLICY "jha_template_fields: managers can update"
  ON jha_template_fields FOR UPDATE TO authenticated
  USING (
    is_manager() AND EXISTS (
      SELECT 1 FROM jha_templates t
      WHERE t.id = jha_template_fields.template_id
        AND t.organization_id = get_my_org_id()
    )
  )
  WITH CHECK (
    is_manager() AND EXISTS (
      SELECT 1 FROM jha_templates t
      WHERE t.id = jha_template_fields.template_id
        AND t.organization_id = get_my_org_id()
    )
  );

CREATE POLICY "jha_template_fields: admin can delete"
  ON jha_template_fields FOR DELETE TO authenticated
  USING (
    is_admin() AND EXISTS (
      SELECT 1 FROM jha_templates t
      WHERE t.id = jha_template_fields.template_id
        AND t.organization_id = get_my_org_id()
    )
  );


-- ============================================================
-- JHAS
-- ============================================================

-- All roles can view JHAs (workers need to see them to sign)
CREATE POLICY "jhas: org members can select"
  ON jhas FOR SELECT TO authenticated
  USING (organization_id = get_my_org_id());

CREATE POLICY "jhas: managers can insert"
  ON jhas FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_my_org_id() AND is_manager());

CREATE POLICY "jhas: managers can update"
  ON jhas FOR UPDATE TO authenticated
  USING    (organization_id = get_my_org_id() AND is_manager())
  WITH CHECK (organization_id = get_my_org_id() AND is_manager());

CREATE POLICY "jhas: admin can delete"
  ON jhas FOR DELETE TO authenticated
  USING (organization_id = get_my_org_id() AND is_admin());


-- ============================================================
-- JHA STEPS (scoped via jha → org)
-- ============================================================

CREATE POLICY "jha_steps: org members can select"
  ON jha_steps FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jhas j
      WHERE j.id = jha_steps.jha_id AND j.organization_id = get_my_org_id()
    )
  );

CREATE POLICY "jha_steps: managers can insert"
  ON jha_steps FOR INSERT TO authenticated
  WITH CHECK (
    is_manager() AND EXISTS (
      SELECT 1 FROM jhas j
      WHERE j.id = jha_steps.jha_id AND j.organization_id = get_my_org_id()
    )
  );

CREATE POLICY "jha_steps: managers can update"
  ON jha_steps FOR UPDATE TO authenticated
  USING (
    is_manager() AND EXISTS (
      SELECT 1 FROM jhas j
      WHERE j.id = jha_steps.jha_id AND j.organization_id = get_my_org_id()
    )
  )
  WITH CHECK (
    is_manager() AND EXISTS (
      SELECT 1 FROM jhas j
      WHERE j.id = jha_steps.jha_id AND j.organization_id = get_my_org_id()
    )
  );

CREATE POLICY "jha_steps: managers can delete"
  ON jha_steps FOR DELETE TO authenticated
  USING (
    is_manager() AND EXISTS (
      SELECT 1 FROM jhas j
      WHERE j.id = jha_steps.jha_id AND j.organization_id = get_my_org_id()
    )
  );


-- ============================================================
-- JHA HAZARDS (scoped via jha → org)
-- ============================================================

CREATE POLICY "jha_hazards: org members can select"
  ON jha_hazards FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jhas j
      WHERE j.id = jha_hazards.jha_id AND j.organization_id = get_my_org_id()
    )
  );

CREATE POLICY "jha_hazards: managers can insert"
  ON jha_hazards FOR INSERT TO authenticated
  WITH CHECK (
    is_manager() AND EXISTS (
      SELECT 1 FROM jhas j
      WHERE j.id = jha_hazards.jha_id AND j.organization_id = get_my_org_id()
    )
  );

CREATE POLICY "jha_hazards: managers can update"
  ON jha_hazards FOR UPDATE TO authenticated
  USING (
    is_manager() AND EXISTS (
      SELECT 1 FROM jhas j
      WHERE j.id = jha_hazards.jha_id AND j.organization_id = get_my_org_id()
    )
  )
  WITH CHECK (
    is_manager() AND EXISTS (
      SELECT 1 FROM jhas j
      WHERE j.id = jha_hazards.jha_id AND j.organization_id = get_my_org_id()
    )
  );

CREATE POLICY "jha_hazards: managers can delete"
  ON jha_hazards FOR DELETE TO authenticated
  USING (
    is_manager() AND EXISTS (
      SELECT 1 FROM jhas j
      WHERE j.id = jha_hazards.jha_id AND j.organization_id = get_my_org_id()
    )
  );


-- ============================================================
-- JHA CONTROLS (scoped via hazard → jha → org)
-- ============================================================

CREATE POLICY "jha_controls: org members can select"
  ON jha_controls FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jha_hazards h
      JOIN jhas j ON j.id = h.jha_id
      WHERE h.id = jha_controls.hazard_id
        AND j.organization_id = get_my_org_id()
    )
  );

CREATE POLICY "jha_controls: managers can insert"
  ON jha_controls FOR INSERT TO authenticated
  WITH CHECK (
    is_manager() AND EXISTS (
      SELECT 1 FROM jha_hazards h
      JOIN jhas j ON j.id = h.jha_id
      WHERE h.id = jha_controls.hazard_id
        AND j.organization_id = get_my_org_id()
    )
  );

CREATE POLICY "jha_controls: managers can update"
  ON jha_controls FOR UPDATE TO authenticated
  USING (
    is_manager() AND EXISTS (
      SELECT 1 FROM jha_hazards h
      JOIN jhas j ON j.id = h.jha_id
      WHERE h.id = jha_controls.hazard_id
        AND j.organization_id = get_my_org_id()
    )
  )
  WITH CHECK (
    is_manager() AND EXISTS (
      SELECT 1 FROM jha_hazards h
      JOIN jhas j ON j.id = h.jha_id
      WHERE h.id = jha_controls.hazard_id
        AND j.organization_id = get_my_org_id()
    )
  );

CREATE POLICY "jha_controls: managers can delete"
  ON jha_controls FOR DELETE TO authenticated
  USING (
    is_manager() AND EXISTS (
      SELECT 1 FROM jha_hazards h
      JOIN jhas j ON j.id = h.jha_id
      WHERE h.id = jha_controls.hazard_id
        AND j.organization_id = get_my_org_id()
    )
  );


-- ============================================================
-- JHA REQUIRED PPE (scoped via jha → org)
-- ============================================================

CREATE POLICY "jha_required_ppe: org members can select"
  ON jha_required_ppe FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jhas j
      WHERE j.id = jha_required_ppe.jha_id AND j.organization_id = get_my_org_id()
    )
  );

CREATE POLICY "jha_required_ppe: managers can insert"
  ON jha_required_ppe FOR INSERT TO authenticated
  WITH CHECK (
    is_manager() AND EXISTS (
      SELECT 1 FROM jhas j
      WHERE j.id = jha_required_ppe.jha_id AND j.organization_id = get_my_org_id()
    )
  );

CREATE POLICY "jha_required_ppe: managers can update"
  ON jha_required_ppe FOR UPDATE TO authenticated
  USING (
    is_manager() AND EXISTS (
      SELECT 1 FROM jhas j
      WHERE j.id = jha_required_ppe.jha_id AND j.organization_id = get_my_org_id()
    )
  )
  WITH CHECK (
    is_manager() AND EXISTS (
      SELECT 1 FROM jhas j
      WHERE j.id = jha_required_ppe.jha_id AND j.organization_id = get_my_org_id()
    )
  );

CREATE POLICY "jha_required_ppe: managers can delete"
  ON jha_required_ppe FOR DELETE TO authenticated
  USING (
    is_manager() AND EXISTS (
      SELECT 1 FROM jhas j
      WHERE j.id = jha_required_ppe.jha_id AND j.organization_id = get_my_org_id()
    )
  );


-- ============================================================
-- JHA ATTENDEES (scoped via jha → org)
-- ============================================================

-- Managers see all; worker sees JHAs they are listed on
CREATE POLICY "jha_attendees: managers can select, worker sees own"
  ON jha_attendees FOR SELECT TO authenticated
  USING (
    (is_manager() OR worker_id = get_my_worker_id()) AND
    EXISTS (
      SELECT 1 FROM jhas j
      WHERE j.id = jha_attendees.jha_id AND j.organization_id = get_my_org_id()
    )
  );

-- Managers can add attendees; workers can add themselves
CREATE POLICY "jha_attendees: managers can insert, worker adds self"
  ON jha_attendees FOR INSERT TO authenticated
  WITH CHECK (
    (is_manager() OR worker_id = get_my_worker_id()) AND
    EXISTS (
      SELECT 1 FROM jhas j
      WHERE j.id = jha_attendees.jha_id AND j.organization_id = get_my_org_id()
    )
  );

CREATE POLICY "jha_attendees: managers can delete"
  ON jha_attendees FOR DELETE TO authenticated
  USING (
    is_manager() AND EXISTS (
      SELECT 1 FROM jhas j
      WHERE j.id = jha_attendees.jha_id AND j.organization_id = get_my_org_id()
    )
  );


-- ============================================================
-- JHA SIGNATURES
-- ============================================================

-- Managers see all; worker sees their own signatures
CREATE POLICY "jha_signatures: managers can select, worker sees own"
  ON jha_signatures FOR SELECT TO authenticated
  USING (
    organization_id = get_my_org_id() AND (
      is_manager() OR worker_id = get_my_worker_id()
    )
  );

-- Managers can record; worker can sign their own
CREATE POLICY "jha_signatures: managers can insert, worker signs own"
  ON jha_signatures FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_my_org_id() AND (
      is_manager() OR worker_id = get_my_worker_id()
    )
  );

-- Signatures are immutable — no UPDATE policy

CREATE POLICY "jha_signatures: admin can delete"
  ON jha_signatures FOR DELETE TO authenticated
  USING (organization_id = get_my_org_id() AND is_admin());


-- ============================================================
-- EQUIPMENT TYPES (global lookup table — no org scope)
-- ============================================================

CREATE POLICY "equipment_types: authenticated can select"
  ON equipment_types FOR SELECT TO authenticated
  USING (true);


-- ============================================================
-- EQUIPMENT
-- ============================================================

-- All org roles can view equipment (gc_read_only for compliance)
CREATE POLICY "equipment: org members can select"
  ON equipment FOR SELECT TO authenticated
  USING (organization_id = get_my_org_id());

CREATE POLICY "equipment: managers can insert"
  ON equipment FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_my_org_id() AND is_manager());

CREATE POLICY "equipment: managers can update"
  ON equipment FOR UPDATE TO authenticated
  USING    (organization_id = get_my_org_id() AND is_manager())
  WITH CHECK (organization_id = get_my_org_id() AND is_manager());

CREATE POLICY "equipment: admin can delete"
  ON equipment FOR DELETE TO authenticated
  USING (organization_id = get_my_org_id() AND is_admin());


-- ============================================================
-- EQUIPMENT INSPECTION TEMPLATES
-- ============================================================

CREATE POLICY "equipment_inspection_templates: org members can select"
  ON equipment_inspection_templates FOR SELECT TO authenticated
  USING (organization_id = get_my_org_id());

CREATE POLICY "equipment_inspection_templates: managers can insert"
  ON equipment_inspection_templates FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_my_org_id() AND is_manager());

CREATE POLICY "equipment_inspection_templates: managers can update"
  ON equipment_inspection_templates FOR UPDATE TO authenticated
  USING    (organization_id = get_my_org_id() AND is_manager())
  WITH CHECK (organization_id = get_my_org_id() AND is_manager());

CREATE POLICY "equipment_inspection_templates: admin can delete"
  ON equipment_inspection_templates FOR DELETE TO authenticated
  USING (organization_id = get_my_org_id() AND is_admin());


-- ============================================================
-- EQUIPMENT INSPECTION TEMPLATE ITEMS (scoped via template → org)
-- ============================================================

CREATE POLICY "equipment_inspection_template_items: org members can select"
  ON equipment_inspection_template_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM equipment_inspection_templates t
      WHERE t.id = equipment_inspection_template_items.template_id
        AND t.organization_id = get_my_org_id()
    )
  );

CREATE POLICY "equipment_inspection_template_items: managers can insert"
  ON equipment_inspection_template_items FOR INSERT TO authenticated
  WITH CHECK (
    is_manager() AND EXISTS (
      SELECT 1 FROM equipment_inspection_templates t
      WHERE t.id = equipment_inspection_template_items.template_id
        AND t.organization_id = get_my_org_id()
    )
  );

CREATE POLICY "equipment_inspection_template_items: managers can update"
  ON equipment_inspection_template_items FOR UPDATE TO authenticated
  USING (
    is_manager() AND EXISTS (
      SELECT 1 FROM equipment_inspection_templates t
      WHERE t.id = equipment_inspection_template_items.template_id
        AND t.organization_id = get_my_org_id()
    )
  )
  WITH CHECK (
    is_manager() AND EXISTS (
      SELECT 1 FROM equipment_inspection_templates t
      WHERE t.id = equipment_inspection_template_items.template_id
        AND t.organization_id = get_my_org_id()
    )
  );

CREATE POLICY "equipment_inspection_template_items: admin can delete"
  ON equipment_inspection_template_items FOR DELETE TO authenticated
  USING (
    is_admin() AND EXISTS (
      SELECT 1 FROM equipment_inspection_templates t
      WHERE t.id = equipment_inspection_template_items.template_id
        AND t.organization_id = get_my_org_id()
    )
  );


-- ============================================================
-- EQUIPMENT INSPECTIONS
-- ============================================================

-- All org roles can view inspections (gc_read_only for compliance)
CREATE POLICY "equipment_inspections: org members can select"
  ON equipment_inspections FOR SELECT TO authenticated
  USING (organization_id = get_my_org_id());

-- Managers and field workers can submit inspections
CREATE POLICY "equipment_inspections: managers and workers can insert"
  ON equipment_inspections FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_my_org_id() AND
    get_my_role() IN ('owner','admin','pm','superintendent','subcontractor_admin','worker')
  );

CREATE POLICY "equipment_inspections: managers can update"
  ON equipment_inspections FOR UPDATE TO authenticated
  USING    (organization_id = get_my_org_id() AND is_manager())
  WITH CHECK (organization_id = get_my_org_id() AND is_manager());

CREATE POLICY "equipment_inspections: admin can delete"
  ON equipment_inspections FOR DELETE TO authenticated
  USING (organization_id = get_my_org_id() AND is_admin());


-- ============================================================
-- EQUIPMENT INSPECTION ITEMS (scoped via inspection → org)
-- ============================================================

CREATE POLICY "equipment_inspection_items: org members can select"
  ON equipment_inspection_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM equipment_inspections ei
      WHERE ei.id = equipment_inspection_items.inspection_id
        AND ei.organization_id = get_my_org_id()
    )
  );

CREATE POLICY "equipment_inspection_items: managers and workers can insert"
  ON equipment_inspection_items FOR INSERT TO authenticated
  WITH CHECK (
    get_my_role() IN ('owner','admin','pm','superintendent','subcontractor_admin','worker') AND
    EXISTS (
      SELECT 1 FROM equipment_inspections ei
      WHERE ei.id = equipment_inspection_items.inspection_id
        AND ei.organization_id = get_my_org_id()
    )
  );

CREATE POLICY "equipment_inspection_items: managers can update"
  ON equipment_inspection_items FOR UPDATE TO authenticated
  USING (
    is_manager() AND EXISTS (
      SELECT 1 FROM equipment_inspections ei
      WHERE ei.id = equipment_inspection_items.inspection_id
        AND ei.organization_id = get_my_org_id()
    )
  )
  WITH CHECK (
    is_manager() AND EXISTS (
      SELECT 1 FROM equipment_inspections ei
      WHERE ei.id = equipment_inspection_items.inspection_id
        AND ei.organization_id = get_my_org_id()
    )
  );

CREATE POLICY "equipment_inspection_items: admin can delete"
  ON equipment_inspection_items FOR DELETE TO authenticated
  USING (
    is_admin() AND EXISTS (
      SELECT 1 FROM equipment_inspections ei
      WHERE ei.id = equipment_inspection_items.inspection_id
        AND ei.organization_id = get_my_org_id()
    )
  );


-- ============================================================
-- EQUIPMENT INSPECTION PHOTOS (scoped via inspection → org)
-- ============================================================

CREATE POLICY "equipment_inspection_photos: org members can select"
  ON equipment_inspection_photos FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM equipment_inspections ei
      WHERE ei.id = equipment_inspection_photos.inspection_id
        AND ei.organization_id = get_my_org_id()
    )
  );

CREATE POLICY "equipment_inspection_photos: managers and workers can insert"
  ON equipment_inspection_photos FOR INSERT TO authenticated
  WITH CHECK (
    get_my_role() IN ('owner','admin','pm','superintendent','subcontractor_admin','worker') AND
    EXISTS (
      SELECT 1 FROM equipment_inspections ei
      WHERE ei.id = equipment_inspection_photos.inspection_id
        AND ei.organization_id = get_my_org_id()
    )
  );

CREATE POLICY "equipment_inspection_photos: admin can delete"
  ON equipment_inspection_photos FOR DELETE TO authenticated
  USING (
    is_admin() AND EXISTS (
      SELECT 1 FROM equipment_inspections ei
      WHERE ei.id = equipment_inspection_photos.inspection_id
        AND ei.organization_id = get_my_org_id()
    )
  );


-- ============================================================
-- EQUIPMENT INSPECTION SIGNATURES (scoped via inspection → org)
-- ============================================================

-- Managers see all; worker/profile sees their own
CREATE POLICY "equipment_inspection_signatures: managers can select, signer sees own"
  ON equipment_inspection_signatures FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM equipment_inspections ei
      WHERE ei.id = equipment_inspection_signatures.inspection_id
        AND ei.organization_id = get_my_org_id()
    ) AND (
      is_manager() OR
      worker_id = get_my_worker_id() OR
      profile_id = auth.uid()
    )
  );

-- Managers can record; worker/profile can sign their own
CREATE POLICY "equipment_inspection_signatures: managers and signers can insert"
  ON equipment_inspection_signatures FOR INSERT TO authenticated
  WITH CHECK (
    (is_manager() OR worker_id = get_my_worker_id() OR profile_id = auth.uid()) AND
    EXISTS (
      SELECT 1 FROM equipment_inspections ei
      WHERE ei.id = equipment_inspection_signatures.inspection_id
        AND ei.organization_id = get_my_org_id()
    )
  );

-- Signatures are immutable — no UPDATE policy

CREATE POLICY "equipment_inspection_signatures: admin can delete"
  ON equipment_inspection_signatures FOR DELETE TO authenticated
  USING (
    is_admin() AND EXISTS (
      SELECT 1 FROM equipment_inspections ei
      WHERE ei.id = equipment_inspection_signatures.inspection_id
        AND ei.organization_id = get_my_org_id()
    )
  );


-- ============================================================
-- STORAGE BUCKET POLICIES
-- ============================================================
-- Before running these, create the following private buckets in
-- Supabase Dashboard → Storage → New Bucket:
--
--   cert-documents    (private)  — certification upload files
--   jha-files         (private)  — JHA attachments
--   inspection-photos (private)  — equipment inspection photos
--   worker-avatars    (public)   — worker profile photos
--   documents         (private)  — general org documents
--
-- Storage path convention for all private buckets:
--   {organization_id}/{entity_id}/{filename}
-- ============================================================

-- ---- cert-documents ----------------------------------------

CREATE POLICY "cert-documents: org members can upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'cert-documents' AND
    (storage.foldername(name))[1] = get_my_org_id()::text
  );

-- Managers see all in org; worker can only access their own folder
CREATE POLICY "cert-documents: managers can view, worker sees own folder"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'cert-documents' AND
    (storage.foldername(name))[1] = get_my_org_id()::text AND (
      is_manager() OR
      (storage.foldername(name))[2] = get_my_worker_id()::text
    )
  );

CREATE POLICY "cert-documents: admin can delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'cert-documents' AND
    (storage.foldername(name))[1] = get_my_org_id()::text AND
    is_admin()
  );

-- ---- jha-files ---------------------------------------------

CREATE POLICY "jha-files: managers can upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'jha-files' AND
    (storage.foldername(name))[1] = get_my_org_id()::text AND
    is_manager()
  );

-- All org members can view JHA files (workers need them to review before signing)
CREATE POLICY "jha-files: org members can view"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'jha-files' AND
    (storage.foldername(name))[1] = get_my_org_id()::text
  );

CREATE POLICY "jha-files: admin can delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'jha-files' AND
    (storage.foldername(name))[1] = get_my_org_id()::text AND
    is_admin()
  );

-- ---- inspection-photos -------------------------------------

CREATE POLICY "inspection-photos: managers and workers can upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'inspection-photos' AND
    (storage.foldername(name))[1] = get_my_org_id()::text AND
    get_my_role() IN ('owner','admin','pm','superintendent','subcontractor_admin','worker')
  );

CREATE POLICY "inspection-photos: org members can view"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'inspection-photos' AND
    (storage.foldername(name))[1] = get_my_org_id()::text
  );

CREATE POLICY "inspection-photos: admin can delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'inspection-photos' AND
    (storage.foldername(name))[1] = get_my_org_id()::text AND
    is_admin()
  );

-- ---- worker-avatars (public bucket) ------------------------

CREATE POLICY "worker-avatars: org members can upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'worker-avatars' AND
    (storage.foldername(name))[1] = get_my_org_id()::text
  );

-- Public bucket — anyone can view (used on public QR pages)
CREATE POLICY "worker-avatars: public can view"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'worker-avatars');

CREATE POLICY "worker-avatars: managers can delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'worker-avatars' AND
    (storage.foldername(name))[1] = get_my_org_id()::text AND
    is_manager()
  );

-- ---- documents (private general) ---------------------------

CREATE POLICY "documents: managers can upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = get_my_org_id()::text AND
    is_manager()
  );

CREATE POLICY "documents: managers can view"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = get_my_org_id()::text AND
    is_manager()
  );

CREATE POLICY "documents: admin can delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = get_my_org_id()::text AND
    is_admin()
  );
