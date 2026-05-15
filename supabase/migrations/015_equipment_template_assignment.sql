-- Add assigned inspection template to equipment
ALTER TABLE equipment
  ADD COLUMN IF NOT EXISTS inspection_template_id UUID REFERENCES equipment_inspection_templates(id) ON DELETE SET NULL;

-- Seed 6 system inspection templates (organization_id IS NULL = available to all orgs)
DO $$
BEGIN

  IF NOT EXISTS (
    SELECT 1 FROM equipment_inspection_templates
    WHERE organization_id IS NULL AND title = 'General Pre-Use Inspection'
  ) THEN
    INSERT INTO equipment_inspection_templates (organization_id, equipment_type_id, title, description, checklist_items)
    VALUES (
      NULL, NULL,
      'General Pre-Use Inspection',
      'Universal pre-use checklist suitable for most equipment types.',
      '[
        {"id":"gp-1", "label":"Check for visible damage, cracks, or deformation",          "is_critical":true},
        {"id":"gp-2", "label":"All safety guards are in place and undamaged",               "is_critical":true},
        {"id":"gp-3", "label":"Inspect fluid levels (oil, fuel, coolant)",                  "is_critical":false},
        {"id":"gp-4", "label":"Tires or tracks show no excessive wear or damage",           "is_critical":false},
        {"id":"gp-5", "label":"All controls operate correctly before use",                  "is_critical":false},
        {"id":"gp-6", "label":"Hydraulic lines have no visible leaks",                      "is_critical":false},
        {"id":"gp-7", "label":"Battery and electrical connections are secure",              "is_critical":false},
        {"id":"gp-8", "label":"Lights and warning devices function properly",               "is_critical":false},
        {"id":"gp-9", "label":"Safety decals and labels are present and legible",          "is_critical":false},
        {"id":"gp-10","label":"Seatbelt or operator restraint is functional",               "is_critical":false},
        {"id":"gp-11","label":"Fire extinguisher is present and charged",                   "is_critical":false},
        {"id":"gp-12","label":"Horn or warning alarm functions",                            "is_critical":false},
        {"id":"gp-13","label":"Attachment points and pins are secure",                      "is_critical":false}
      ]'::jsonb
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM equipment_inspection_templates
    WHERE organization_id IS NULL AND title = 'Aerial Work Platform / Scissor Lift'
  ) THEN
    INSERT INTO equipment_inspection_templates (organization_id, equipment_type_id, title, description, checklist_items)
    VALUES (
      NULL, NULL,
      'Aerial Work Platform / Scissor Lift',
      'Pre-use checklist for scissor lifts, boom lifts, and aerial work platforms.',
      '[
        {"id":"awp-1", "label":"Platform guardrails and entry gate are secure",                             "is_critical":true},
        {"id":"awp-2", "label":"Emergency lowering device is operable",                                    "is_critical":true},
        {"id":"awp-3", "label":"Tilt or slope indicator is functional",                                    "is_critical":true},
        {"id":"awp-4", "label":"Outriggers or stabilizers properly deployed (if equipped)",                "is_critical":false},
        {"id":"awp-5", "label":"Platform floor is free of damage and debris",                              "is_critical":false},
        {"id":"awp-6", "label":"Load does not exceed rated platform capacity",                             "is_critical":false},
        {"id":"awp-7", "label":"All platform controls function correctly",                                 "is_critical":false},
        {"id":"awp-8", "label":"Battery charge is sufficient for the intended task",                       "is_critical":false},
        {"id":"awp-9", "label":"Hydraulic system shows no leaks",                                          "is_critical":false},
        {"id":"awp-10","label":"Tires and wheels are in good condition",                                   "is_critical":false},
        {"id":"awp-11","label":"Scissor or mast mechanism is free of damage",                              "is_critical":false},
        {"id":"awp-12","label":"Ground controls override functions correctly",                              "is_critical":false}
      ]'::jsonb
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM equipment_inspection_templates
    WHERE organization_id IS NULL AND title = 'Telehandler / Forklift'
  ) THEN
    INSERT INTO equipment_inspection_templates (organization_id, equipment_type_id, title, description, checklist_items)
    VALUES (
      NULL, NULL,
      'Telehandler / Forklift',
      'Daily pre-shift inspection for telehandlers and forklifts.',
      '[
        {"id":"tf-1", "label":"Seatbelt is present and functional",                                        "is_critical":true},
        {"id":"tf-2", "label":"Overhead guard is in place and undamaged",                                  "is_critical":true},
        {"id":"tf-3", "label":"Forks or attachment show no cracks or bending",                             "is_critical":true},
        {"id":"tf-4", "label":"Tire condition and pressure are acceptable",                                 "is_critical":false},
        {"id":"tf-5", "label":"Fluid levels are within range (hydraulic, engine, coolant)",                "is_critical":false},
        {"id":"tf-6", "label":"Mast tilt and lift operation is smooth",                                    "is_critical":false},
        {"id":"tf-7", "label":"Backup alarm and horn function",                                            "is_critical":false},
        {"id":"tf-8", "label":"Hydraulic hoses show no leaks or damage",                                   "is_critical":false},
        {"id":"tf-9", "label":"Load backrest extension is in place",                                       "is_critical":false},
        {"id":"tf-10","label":"Brake function is satisfactory",                                             "is_critical":false},
        {"id":"tf-11","label":"Lights (head, tail, strobe) function",                                      "is_critical":false},
        {"id":"tf-12","label":"Boom or reach mechanism operates correctly (if equipped)",                   "is_critical":false}
      ]'::jsonb
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM equipment_inspection_templates
    WHERE organization_id IS NULL AND title = 'Excavator / Heavy Equipment'
  ) THEN
    INSERT INTO equipment_inspection_templates (organization_id, equipment_type_id, title, description, checklist_items)
    VALUES (
      NULL, NULL,
      'Excavator / Heavy Equipment',
      'Pre-shift inspection for excavators, dozers, and other heavy earthmoving equipment.',
      '[
        {"id":"ex-1", "label":"Walk-around inspection reveals no visible damage or leaks",  "is_critical":true},
        {"id":"ex-2", "label":"Swing and travel brakes hold properly",                      "is_critical":true},
        {"id":"ex-3", "label":"Track tension and condition are acceptable",                 "is_critical":false},
        {"id":"ex-4", "label":"Fluid levels are within range (hydraulic, engine, coolant)","is_critical":false},
        {"id":"ex-5", "label":"Bucket and attachment pins and hardware are secure",         "is_critical":false},
        {"id":"ex-6", "label":"Boom, stick, and cylinders show no cracks or damage",       "is_critical":false},
        {"id":"ex-7", "label":"All joystick and foot controls operate correctly",           "is_critical":false},
        {"id":"ex-8", "label":"Swing lock is engaged when machine is parked",              "is_critical":false},
        {"id":"ex-9", "label":"ROPS and safety decals are intact",                         "is_critical":false},
        {"id":"ex-10","label":"Windows and mirrors provide adequate visibility",            "is_critical":false},
        {"id":"ex-11","label":"Backup alarm is functional",                                 "is_critical":false}
      ]'::jsonb
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM equipment_inspection_templates
    WHERE organization_id IS NULL AND title = 'Power Tools'
  ) THEN
    INSERT INTO equipment_inspection_templates (organization_id, equipment_type_id, title, description, checklist_items)
    VALUES (
      NULL, NULL,
      'Power Tools',
      'Pre-use inspection for corded and cordless power tools.',
      '[
        {"id":"pt-1","label":"Power cord has no cuts, fraying, or exposed wiring",         "is_critical":true},
        {"id":"pt-2","label":"Guard or safety mechanism is in place and functional",        "is_critical":true},
        {"id":"pt-3","label":"Trigger and switch operate correctly and release properly",   "is_critical":false},
        {"id":"pt-4","label":"Blade, bit, or wheel shows no damage or excessive wear",      "is_critical":false},
        {"id":"pt-5","label":"Correct blade or bit is selected for the task",              "is_critical":false},
        {"id":"pt-6","label":"All fasteners and clamps are tight",                         "is_critical":false},
        {"id":"pt-7","label":"Tool operates smoothly during pre-use test",                 "is_critical":false},
        {"id":"pt-8","label":"Required PPE (glasses, gloves, hearing protection) is on hand","is_critical":false}
      ]'::jsonb
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM equipment_inspection_templates
    WHERE organization_id IS NULL AND title = 'Extension Cords & Electrical'
  ) THEN
    INSERT INTO equipment_inspection_templates (organization_id, equipment_type_id, title, description, checklist_items)
    VALUES (
      NULL, NULL,
      'Extension Cords & Electrical',
      'Inspection checklist for extension cords, power strips, and temporary electrical equipment.',
      '[
        {"id":"ec-1","label":"Cord insulation has no cuts, fraying, or exposed wire",       "is_critical":true},
        {"id":"ec-2","label":"Ground prong and plug are intact and undamaged",              "is_critical":true},
        {"id":"ec-3","label":"GFCI protection is in use at the outlet or inline",           "is_critical":true},
        {"id":"ec-4","label":"Cord shows no signs of overheating or burn marks",            "is_critical":false},
        {"id":"ec-5","label":"Cord is rated for the amperage of connected equipment",       "is_critical":false},
        {"id":"ec-6","label":"Cord is not run through water, pinch points, or walkways unsecured","is_critical":false},
        {"id":"ec-7","label":"Cord is not daisy-chained beyond its rated capacity",         "is_critical":false}
      ]'::jsonb
    );
  END IF;

END $$;
