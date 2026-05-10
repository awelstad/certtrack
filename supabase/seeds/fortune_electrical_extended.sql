-- Fortune Electrical — Extended test data
-- Run AFTER fortune_electrical.sql (the base seed).
-- Adds 4 jobs and 27 more workers with varied cert statuses.

DO $$
DECLARE
  v_org_id  uuid;

  -- cert types (already created in base seed)
  v_ct_osha uuid;
  v_ct_elec uuid;
  v_ct_fork uuid;
  v_ct_fa   uuid;

  -- 4 new jobs
  v_job1 uuid; -- Northside Commercial Build
  v_job2 uuid; -- Westpark Substation Upgrade
  v_job3 uuid; -- Airport Terminal C Renovation
  v_job4 uuid; -- River District Mixed-Use

  -- Journeyman Electricians
  v_w1  uuid; -- David Rodriguez
  v_w2  uuid; -- Chris Nguyen
  v_w3  uuid; -- Marcus Thompson
  v_w4  uuid; -- Kevin O'Brien
  v_w5  uuid; -- Rachel Green
  v_w6  uuid; -- Stephanie Adams
  v_w7  uuid; -- Derek Johnson
  v_w8  uuid; -- Melissa Davis
  v_w9  uuid; -- Kimberly Jones
  v_w10 uuid; -- Samantha Wilson

  -- Apprentice Electricians
  v_w11 uuid; -- Maria Garcia
  v_w12 uuid; -- Amanda Foster
  v_w13 uuid; -- Sandra Lee
  v_w14 uuid; -- Carlos Rivera
  v_w15 uuid; -- Ashley Williams
  v_w16 uuid; -- Tyler Scott
  v_w17 uuid; -- Gregory Taylor

  -- Foremen
  v_w18 uuid; -- Robert Kim
  v_w19 uuid; -- Tony Martinez
  v_w20 uuid; -- Patrick Murphy
  v_w21 uuid; -- Nathan Harris

  -- Safety Coordinators
  v_w22 uuid; -- Jennifer Walsh
  v_w23 uuid; -- Nicole Brown

  -- Project Managers
  v_w24 uuid; -- Lisa Patel
  v_w25 uuid; -- Diana Ross

  -- Helpers
  v_w26 uuid; -- Brian Cooper
  v_w27 uuid; -- Jason Chen

