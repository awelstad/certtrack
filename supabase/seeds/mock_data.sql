-- ============================================================
-- Mock Data Seed — Equipment, Toolbox Talks, JHAs
-- Run in Supabase SQL Editor (runs as service role, bypasses RLS)
-- Safe to run multiple times — uses existing jobs if present
-- ============================================================

DO $$
DECLARE
  v_org  UUID;
  v_job1 UUID; v_job2 UUID; v_job3 UUID;

  -- Equipment type IDs
  v_type_scissor  UUID; v_type_boom     UUID; v_type_forklift UUID;
  v_type_gen      UUID; v_type_light    UUID; v_type_ladder   UUID;
  v_type_harness  UUID; v_type_gfci     UUID; v_type_ext      UUID;
  v_type_truck    UUID;

  -- Equipment IDs
  v_eq1 UUID; v_eq2 UUID; v_eq3 UUID; v_eq4 UUID; v_eq5 UUID;
  v_eq6 UUID; v_eq7 UUID; v_eq8 UUID; v_eq9 UUID; v_eq10 UUID;

  -- Toolbox talk IDs
  v_tt1 UUID; v_tt2 UUID; v_tt3 UUID; v_tt4 UUID;

  -- JHA IDs
  v_jha1 UUID; v_jha2 UUID; v_jha3 UUID;
