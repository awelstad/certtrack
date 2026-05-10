-- Fortune Electrical — mock seed data
-- Run AFTER creating the Fortune Electrical org via the super-admin panel.
-- This script finds the org by slug and inserts workers, a job, cert types, and sample certs.

DO $$
DECLARE
  v_org_id      uuid;
  v_job_id      uuid;
  v_ct_osha     uuid;
  v_ct_elec     uuid;
  v_ct_fork     uuid;
  v_ct_fa       uuid;
  v_w_mike      uuid;
  v_w_sarah     uuid;
  v_w_james     uuid;
BEGIN

  -- Find the org
  SELECT id INTO v_org_id FROM organizations WHERE slug = 'fortune-electrical';
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Organization with slug "fortune-electrical" not found. Create it first via the super-admin panel.';
  END IF;

  -- ── Certification Types ──────────────────────────────────────
  INSERT INTO certification_types (organization_id, name, description, validity_days, requires_document)
  VALUES
    (v_org_id, 'OSHA 10-Hour Construction',       'OSHA 10-hour safety training card',         NULL, true),
    (v_org_id, 'Electrical License — Journeyman', 'State journeyman electrician license',       365,  true),
    (v_org_id, 'Forklift Operator',               'Powered industrial truck operator cert',     1095, true),
    (v_org_id, 'First Aid / CPR',                 'First aid and CPR certification',            730,  true);

  SELECT id INTO v_ct_osha  FROM certification_types WHERE organization_id = v_org_id AND name = 'OSHA 10-Hour Construction';
  SELECT id INTO v_ct_elec  FROM certification_types WHERE organization_id = v_org_id AND name = 'Electrical License — Journeyman';
  SELECT id INTO v_ct_fork  FROM certification_types WHERE organization_id = v_org_id AND name = 'Forklift Operator';
  SELECT id INTO v_ct_fa    FROM certification_types WHERE organization_id = v_org_id AND name = 'First Aid / CPR';

  -- ── Job Site ─────────────────────────────────────────────────
  INSERT INTO jobs (organization_id, name, address, city, state, status, start_date)
  VALUES (v_org_id, 'Downtown Office Renovation', '400 Main St', 'Dallas', 'TX', 'active', CURRENT_DATE - 30)
  RETURNING id INTO v_job_id;

  -- ── Workers ──────────────────────────────────────────────────
  INSERT INTO workers (organization_id, first_name, last_name, trade, employer, phone, status)
  VALUES (v_org_id, 'Mike', 'Torres', 'Journeyman Electrician', 'Fortune Electrical', '214-555-0101', 'active')
  RETURNING id INTO v_w_mike;

  INSERT INTO workers (organization_id, first_name, last_name, trade, employer, phone, status)
  VALUES (v_org_id, 'Sarah', 'Chen', 'Apprentice Electrician', 'Fortune Electrical', '214-555-0102', 'active')
  RETURNING id INTO v_w_sarah;

  INSERT INTO workers (organization_id, first_name, last_name, trade, employer, phone, status)
  VALUES (v_org_id, 'James', 'Wilson', 'Foreman', 'Fortune Electrical', '214-555-0103', 'active')
  RETURNING id INTO v_w_james;

  -- ── Assign workers to job ─────────────────────────────────────
  INSERT INTO job_workers (job_id, worker_id) VALUES
    (v_job_id, v_w_mike),
    (v_job_id, v_w_sarah),
    (v_job_id, v_w_james);

  -- ── Job cert requirements ─────────────────────────────────────
  INSERT INTO job_required_certifications (organization_id, job_id, certification_type_id) VALUES
    (v_org_id, v_job_id, v_ct_osha),
    (v_org_id, v_job_id, v_ct_elec);

  -- ── Worker Certifications ─────────────────────────────────────

  -- Mike Torres: OSHA approved, Electrical License approved, Forklift EXPIRED
  INSERT INTO worker_certifications (organization_id, worker_id, certification_type_id, status, issue_date, expiry_date) VALUES
    (v_org_id, v_w_mike, v_ct_osha, 'approved', CURRENT_DATE - 300, NULL),
    (v_org_id, v_w_mike, v_ct_elec, 'approved', CURRENT_DATE - 100, CURRENT_DATE + 265),
    (v_org_id, v_w_mike, v_ct_fork, 'approved', CURRENT_DATE - 400, CURRENT_DATE - 35);
    -- Forklift is expired (35 days ago) ↑

  -- Sarah Chen: OSHA approved, Electrical License PENDING
  INSERT INTO worker_certifications (organization_id, worker_id, certification_type_id, status, issue_date, expiry_date) VALUES
    (v_org_id, v_w_sarah, v_ct_osha, 'approved', CURRENT_DATE - 60, NULL),
    (v_org_id, v_w_sarah, v_ct_elec, 'pending',  CURRENT_DATE - 5,  CURRENT_DATE + 360);

  -- James Wilson: all approved but First Aid expiring soon (22 days)
  INSERT INTO worker_certifications (organization_id, worker_id, certification_type_id, status, issue_date, expiry_date) VALUES
    (v_org_id, v_w_james, v_ct_osha, 'approved', CURRENT_DATE - 500, NULL),
    (v_org_id, v_w_james, v_ct_elec, 'approved', CURRENT_DATE - 200, CURRENT_DATE + 165),
    (v_org_id, v_w_james, v_ct_fa,   'approved', CURRENT_DATE - 708, CURRENT_DATE + 22);
    -- First Aid expiring in 22 days ↑

END $$;