BEGIN

  SELECT id INTO v_org_id FROM organizations WHERE slug = 'fortune-electrical';
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Organization "fortune-electrical" not found. Run the base seed first.';
  END IF;

  -- Grab existing cert type IDs
  SELECT id INTO v_ct_osha FROM certification_types WHERE organization_id = v_org_id AND name = 'OSHA 10-Hour Construction';
  SELECT id INTO v_ct_elec FROM certification_types WHERE organization_id = v_org_id AND name = 'Electrical License — Journeyman';
  SELECT id INTO v_ct_fork FROM certification_types WHERE organization_id = v_org_id AND name = 'Forklift Operator';
  SELECT id INTO v_ct_fa   FROM certification_types WHERE organization_id = v_org_id AND name = 'First Aid / CPR';

  -- ── Jobs ─────────────────────────────────────────────────────────────
  INSERT INTO jobs (organization_id, name, address, city, state, status, start_date)
  VALUES (v_org_id, 'Northside Commercial Build', '5500 N Central Expy', 'Dallas', 'TX', 'active', CURRENT_DATE - 60)
  RETURNING id INTO v_job1;

  INSERT INTO jobs (organization_id, name, address, city, state, status, start_date)
  VALUES (v_org_id, 'Westpark Substation Upgrade', '8200 Westpark Dr', 'Houston', 'TX', 'active', CURRENT_DATE - 45)
  RETURNING id INTO v_job2;

  INSERT INTO jobs (organization_id, name, address, city, state, status, start_date)
  VALUES (v_org_id, 'Airport Terminal C Renovation', '3200 E Airfield Dr', 'Irving', 'TX', 'active', CURRENT_DATE - 15)
  RETURNING id INTO v_job3;

  INSERT INTO jobs (organization_id, name, address, city, state, status, start_date)
  VALUES (v_org_id, 'River District Mixed-Use', '1100 Commerce St', 'Dallas', 'TX', 'active', CURRENT_DATE - 5)
  RETURNING id INTO v_job4;

  -- Job cert requirements
  INSERT INTO job_required_certifications (organization_id, job_id, certification_type_id) VALUES
    (v_org_id, v_job1, v_ct_osha), (v_org_id, v_job1, v_ct_elec),
    (v_org_id, v_job2, v_ct_osha), (v_org_id, v_job2, v_ct_elec),
    (v_org_id, v_job3, v_ct_osha), (v_org_id, v_job3, v_ct_elec),
    (v_org_id, v_job4, v_ct_osha), (v_org_id, v_job4, v_ct_elec);

  -- ── Workers ───────────────────────────────────────────────────────────

  -- Journeyman Electricians
  INSERT INTO workers (organization_id, first_name, last_name, trade, employer, phone, status)
  VALUES (v_org_id, 'David', 'Rodriguez', 'Journeyman Electrician', 'Fortune Electrical', '214-555-0104', 'active') RETURNING id INTO v_w1;
  INSERT INTO workers (organization_id, first_name, last_name, trade, employer, phone, status)
  VALUES (v_org_id, 'Chris', 'Nguyen', 'Journeyman Electrician', 'Fortune Electrical', '214-555-0105', 'active') RETURNING id INTO v_w2;
  INSERT INTO workers (organization_id, first_name, last_name, trade, employer, phone, status)
  VALUES (v_org_id, 'Marcus', 'Thompson', 'Journeyman Electrician', 'Fortune Electrical', '214-555-0106', 'active') RETURNING id INTO v_w3;
  INSERT INTO workers (organization_id, first_name, last_name, trade, employer, phone, status)
  VALUES (v_org_id, 'Kevin', 'O''Brien', 'Journeyman Electrician', 'Fortune Electrical', '214-555-0107', 'active') RETURNING id INTO v_w4;
  INSERT INTO workers (organization_id, first_name, last_name, trade, employer, phone, status)
  VALUES (v_org_id, 'Rachel', 'Green', 'Journeyman Electrician', 'Fortune Electrical', '214-555-0108', 'active') RETURNING id INTO v_w5;
  INSERT INTO workers (organization_id, first_name, last_name, trade, employer, phone, status)
  VALUES (v_org_id, 'Stephanie', 'Adams', 'Journeyman Electrician', 'Fortune Electrical', '214-555-0109', 'active') RETURNING id INTO v_w6;
  INSERT INTO workers (organization_id, first_name, last_name, trade, employer, phone, status)
  VALUES (v_org_id, 'Derek', 'Johnson', 'Journeyman Electrician', 'Fortune Electrical', '214-555-0110', 'active') RETURNING id INTO v_w7;
  INSERT INTO workers (organization_id, first_name, last_name, trade, employer, phone, status)
  VALUES (v_org_id, 'Melissa', 'Davis', 'Journeyman Electrician', 'Fortune Electrical', '214-555-0111', 'active') RETURNING id INTO v_w8;
  INSERT INTO workers (organization_id, first_name, last_name, trade, employer, phone, status)
  VALUES (v_org_id, 'Kimberly', 'Jones', 'Journeyman Electrician', 'Fortune Electrical', '214-555-0112', 'active') RETURNING id INTO v_w9;
  INSERT INTO workers (organization_id, first_name, last_name, trade, employer, phone, status)
  VALUES (v_org_id, 'Samantha', 'Wilson', 'Journeyman Electrician', 'Fortune Electrical', '214-555-0113', 'active') RETURNING id INTO v_w10;

  -- Apprentice Electricians
  INSERT INTO workers (organization_id, first_name, last_name, trade, employer, phone, status)
  VALUES (v_org_id, 'Maria', 'Garcia', 'Apprentice Electrician', 'Fortune Electrical', '214-555-0114', 'active') RETURNING id INTO v_w11;
  INSERT INTO workers (organization_id, first_name, last_name, trade, employer, phone, status)
  VALUES (v_org_id, 'Amanda', 'Foster', 'Apprentice Electrician', 'Fortune Electrical', '214-555-0115', 'active') RETURNING id INTO v_w12;
  INSERT INTO workers (organization_id, first_name, last_name, trade, employer, phone, status)
  VALUES (v_org_id, 'Sandra', 'Lee', 'Apprentice Electrician', 'Fortune Electrical', '214-555-0116', 'active') RETURNING id INTO v_w13;
  INSERT INTO workers (organization_id, first_name, last_name, trade, employer, phone, status)
  VALUES (v_org_id, 'Carlos', 'Rivera', 'Apprentice Electrician', 'Fortune Electrical', '214-555-0117', 'active') RETURNING id INTO v_w14;
  INSERT INTO workers (organization_id, first_name, last_name, trade, employer, phone, status)
  VALUES (v_org_id, 'Ashley', 'Williams', 'Apprentice Electrician', 'Fortune Electrical', '214-555-0118', 'active') RETURNING id INTO v_w15;
  INSERT INTO workers (organization_id, first_name, last_name, trade, employer, phone, status)
  VALUES (v_org_id, 'Tyler', 'Scott', 'Apprentice Electrician', 'Fortune Electrical', '214-555-0119', 'active') RETURNING id INTO v_w16;
  INSERT INTO workers (organization_id, first_name, last_name, trade, employer, phone, status)
  VALUES (v_org_id, 'Gregory', 'Taylor', 'Apprentice Electrician', 'Fortune Electrical', '214-555-0120', 'active') RETURNING id INTO v_w17;

  -- Foremen
  INSERT INTO workers (organization_id, first_name, last_name, trade, employer, phone, status)
  VALUES (v_org_id, 'Robert', 'Kim', 'Foreman', 'Fortune Electrical', '214-555-0121', 'active') RETURNING id INTO v_w18;
  INSERT INTO workers (organization_id, first_name, last_name, trade, employer, phone, status)
  VALUES (v_org_id, 'Tony', 'Martinez', 'Foreman', 'Fortune Electrical', '214-555-0122', 'active') RETURNING id INTO v_w19;
  INSERT INTO workers (organization_id, first_name, last_name, trade, employer, phone, status)
  VALUES (v_org_id, 'Patrick', 'Murphy', 'Foreman', 'Fortune Electrical', '214-555-0123', 'active') RETURNING id INTO v_w20;
  INSERT INTO workers (organization_id, first_name, last_name, trade, employer, phone, status)
  VALUES (v_org_id, 'Nathan', 'Harris', 'Foreman', 'Fortune Electrical', '214-555-0124', 'active') RETURNING id INTO v_w21;

  -- Safety Coordinators
  INSERT INTO workers (organization_id, first_name, last_name, trade, employer, phone, status)
  VALUES (v_org_id, 'Jennifer', 'Walsh', 'Safety Coordinator', 'Fortune Electrical', '214-555-0125', 'active') RETURNING id INTO v_w22;
  INSERT INTO workers (organization_id, first_name, last_name, trade, employer, phone, status)
  VALUES (v_org_id, 'Nicole', 'Brown', 'Safety Coordinator', 'Fortune Electrical', '214-555-0126', 'active') RETURNING id INTO v_w23;

  -- Project Managers
  INSERT INTO workers (organization_id, first_name, last_name, trade, employer, phone, status)
  VALUES (v_org_id, 'Lisa', 'Patel', 'Project Manager', 'Fortune Electrical', '214-555-0127', 'active') RETURNING id INTO v_w24;
  INSERT INTO workers (organization_id, first_name, last_name, trade, employer, phone, status)
  VALUES (v_org_id, 'Diana', 'Ross', 'Project Manager', 'Fortune Electrical', '214-555-0128', 'active') RETURNING id INTO v_w25;

  -- Helpers
  INSERT INTO workers (organization_id, first_name, last_name, trade, employer, phone, status)
  VALUES (v_org_id, 'Brian', 'Cooper', 'Electrician Helper', 'Fortune Electrical', '214-555-0129', 'active') RETURNING id INTO v_w26;
  INSERT INTO workers (organization_id, first_name, last_name, trade, employer, phone, status)
  VALUES (v_org_id, 'Jason', 'Chen', 'Electrician Helper', 'Fortune Electrical', '214-555-0130', 'active') RETURNING id INTO v_w27;

  -- ── Job Assignments ───────────────────────────────────────────────────
  -- Northside Commercial Build
  INSERT INTO job_workers (job_id, worker_id) VALUES
    (v_job1, v_w1), (v_job1, v_w2), (v_job1, v_w3),
    (v_job1, v_w11), (v_job1, v_w12), (v_job1, v_w13),
    (v_job1, v_w18), (v_job1, v_w22);

  -- Westpark Substation Upgrade
  INSERT INTO job_workers (job_id, worker_id) VALUES
    (v_job2, v_w4), (v_job2, v_w5), (v_job2, v_w6),
    (v_job2, v_w14), (v_job2, v_w15),
    (v_job2, v_w19), (v_job2, v_w24);

  -- Airport Terminal C
  INSERT INTO job_workers (job_id, worker_id) VALUES
    (v_job3, v_w7), (v_job3, v_w8), (v_job3, v_w9),
    (v_job3, v_w16), (v_job3, v_w17),
    (v_job3, v_w19), (v_job3, v_w20), (v_job3, v_w23), (v_job3, v_w26);

  -- River District Mixed-Use
  INSERT INTO job_workers (job_id, worker_id) VALUES
    (v_job4, v_w10), (v_job4, v_w21),
    (v_job4, v_w18), -- Robert Kim oversees multiple sites
    (v_job4, v_w24), -- Lisa Patel oversees multiple sites
    (v_job4, v_w25), (v_job4, v_w27);

  -- ── Certifications ────────────────────────────────────────────────────
  -- Legend:
  --   ✓ current  = approved, expires CURRENT_DATE + 300
  --   ⚠ expiring = approved, expires within 30 days
  --   ✗ expired  = approved, expiry_date in the past
  --   ? pending  = pending review
  --   ✗ rejected = rejected

  -- David Rodriguez — all current
  INSERT INTO worker_certifications (organization_id, worker_id, certification_type_id, status, issue_date, expiry_date) VALUES
    (v_org_id, v_w1, v_ct_osha, 'approved', CURRENT_DATE - 400, NULL),
    (v_org_id, v_w1, v_ct_elec, 'approved', CURRENT_DATE - 90,  CURRENT_DATE + 275),
    (v_org_id, v_w1, v_ct_fork, 'approved', CURRENT_DATE - 180, CURRENT_DATE + 915);

  -- Chris Nguyen — electrical license expiring in 18 days
  INSERT INTO worker_certifications (organization_id, worker_id, certification_type_id, status, issue_date, expiry_date) VALUES
    (v_org_id, v_w2, v_ct_osha, 'approved', CURRENT_DATE - 300, NULL),
    (v_org_id, v_w2, v_ct_elec, 'approved', CURRENT_DATE - 347, CURRENT_DATE + 18),
    (v_org_id, v_w2, v_ct_fa,   'approved', CURRENT_DATE - 100, CURRENT_DATE + 630);

  -- Marcus Thompson — forklift EXPIRED 45 days ago
  INSERT INTO worker_certifications (organization_id, worker_id, certification_type_id, status, issue_date, expiry_date) VALUES
    (v_org_id, v_w3, v_ct_osha, 'approved', CURRENT_DATE - 500, NULL),
    (v_org_id, v_w3, v_ct_elec, 'approved', CURRENT_DATE - 150, CURRENT_DATE + 215),
    (v_org_id, v_w3, v_ct_fork, 'approved', CURRENT_DATE - 1140, CURRENT_DATE - 45);

  -- Kevin O'Brien — electrical license EXPIRED 12 days ago
  INSERT INTO worker_certifications (organization_id, worker_id, certification_type_id, status, issue_date, expiry_date) VALUES
    (v_org_id, v_w4, v_ct_osha, 'approved', CURRENT_DATE - 200, NULL),
    (v_org_id, v_w4, v_ct_elec, 'approved', CURRENT_DATE - 377, CURRENT_DATE - 12),
    (v_org_id, v_w4, v_ct_fa,   'approved', CURRENT_DATE - 50,  CURRENT_DATE + 680);

  -- Rachel Green — all current
  INSERT INTO worker_certifications (organization_id, worker_id, certification_type_id, status, issue_date, expiry_date) VALUES
    (v_org_id, v_w5, v_ct_osha, 'approved', CURRENT_DATE - 600, NULL),
    (v_org_id, v_w5, v_ct_elec, 'approved', CURRENT_DATE - 60,  CURRENT_DATE + 305);

  -- Stephanie Adams — all current including forklift
  INSERT INTO worker_certifications (organization_id, worker_id, certification_type_id, status, issue_date, expiry_date) VALUES
    (v_org_id, v_w6, v_ct_osha, 'approved', CURRENT_DATE - 350, NULL),
    (v_org_id, v_w6, v_ct_elec, 'approved', CURRENT_DATE - 200, CURRENT_DATE + 165),
    (v_org_id, v_w6, v_ct_fork, 'approved', CURRENT_DATE - 400, CURRENT_DATE + 695);

  -- Derek Johnson — electrical license PENDING
  INSERT INTO worker_certifications (organization_id, worker_id, certification_type_id, status, issue_date, expiry_date) VALUES
    (v_org_id, v_w7, v_ct_osha, 'approved', CURRENT_DATE - 250, NULL),
    (v_org_id, v_w7, v_ct_elec, 'pending',  CURRENT_DATE - 3,   CURRENT_DATE + 362);

  -- Melissa Davis — first aid expiring in 22 days
  INSERT INTO worker_certifications (organization_id, worker_id, certification_type_id, status, issue_date, expiry_date) VALUES
    (v_org_id, v_w8, v_ct_osha, 'approved', CURRENT_DATE - 400, NULL),
    (v_org_id, v_w8, v_ct_elec, 'approved', CURRENT_DATE - 120, CURRENT_DATE + 245),
    (v_org_id, v_w8, v_ct_fa,   'approved', CURRENT_DATE - 708, CURRENT_DATE + 22);

  -- Kimberly Jones — electrical license REJECTED
  INSERT INTO worker_certifications (organization_id, worker_id, certification_type_id, status, issue_date, expiry_date) VALUES
    (v_org_id, v_w9, v_ct_osha, 'approved', CURRENT_DATE - 300, NULL),
    (v_org_id, v_w9, v_ct_elec, 'rejected', CURRENT_DATE - 10,  NULL);

  -- Samantha Wilson — all current
  INSERT INTO worker_certifications (organization_id, worker_id, certification_type_id, status, issue_date, expiry_date) VALUES
    (v_org_id, v_w10, v_ct_osha, 'approved', CURRENT_DATE - 450, NULL),
    (v_org_id, v_w10, v_ct_elec, 'approved', CURRENT_DATE - 180, CURRENT_DATE + 185),
    (v_org_id, v_w10, v_ct_fork, 'approved', CURRENT_DATE - 200, CURRENT_DATE + 895);

  -- Maria Garcia — OSHA approved, electrical PENDING
  INSERT INTO worker_certifications (organization_id, worker_id, certification_type_id, status, issue_date, expiry_date) VALUES
    (v_org_id, v_w11, v_ct_osha, 'approved', CURRENT_DATE - 120, NULL),
    (v_org_id, v_w11, v_ct_elec, 'pending',  CURRENT_DATE - 7,   CURRENT_DATE + 358);

  -- Amanda Foster — OSHA PENDING
  INSERT INTO worker_certifications (organization_id, worker_id, certification_type_id, status, issue_date, expiry_date) VALUES
    (v_org_id, v_w12, v_ct_osha, 'pending', CURRENT_DATE - 2, NULL);

  -- Sandra Lee — OSHA approved, no elec yet
  INSERT INTO worker_certifications (organization_id, worker_id, certification_type_id, status, issue_date, expiry_date) VALUES
    (v_org_id, v_w13, v_ct_osha, 'approved', CURRENT_DATE - 60, NULL);

  -- Carlos Rivera — OSHA approved, electrical PENDING
  INSERT INTO worker_certifications (organization_id, worker_id, certification_type_id, status, issue_date, expiry_date) VALUES
    (v_org_id, v_w14, v_ct_osha, 'approved', CURRENT_DATE - 90,  NULL),
    (v_org_id, v_w14, v_ct_elec, 'pending',  CURRENT_DATE - 14,  CURRENT_DATE + 351);

  -- Ashley Williams — OSHA approved only
  INSERT INTO worker_certifications (organization_id, worker_id, certification_type_id, status, issue_date, expiry_date) VALUES
    (v_org_id, v_w15, v_ct_osha, 'approved', CURRENT_DATE - 45, NULL);

  -- Tyler Scott — OSHA PENDING
  INSERT INTO worker_certifications (organization_id, worker_id, certification_type_id, status, issue_date, expiry_date) VALUES
    (v_org_id, v_w16, v_ct_osha, 'pending', CURRENT_DATE - 5, NULL);

  -- Gregory Taylor — OSHA approved, electrical PENDING
  INSERT INTO worker_certifications (organization_id, worker_id, certification_type_id, status, issue_date, expiry_date) VALUES
    (v_org_id, v_w17, v_ct_osha, 'approved', CURRENT_DATE - 180, NULL),
    (v_org_id, v_w17, v_ct_elec, 'pending',  CURRENT_DATE - 20,  CURRENT_DATE + 345);

  -- Robert Kim (Foreman) — all current
  INSERT INTO worker_certifications (organization_id, worker_id, certification_type_id, status, issue_date, expiry_date) VALUES
    (v_org_id, v_w18, v_ct_osha, 'approved', CURRENT_DATE - 600, NULL),
    (v_org_id, v_w18, v_ct_elec, 'approved', CURRENT_DATE - 200, CURRENT_DATE + 165),
    (v_org_id, v_w18, v_ct_fork, 'approved', CURRENT_DATE - 300, CURRENT_DATE + 795),
    (v_org_id, v_w18, v_ct_fa,   'approved', CURRENT_DATE - 100, CURRENT_DATE + 630);

  -- Tony Martinez (Foreman) — forklift expiring in 10 days!
  INSERT INTO worker_certifications (organization_id, worker_id, certification_type_id, status, issue_date, expiry_date) VALUES
    (v_org_id, v_w19, v_ct_osha, 'approved', CURRENT_DATE - 700, NULL),
    (v_org_id, v_w19, v_ct_elec, 'approved', CURRENT_DATE - 250, CURRENT_DATE + 115),
    (v_org_id, v_w19, v_ct_fork, 'approved', CURRENT_DATE - 1085, CURRENT_DATE + 10),
    (v_org_id, v_w19, v_ct_fa,   'approved', CURRENT_DATE - 150,  CURRENT_DATE + 580);

  -- Patrick Murphy (Foreman) — all current
  INSERT INTO worker_certifications (organization_id, worker_id, certification_type_id, status, issue_date, expiry_date) VALUES
    (v_org_id, v_w20, v_ct_osha, 'approved', CURRENT_DATE - 500, NULL),
    (v_org_id, v_w20, v_ct_elec, 'approved', CURRENT_DATE - 100, CURRENT_DATE + 265),
    (v_org_id, v_w20, v_ct_fork, 'approved', CURRENT_DATE - 200, CURRENT_DATE + 895),
    (v_org_id, v_w20, v_ct_fa,   'approved', CURRENT_DATE - 200, CURRENT_DATE + 530);

  -- Nathan Harris (Foreman) — first aid EXPIRED 30 days ago
  INSERT INTO worker_certifications (organization_id, worker_id, certification_type_id, status, issue_date, expiry_date) VALUES
    (v_org_id, v_w21, v_ct_osha, 'approved', CURRENT_DATE - 400, NULL),
    (v_org_id, v_w21, v_ct_elec, 'approved', CURRENT_DATE - 150, CURRENT_DATE + 215),
    (v_org_id, v_w21, v_ct_fa,   'approved', CURRENT_DATE - 760, CURRENT_DATE - 30);

  -- Jennifer Walsh (Safety) — OSHA + First Aid current
  INSERT INTO worker_certifications (organization_id, worker_id, certification_type_id, status, issue_date, expiry_date) VALUES
    (v_org_id, v_w22, v_ct_osha, 'approved', CURRENT_DATE - 300, NULL),
    (v_org_id, v_w22, v_ct_fa,   'approved', CURRENT_DATE - 100, CURRENT_DATE + 630);

  -- Nicole Brown (Safety) — first aid expiring in 25 days
  INSERT INTO worker_certifications (organization_id, worker_id, certification_type_id, status, issue_date, expiry_date) VALUES
    (v_org_id, v_w23, v_ct_osha, 'approved', CURRENT_DATE - 200, NULL),
    (v_org_id, v_w23, v_ct_fa,   'approved', CURRENT_DATE - 705, CURRENT_DATE + 25);

  -- Lisa Patel (PM) — OSHA + First Aid current
  INSERT INTO worker_certifications (organization_id, worker_id, certification_type_id, status, issue_date, expiry_date) VALUES
    (v_org_id, v_w24, v_ct_osha, 'approved', CURRENT_DATE - 500, NULL),
    (v_org_id, v_w24, v_ct_fa,   'approved', CURRENT_DATE - 200, CURRENT_DATE + 530);

  -- Diana Ross (PM) — OSHA + First Aid current
  INSERT INTO worker_certifications (organization_id, worker_id, certification_type_id, status, issue_date, expiry_date) VALUES
    (v_org_id, v_w25, v_ct_osha, 'approved', CURRENT_DATE - 400, NULL),
    (v_org_id, v_w25, v_ct_fa,   'approved', CURRENT_DATE - 50,  CURRENT_DATE + 680);

  -- Brian Cooper (Helper) — OSHA approved
  INSERT INTO worker_certifications (organization_id, worker_id, certification_type_id, status, issue_date, expiry_date) VALUES
    (v_org_id, v_w26, v_ct_osha, 'approved', CURRENT_DATE - 80, NULL);

  -- Jason Chen (Helper) — OSHA PENDING
  INSERT INTO worker_certifications (organization_id, worker_id, certification_type_id, status, issue_date, expiry_date) VALUES
    (v_org_id, v_w27, v_ct_osha, 'pending', CURRENT_DATE - 1, NULL);

END $$;