BEGIN

  -- ── Org ────────────────────────────────────────────────────
  SELECT id INTO v_org FROM organizations WHERE name ILIKE '%fortune%' LIMIT 1;
  IF v_org IS NULL THEN
    SELECT id INTO v_org FROM organizations ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF v_org IS NULL THEN RAISE EXCEPTION 'No organization found — create one first'; END IF;

  -- ── Equipment types ────────────────────────────────────────
  SELECT id INTO v_type_scissor  FROM equipment_types WHERE name = 'Scissor Lift'                   LIMIT 1;
  SELECT id INTO v_type_boom     FROM equipment_types WHERE name = 'Boom Lift'                      LIMIT 1;
  SELECT id INTO v_type_forklift FROM equipment_types WHERE name = 'Forklift'                       LIMIT 1;
  SELECT id INTO v_type_gen      FROM equipment_types WHERE name = 'Generator'                      LIMIT 1;
  SELECT id INTO v_type_light    FROM equipment_types WHERE name = 'Light Tower'                    LIMIT 1;
  SELECT id INTO v_type_ladder   FROM equipment_types WHERE name = 'Extension Ladder'               LIMIT 1;
  SELECT id INTO v_type_harness  FROM equipment_types WHERE name = 'Harness / Fall Protection Gear' LIMIT 1;
  SELECT id INTO v_type_gfci     FROM equipment_types WHERE name = 'GFCI Protection'                LIMIT 1;
  SELECT id INTO v_type_ext      FROM equipment_types WHERE name = 'Fire Extinguisher'              LIMIT 1;
  SELECT id INTO v_type_truck    FROM equipment_types WHERE name = 'Company Vehicle / Truck'        LIMIT 1;

  -- ── Jobs — reuse existing, create if missing ────────────────
  SELECT id INTO v_job1 FROM jobs WHERE organization_id = v_org ORDER BY created_at ASC LIMIT 1;
  SELECT id INTO v_job2 FROM jobs WHERE organization_id = v_org ORDER BY created_at ASC LIMIT 1 OFFSET 1;
  SELECT id INTO v_job3 FROM jobs WHERE organization_id = v_org ORDER BY created_at ASC LIMIT 1 OFFSET 2;

  IF v_job1 IS NULL THEN
    INSERT INTO jobs (organization_id, name, address, city, state, status, start_date)
      VALUES (v_org, 'Sunrise Medical Center — Electrical Renovation', '3200 E Flamingo Rd', 'Las Vegas', 'NV', 'active', '2026-01-15')
      RETURNING id INTO v_job1;
  END IF;
  IF v_job2 IS NULL THEN
    INSERT INTO jobs (organization_id, name, address, city, state, status, start_date)
      VALUES (v_org, 'Westside Office Complex', '8500 W Sahara Ave', 'Las Vegas', 'NV', 'active', '2026-02-01')
      RETURNING id INTO v_job2;
  END IF;
  IF v_job3 IS NULL THEN v_job3 := v_job1; END IF;

  -- ── Equipment ──────────────────────────────────────────────

  INSERT INTO equipment
    (organization_id, equipment_type_id, job_id, name, make, model, year,
     serial_number, company_asset_number, status, last_inspection_at, next_inspection_due)
  VALUES (v_org, v_type_scissor, v_job1, 'Scissor Lift #1 — 32ft', 'JLG', '3246ES', 2022,
          'SN-JLG-329481', 'FEC-EQ-001', 'active', '2026-04-01 08:00+00', '2026-07-01')
  RETURNING id INTO v_eq1;

  INSERT INTO equipment
    (organization_id, equipment_type_id, job_id, name, make, model, year,
     serial_number, company_asset_number, status, last_inspection_at, next_inspection_due)
  VALUES (v_org, v_type_boom, v_job1, 'Boom Lift — 40ft', 'JLG', '400S', 2021,
          'SN-JLG-402918', 'FEC-EQ-002', 'active', '2026-03-15 08:00+00', '2026-06-15')
  RETURNING id INTO v_eq2;

  INSERT INTO equipment
    (organization_id, equipment_type_id, job_id, name, make, model, year,
     serial_number, company_asset_number, status, last_inspection_at, next_inspection_due)
  VALUES (v_org, v_type_forklift, v_job2, 'Forklift #1', 'Toyota', '8FGU25', 2020,
          'SN-TOY-81293', 'FEC-EQ-003', 'active', '2026-04-20 08:00+00', '2026-07-20')
  RETURNING id INTO v_eq3;

  INSERT INTO equipment
    (organization_id, equipment_type_id, job_id, name, make, model, year,
     serial_number, company_asset_number, status, last_inspection_at, next_inspection_due)
  VALUES (v_org, v_type_gen, v_job2, 'Generator — 8kW', 'Generac', 'XC8000E', 2023,
          'SN-GEN-29481', 'FEC-EQ-004', 'active', '2026-03-01 08:00+00', '2026-06-01')
  RETURNING id INTO v_eq4;

  INSERT INTO equipment
    (organization_id, equipment_type_id, job_id, name, make, model, year,
     serial_number, company_asset_number, status, last_inspection_at, next_inspection_due)
  VALUES (v_org, v_type_light, v_job3, 'Light Tower #1', 'Doosan', 'L8', 2022,
          'SN-DOS-11042', 'FEC-EQ-005', 'active', '2026-04-05 08:00+00', '2026-07-05')
  RETURNING id INTO v_eq5;

  INSERT INTO equipment
    (organization_id, equipment_type_id, job_id, name, make, model, year,
     serial_number, company_asset_number, status, last_inspection_at, next_inspection_due)
  VALUES (v_org, v_type_ladder, v_job1, '24ft Extension Ladder', 'Werner', 'D1224-2', 2021,
          'SN-WRN-48291', 'FEC-EQ-006', 'active', '2026-02-10 08:00+00', '2026-05-10')
  RETURNING id INTO v_eq6;

  INSERT INTO equipment
    (organization_id, equipment_type_id, job_id, name, make, model, year,
     serial_number, company_asset_number, status, last_inspection_at, next_inspection_due)
  VALUES (v_org, v_type_harness, v_job2, 'Fall Harness — Unit 1', 'MSA', 'Workman', 2023,
          'SN-MSA-59201', 'FEC-EQ-007', 'active', '2026-01-15 08:00+00', '2026-07-15')
  RETURNING id INTO v_eq7;

  INSERT INTO equipment
    (organization_id, equipment_type_id, job_id, name, make, model, year,
     serial_number, company_asset_number, status, last_inspection_at, next_inspection_due)
  VALUES (v_org, v_type_gfci, v_job1, 'GFCI Spider Box', 'Hubbell', 'GFP520S', 2022,
          'SN-HUB-30921', 'FEC-EQ-008', 'active', '2026-04-10 08:00+00', '2026-07-10')
  RETURNING id INTO v_eq8;

  INSERT INTO equipment
    (organization_id, equipment_type_id, job_id, name, make, model, year,
     serial_number, company_asset_number, status, last_inspection_at, next_inspection_due, notes)
  VALUES (v_org, v_type_ext, v_job2, 'Fire Extinguisher — Shop', 'Amerex', 'B456', 2023,
          'SN-AMX-11293', 'FEC-EQ-009', 'active', '2026-01-01 08:00+00', '2027-01-01',
          'Annual inspection required per NFPA 10')
  RETURNING id INTO v_eq9;

  INSERT INTO equipment
    (organization_id, equipment_type_id, job_id, name, make, model, year,
     serial_number, company_asset_number, status, last_inspection_at, next_inspection_due)
  VALUES (v_org, v_type_truck, v_job3, 'Ford F-250 — Unit 12', 'Ford', 'F-250 Super Duty', 2023,
          '1FT7W2BT4PEC12345', 'FEC-VH-012', 'active', '2026-03-20 08:00+00', '2026-09-20')
  RETURNING id INTO v_eq10;

  -- ── Equipment Inspections ──────────────────────────────────

  INSERT INTO equipment_inspections (organization_id, equipment_id, inspector_name, inspected_at, inspection_date, status, notes) VALUES
    (v_org, v_eq1,  'Mike Rodriguez',  '2026-04-01 08:00+00', '2026-04-01', 'pass',  'Battery charged, controls responsive, E-stop tested.'),
    (v_org, v_eq1,  'Mike Rodriguez',  '2026-01-10 08:00+00', '2026-01-10', 'pass',  'Pre-use check passed. Platform guardrails intact.'),
    (v_org, v_eq2,  'Jake Torres',     '2026-03-15 08:00+00', '2026-03-15', 'pass',  'Hydraulics and emergency lowering system verified.'),
    (v_org, v_eq2,  'Jake Torres',     '2025-12-18 08:00+00', '2025-12-18', 'fail',  'Hydraulic leak at boom cylinder. Unit tagged out for repair.'),
    (v_org, v_eq3,  'Alex Welstad',    '2026-04-20 08:00+00', '2026-04-20', 'pass',  'Forks, mast, horn, and overhead guard all functional.'),
    (v_org, v_eq4,  'Mike Rodriguez',  '2026-03-01 08:00+00', '2026-03-01', 'pass',  'Oil level, coolant, fuel, and output voltage verified.'),
    (v_org, v_eq5,  'Jake Torres',     '2026-04-05 08:00+00', '2026-04-05', 'pass',  'Lights output checked, mast extends fully, leveling outriggers good.'),
    (v_org, v_eq6,  'Alex Welstad',    '2026-02-10 08:00+00', '2026-02-10', 'pass',  'Rungs, feet, and locking mechanism intact. No cracks or bends.'),
    (v_org, v_eq7,  'Mike Rodriguez',  '2026-01-15 08:00+00', '2026-01-15', 'pass',  'Straps, buckles, and D-rings inspected. No wear or damage.'),
    (v_org, v_eq8,  'Jake Torres',     '2026-04-10 08:00+00', '2026-04-10', 'pass',  'All GFCI outlets tested with plug-in tester. Tripping correctly.'),
    (v_org, v_eq9,  'Alex Welstad',    '2026-01-01 08:00+00', '2026-01-01', 'pass',  'Pressure in green zone. Pull pin, seal, and label intact.'),
    (v_org, v_eq10, 'Mike Rodriguez',  '2026-03-20 08:00+00', '2026-03-20', 'pass',  'Fluids, tires, lights, first aid kit, and fire extinguisher checked.');

  -- ── Toolbox Talks ─────────────────────────────────────────

  -- Talk 1: Arc Flash (completed, 8 signatures)
  INSERT INTO toolbox_talks (organization_id, job_id, title, topic, content, conducted_by, talk_date, status)
  VALUES (v_org, v_job1, 'Arc Flash Awareness', 'Electrical Safety',
'Arc flash is one of the most serious electrical hazards on construction sites. An arc flash can release enormous amounts of energy in milliseconds — causing severe burns, blindness, and death.

Key Points:
• Always verify circuits are de-energized with a calibrated meter BEFORE working — never assume power is off
• Wear appropriate arc-rated PPE: arc flash face shield, FR clothing, and rubber insulating gloves rated for the voltage
• Establish an arc flash boundary — keep unprotected workers at least 4 feet away from energized equipment
• All electrical panels must be labeled with incident energy levels per NFPA 70E
• Never wear synthetic fabrics (polyester, nylon) near energized equipment — they melt to skin
• A second person must be present when working on or near energized equipment over 50V
• Report any exposed or damaged wiring immediately — do not leave it for the next crew

The 3 Rules of Electrical Safety:
1. Treat every conductor as energized until proven otherwise with a meter
2. De-energize, lock out, and verify before touching
3. Never rush electrical work — complacency kills

Questions? Review NFPA 70E or ask your foreman before starting work.',
  'Alex Welstad', '2026-04-15', 'completed')
  RETURNING id INTO v_tt1;

  INSERT INTO toolbox_talk_signatures (talk_id, organization_id, printed_name, worker_identifier, signed_at) VALUES
    (v_tt1, v_org, 'Mike Rodriguez',  'FEC-001', '2026-04-15 07:35+00'),
    (v_tt1, v_org, 'Jake Torres',     'FEC-002', '2026-04-15 07:36+00'),
    (v_tt1, v_org, 'Carlos Reyes',    'FEC-003', '2026-04-15 07:37+00'),
    (v_tt1, v_org, 'David Kim',       'FEC-004', '2026-04-15 07:38+00'),
    (v_tt1, v_org, 'Luis Hernandez',  'FEC-005', '2026-04-15 07:39+00'),
    (v_tt1, v_org, 'Robert Johnson',  'FEC-006', '2026-04-15 07:40+00'),
    (v_tt1, v_org, 'Tony Martinez',   'FEC-007', '2026-04-15 07:41+00'),
    (v_tt1, v_org, 'Steve Williams',  'FEC-008', '2026-04-15 07:42+00');

  -- Talk 2: Fall Protection (completed, 6 signatures)
  INSERT INTO toolbox_talks (organization_id, job_id, title, topic, content, conducted_by, talk_date, status)
  VALUES (v_org, v_job1, 'Fall Protection at Heights', 'Fall Protection',
'Falls are the #1 cause of fatalities in construction. OSHA requires fall protection for any work at 6 feet or above.

Required Protection by Task:
• Scissor lifts and boom lifts: Full-body harness tied off to the anchor ring at all times — the guardrail alone is not enough
• Scaffolding above 10 feet: Guardrails on all open sides plus toe boards
• Portable ladders: Maintain 3 points of contact; secure top and bottom before climbing
• Roof or elevated decks: Guardrail system, safety net, or personal fall arrest required

Inspect Your Harness Every Single Day:
1. Check all D-rings — no deformation, cracks, or missing hardware
2. Inspect webbing for cuts, fraying, abrasion, chemical burns, or UV damage
3. Verify all buckles latch firmly and release smoothly
4. Check stitching at every stress point
5. NEVER use a harness that has arrested a fall — retire it immediately, no exceptions

Connecting Your Lanyard:
• Always connect to a certified anchor point rated for 5,000 lbs per person
• Self-retracting lanyards (SRLs) must be positioned overhead, never at foot level
• Inspect the snap hook — it must lock positively and not gate-load

If you see a fall hazard — uncovered floor opening, missing guardrail, unsecured ladder — STOP WORK and report it to your foreman before continuing.',
  'Alex Welstad', '2026-04-22', 'completed')
  RETURNING id INTO v_tt2;

  INSERT INTO toolbox_talk_signatures (talk_id, organization_id, printed_name, worker_identifier, signed_at) VALUES
    (v_tt2, v_org, 'Mike Rodriguez', 'FEC-001', '2026-04-22 07:30+00'),
    (v_tt2, v_org, 'Jake Torres',    'FEC-002', '2026-04-22 07:31+00'),
    (v_tt2, v_org, 'Carlos Reyes',   'FEC-003', '2026-04-22 07:32+00'),
    (v_tt2, v_org, 'David Kim',      'FEC-004', '2026-04-22 07:33+00'),
    (v_tt2, v_org, 'Luis Hernandez', 'FEC-005', '2026-04-22 07:34+00'),
    (v_tt2, v_org, 'Robert Johnson', 'FEC-006', '2026-04-22 07:35+00');

  -- Talk 3: LOTO (completed, 5 signatures)
  INSERT INTO toolbox_talks (organization_id, job_id, title, topic, content, conducted_by, talk_date, status)
  VALUES (v_org, v_job2, 'Lockout/Tagout (LOTO) Procedures', 'Electrical Safety',
'LOTO is the process of isolating hazardous energy before performing maintenance or service. OSHA 29 CFR 1910.147 requires a written LOTO program — and violations carry serious penalties.

The 6 Steps of LOTO:
1. Notify all affected employees that equipment will be shut down
2. Identify ALL energy sources — electrical, hydraulic, pneumatic, gravity, thermal
3. Shut down equipment using the normal stopping procedure
4. Isolate every energy source — turn off disconnects, close valves, block against gravity
5. Apply your personal lock AND tag to every isolation point
6. Verify zero energy state — attempt to start the machine; test with a voltage meter

The Golden Rules:
• ONE person = ONE lock. Never share your lock with another worker.
• Only YOU remove your lock. If you leave the site, your lock comes with you — period.
• Tagout alone (no lock) is NOT sufficient when locking is possible
• For group work, use a hasp — each crew member clips their own lock before anyone works
• Never remove someone else''s LOTO device — follow your company procedure to contact that person

Re-Energizing After Work:
1. Confirm all tools and materials are removed from the equipment
2. Ensure all workers are clear — do a headcount
3. Remove locks and tags in reverse order
4. Stand clear and notify affected personnel before re-energizing

A LOTO failure is not a near-miss — it is a potential fatality. Follow the procedure every time.',
  'Jake Torres', '2026-04-29', 'completed')
  RETURNING id INTO v_tt3;

  INSERT INTO toolbox_talk_signatures (talk_id, organization_id, printed_name, worker_identifier, signed_at) VALUES
    (v_tt3, v_org, 'Mike Rodriguez', 'FEC-001', '2026-04-29 07:30+00'),
    (v_tt3, v_org, 'Jake Torres',    'FEC-002', '2026-04-29 07:31+00'),
    (v_tt3, v_org, 'Carlos Reyes',   'FEC-003', '2026-04-29 07:32+00'),
    (v_tt3, v_org, 'David Kim',      'FEC-004', '2026-04-29 07:33+00'),
    (v_tt3, v_org, 'Luis Hernandez', 'FEC-005', '2026-04-29 07:34+00');

  -- Talk 4: Ladder Safety (active — in progress, 3 signatures so far)
  INSERT INTO toolbox_talks (organization_id, job_id, title, topic, content, conducted_by, talk_date, status)
  VALUES (v_org, v_job2, 'Ladder Safety', 'Fall Protection',
'Ladders cause hundreds of construction fatalities each year. Safe ladder use requires deliberate habits — every single time.

Choosing the Right Ladder:
• For electrical work, ALWAYS use fiberglass — aluminum conducts electricity
• Match the duty rating: Type IA = 300 lbs, Type I = 250 lbs, Type II = 225 lbs
• Extension ladders must extend at least 3 feet above the landing point

Setting Up Safely:
• 4-to-1 rule: for every 4 feet of height, move the base 1 foot away from the wall
• Secure the top with ladder hooks or rope, and stake or tie the feet
• Never set up on boxes, drums, or makeshift platforms
• Use ladder levelers on uneven ground

Climbing Rules — Non-Negotiable:
• Face the ladder when climbing AND descending
• Maintain 3 points of contact (two hands + one foot, or two feet + one hand) at all times
• Keep your belt buckle between the side rails — do not lean out
• Carry tools in a tool belt or raise them with a hand line — not in your hands
• Never stand on the top two rungs of a step ladder or the top three of an extension ladder
• One person on a ladder at a time

Inspection Before Every Use:
✓ Check for cracks, bends, or missing rungs
✓ Verify feet are in good condition and slip-resistant
✓ Confirm locking spreaders open fully (step ladders)
✓ Check rung locks are engaged (extension ladders)

A damaged ladder is a hazard — remove it from service and tag it "DO NOT USE."',
  'Mike Rodriguez', '2026-05-06', 'active')
  RETURNING id INTO v_tt4;

  INSERT INTO toolbox_talk_signatures (talk_id, organization_id, printed_name, worker_identifier, signed_at) VALUES
    (v_tt4, v_org, 'Jake Torres',  'FEC-002', '2026-05-06 07:30+00'),
    (v_tt4, v_org, 'Carlos Reyes', 'FEC-003', '2026-05-06 07:31+00'),
    (v_tt4, v_org, 'David Kim',    'FEC-004', '2026-05-06 07:32+00');

  -- ── JHAs ──────────────────────────────────────────────────

  -- JHA 1: Panel Upgrade — Completed, 4 signatures
  INSERT INTO jhas (organization_id, job_id, title, work_description, work_area, work_date, status, field_values)
  VALUES (
    v_org, v_job1,
    'Main Distribution Panel Upgrade',
    'Replace existing 400A main distribution panel with new 800A panel. Install new breakers and terminate feeders. All work coordinated with facility for planned outage.',
    'Electrical Room — Ground Floor, Sunrise Medical Center',
    '2026-04-10', 'completed',
    jsonb_build_object(
      'company',           'Fortune Electrical Contractors',
      'supervisor',        'Alex Welstad',
      'foreman',           'Mike Rodriguez',
      'weather',           'Indoor — N/A',
      'emergency_contact', 'Alex Welstad: (702) 555-0101',
      'emergency_notes',   'Nearest hospital: Sunrise Hospital, 3186 Maryland Pkwy — 0.5 miles. AED at main entrance security desk.',
      'tools',             'Insulated hand tools (screwdrivers, pliers, wire strippers)' || chr(10) ||
                           'Calibrated torque wrench' || chr(10) ||
                           'Fluke voltage tester and clamp meter' || chr(10) ||
                           'Conduit bender and fish tape' || chr(10) ||
                           'Power drill with bits' || chr(10) ||
                           'LOTO locks, hasp, and tags' || chr(10) ||
                           'Fire extinguisher (on hand)',
      'ppe',               jsonb_build_array('Hard Hat','Safety Glasses','Arc Flash PPE','Gloves','Steel-Toed Boots','Safety Vest / Hi-Vis'),
      'steps', jsonb_build_array(
        jsonb_build_object('id','s1','description','Coordinate planned outage with facility. Notify all affected departments 48 hours in advance. Post outage notices on affected panels.',
          'hazards', jsonb_build_array(
            jsonb_build_object('id','h1','description','Failure to notify may result in unexpected energized equipment or unsaved critical system data','controls',jsonb_build_array('Send written notification to facility manager and IT','Post outage notice on all affected panels 24 hrs before work'))
          )),
        jsonb_build_object('id','s2','description','De-energize main service entrance. Verify zero energy state on ALL conductors with voltage tester.',
          'hazards', jsonb_build_array(
            jsonb_build_object('id','h2','description','Exposure to energized conductors during shutdown sequence','controls',jsonb_build_array('Wear Class 2 rubber insulating gloves rated 17kV','Wear arc-rated face shield and FR clothing rated for incident energy','Two-person rule — never work alone on or near energized equipment')),
            jsonb_build_object('id','h3','description','Residual stored energy in capacitors or UPS systems','controls',jsonb_build_array('Wait minimum 5 minutes after shutdown before opening enclosures','Test ALL conductors individually with voltage meter before touching'))
          )),
        jsonb_build_object('id','s3','description','Apply LOTO — lock out main disconnect and all branch feeds. Every crew member applies personal lock to hasp.',
          'hazards', jsonb_build_array(
            jsonb_build_object('id','h4','description','Unauthorized re-energization by facility staff or another contractor','controls',jsonb_build_array('Each crew member applies personal lock and tag to hasp','Post DO NOT ENERGIZE signs on all disconnects and the room entrance','Barricade electrical room — no entry without foreman authorization'))
          )),
        jsonb_build_object('id','s4','description','Photograph existing wiring. Label all conductors before disconnecting. Remove old panel.',
          'hazards', jsonb_build_array(
            jsonb_build_object('id','h5','description','Mislabeled conductors causing incorrect terminations when re-energized','controls',jsonb_build_array('Photograph ALL wiring before any removal','Apply color-coded labels to every conductor','Verify labels against as-built drawings before proceeding'))
          )),
        jsonb_build_object('id','s5','description','Install new 800A panel. Torque all lugs to manufacturer specification. Terminate feeders per drawings.',
          'hazards', jsonb_build_array(
            jsonb_build_object('id','h6','description','Improper lug torque causing loose connection, arcing, and fire','controls',jsonb_build_array('Use calibrated torque wrench for ALL lug connections','Record torque values on inspection checklist','Superintendent to verify terminations before panel is closed'))
          )),
        jsonb_build_object('id','s6','description','Remove LOTO, restore power incrementally. Test each circuit before releasing to facility.',
          'hazards', jsonb_build_array(
            jsonb_build_object('id','h7','description','Short circuit or fault on a circuit due to wiring error','controls',jsonb_build_array('Clear ALL personnel from panel area before energizing','Energize one branch circuit at a time','Fire extinguisher must be within 10 feet during energization'))
          ))
      ),
      'notes', 'OSHA 1910.147 LOTO procedure followed in full. All work under NEC Article 408. Facility hot work permit obtained prior to work start.'
    )
  )
  RETURNING id INTO v_jha1;

  INSERT INTO jha_signatures (jha_id, organization_id, printed_name, worker_identifier, signed_at) VALUES
    (v_jha1, v_org, 'Mike Rodriguez',  'FEC-001', '2026-04-10 06:45+00'),
    (v_jha1, v_org, 'Carlos Reyes',    'FEC-003', '2026-04-10 06:46+00'),
    (v_jha1, v_org, 'David Kim',       'FEC-004', '2026-04-10 06:47+00'),
    (v_jha1, v_org, 'Luis Hernandez',  'FEC-005', '2026-04-10 06:48+00');

  -- JHA 2: LED Lighting Retrofit — Active, 3 signatures
  INSERT INTO jhas (organization_id, job_id, title, work_description, work_area, work_date, status, field_values)
  VALUES (
    v_org, v_job2,
    'LED Lighting Retrofit — Building B',
    'Replace existing fluorescent fixtures with LED troffers throughout Building B. Install occupancy sensors and daylight controls per design drawings.',
    'Building B — All Floors, Westside Office Complex',
    '2026-05-12', 'active',
    jsonb_build_object(
      'company',           'Fortune Electrical Contractors',
      'supervisor',        'Alex Welstad',
      'foreman',           'Jake Torres',
      'weather',           'Indoor — N/A',
      'emergency_contact', 'Jake Torres: (702) 555-0102',
      'emergency_notes',   'Nearest hospital: Valley Hospital, 620 Shadow Ln. AED located at Building B lobby main entrance.',
      'tools',             'Insulated screwdrivers and pliers' || chr(10) ||
                           'Voltage tester' || chr(10) ||
                           'Scissor lift (32ft) — inspect before use' || chr(10) ||
                           'Power drill with bits' || chr(10) ||
                           'Fish tape and pull line' || chr(10) ||
                           'Wire nuts and electrical tape' || chr(10) ||
                           'Fluorescent lamp recycling containers',
      'ppe',               jsonb_build_array('Hard Hat','Safety Glasses','Safety Vest / Hi-Vis','Steel-Toed Boots','Gloves','Fall Arrest Harness'),
      'steps', jsonb_build_array(
        jsonb_build_object('id','s1','description','Identify lighting circuits at electrical panel. De-energize and apply LOTO before work begins.',
          'hazards', jsonb_build_array(
            jsonb_build_object('id','h1','description','Contact with energized conductors at panel or fixture','controls',jsonb_build_array('Wear insulated gloves when operating panel','Verify zero energy with voltage tester at the fixture before touching wiring','Post LOTO tags on panel breakers'))
          )),
        jsonb_build_object('id','s2','description','Set up and inspect scissor lift. Wear full-body harness tied off to anchor ring.',
          'hazards', jsonb_build_array(
            jsonb_build_object('id','h2','description','Fall from elevated platform','controls',jsonb_build_array('Full-body harness required — tied to anchor ring, NOT guardrail','Keep all four wheels on stable, level ground','Do not override tilt alarm under any circumstances')),
            jsonb_build_object('id','h3','description','Falling tools or fixtures striking workers below','controls',jsonb_build_array('Barricade the area below with cones and caution tape before lifting','Use tool tethers on all tools above ground level','Announce overhead work to others in the area'))
          )),
        jsonb_build_object('id','s3','description','Remove old fluorescent fixtures. Disconnect wiring, cap conductors with wire nuts.',
          'hazards', jsonb_build_array(
            jsonb_build_object('id','h4','description','Mercury exposure from broken fluorescent lamps','controls',jsonb_build_array('Handle lamps with care — never break them','Place directly in marked recycling containers (required by RCRA)','If a lamp breaks: vacate the area, ventilate for 15 min, follow spill SOP'))
          )),
        jsonb_build_object('id','s4','description','Install new LED troffers per drawing. Connect wiring. Verify all mounting hardware is tight.',
          'hazards', jsonb_build_array(
            jsonb_build_object('id','h5','description','Improper mounting causing fixture to fall and strike worker or equipment below','controls',jsonb_build_array('Verify ceiling grid rating supports LED fixture weight before installing','Use ALL mounting points per manufacturer instructions','Pull-test each fixture by hand before descending platform'))
          )),
        jsonb_build_object('id','s5','description','Restore power one circuit at a time. Test each fixture and verify sensor and dimming operation.',
          'hazards', jsonb_build_array(
            jsonb_build_object('id','h6','description','Short circuit from wiring error causing arc or fire','controls',jsonb_build_array('Double-check all connections before energizing','Clear all personnel from panel area before restoring power','Fire extinguisher to be on hand during initial energization'))
          ))
      ),
      'notes', 'Coordinate section access with building management — occupied floors require off-hours scheduling. Dispose of fluorescent lamps per RCRA. Scope includes 148 fixtures across 4 floors.'
    )
  )
  RETURNING id INTO v_jha2;

  INSERT INTO jha_signatures (jha_id, organization_id, printed_name, worker_identifier, signed_at) VALUES
    (v_jha2, v_org, 'Jake Torres',   'FEC-002', '2026-05-12 06:45+00'),
    (v_jha2, v_org, 'Carlos Reyes',  'FEC-003', '2026-05-12 06:46+00'),
    (v_jha2, v_org, 'Tony Martinez', 'FEC-007', '2026-05-12 06:47+00');

  -- JHA 3: Temporary Power — Draft (no signatures yet)
  INSERT INTO jhas (organization_id, job_id, title, work_description, work_area, work_date, status, field_values)
  VALUES (
    v_org, v_job3,
    'Temporary Power Distribution Setup',
    'Install temporary 120/240V power distribution system for new construction zone. Set up spider boxes, GFCI protection, and temporary lighting string throughout work area.',
    'New Construction Zone — North Wing',
    '2026-05-20', 'draft',
    jsonb_build_object(
      'company',           'Fortune Electrical Contractors',
      'supervisor',        'Alex Welstad',
      'foreman',           'Mike Rodriguez',
      'weather',           'Outdoor — verify forecast day of. Suspend work if thunderstorm within 10 miles.',
      'emergency_contact', 'Alex Welstad: (702) 555-0101',
      'emergency_notes',   'Site first aid kit at job trailer. Nearest urgent care: 1 mile north on Sahara Ave. Site AED: job trailer front entry.',
      'tools',             'Temporary panel with main breaker' || chr(10) ||
                           'GFCI spider boxes (4-outlet, 50A)' || chr(10) ||
                           '12 AWG SOOW cord sets — minimum 12 AWG for runs over 50ft' || chr(10) ||
                           'Temporary lighting string with LED lamps' || chr(10) ||
                           'Voltage tester' || chr(10) ||
                           'Insulated hand tools' || chr(10) ||
                           'Cord covers and cable ramps' || chr(10) ||
                           'Conduit straps and fasteners',
      'ppe',               jsonb_build_array('Hard Hat','Safety Glasses','Safety Vest / Hi-Vis','Steel-Toed Boots','Gloves'),
      'steps', jsonb_build_array(
        jsonb_build_object('id','s1','description','Coordinate with GC to identify approved tap point for temporary service. Review drawings with superintendent before starting.',
          'hazards', jsonb_build_array(
            jsonb_build_object('id','h1','description','Tapping wrong circuit or unauthorized panel connection','controls',jsonb_build_array('Review electrical drawings and confirm tap point with superintendent before work','Mark approved panel clearly; do not touch others'))
          )),
        jsonb_build_object('id','s2','description','Install temporary panel with main breaker and GFCI protection on all outlets. Secure panel to stable structure.',
          'hazards', jsonb_build_array(
            jsonb_build_object('id','h2','description','Nuisance GFCI trips causing tool shutdowns mid-use','controls',jsonb_build_array('Test all GFCI outlets with plug-in tester before crew begins work','Use GFCI cord sets as secondary protection at point of use')),
            jsonb_build_object('id','h3','description','Circuit overload from too many tools on one circuit','controls',jsonb_build_array('Plan tool assignments to circuits before connecting anything','Do not exceed 80% of circuit rating — 16A on a 20A circuit maximum'))
          )),
        jsonb_build_object('id','s3','description','Route extension cords overhead on hooks or through protected cord covers at all walkways. No trip hazards.',
          'hazards', jsonb_build_array(
            jsonb_build_object('id','h4','description','Trip and fall hazard from cords across walking surfaces','controls',jsonb_build_array('Use cord covers rated for vehicle traffic at all crossings','Route overhead wherever possible using hooks or cable ties','Inspect all cords daily for damage — any damaged cord pulled from service immediately'))
          )),
        jsonb_build_object('id','s4','description','Install temporary lighting string throughout work zone. Minimum 5 foot-candles at floor level per OSHA.',
          'hazards', jsonb_build_array(
            jsonb_build_object('id','h5','description','Inadequate lighting causing slips, trips, and falls in construction zone','controls',jsonb_build_array('Measure light levels with phone app or meter before crew starts','Add supplemental drop lights in corners and below grade areas','Replace burned-out bulbs before next shift'))
          ))
      ),
      'notes', 'All temp wiring must comply with NEC Article 590. Remove all temporary power within 90 days or when permanent power is available, whichever comes first. Document installation date on panel tag.'
    )
  )
  RETURNING id INTO v_jha3;

  RAISE NOTICE 'Mock data seed complete — org_id: %, 10 equipment, 4 toolbox talks, 3 JHAs created.', v_org;
END $$;
