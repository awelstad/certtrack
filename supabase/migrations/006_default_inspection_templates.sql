-- Allow system-default templates (no org owner)
ALTER TABLE equipment_inspection_templates
  ALTER COLUMN organization_id DROP NOT NULL;

-- Update RLS: system templates (org IS NULL) readable by all authed users
DROP POLICY IF EXISTS "eit_org_read" ON equipment_inspection_templates;
CREATE POLICY "eit_org_read" ON equipment_inspection_templates
  FOR SELECT USING (
    organization_id IS NULL
    OR organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

-- Seed default templates
DO $$
DECLARE
  type_scissor    UUID;
  type_boom       UUID;
  type_forklift   UUID;
  type_telehandler UUID;
  type_ladder     UUID;
  type_ext_ladder UUID;
  type_step_ladder UUID;
  type_harness    UUID;
  type_lanyard    UUID;
  type_temp_power UUID;
  type_gfci       UUID;
  type_ext_cord   UUID;
BEGIN
  SELECT id INTO type_scissor     FROM equipment_types WHERE name = 'Scissor Lift';
  SELECT id INTO type_boom        FROM equipment_types WHERE name = 'Boom Lift';
  SELECT id INTO type_forklift    FROM equipment_types WHERE name = 'Forklift';
  SELECT id INTO type_telehandler FROM equipment_types WHERE name = 'Telehandler / Lull';
  SELECT id INTO type_ladder      FROM equipment_types WHERE name = 'Ladder';
  SELECT id INTO type_ext_ladder  FROM equipment_types WHERE name = 'Extension Ladder';
  SELECT id INTO type_step_ladder FROM equipment_types WHERE name = 'Step Ladder';
  SELECT id INTO type_harness     FROM equipment_types WHERE name = 'Harness / Fall Protection Gear';
  SELECT id INTO type_lanyard     FROM equipment_types WHERE name = 'Lanyard / SRL';
  SELECT id INTO type_temp_power  FROM equipment_types WHERE name = 'Temporary Power Box';
  SELECT id INTO type_gfci        FROM equipment_types WHERE name = 'GFCI Protection';
  SELECT id INTO type_ext_cord    FROM equipment_types WHERE name = 'Extension Cords';

  -- ── Scissor Lift / Boom Lift ────────────────────────────────
  INSERT INTO equipment_inspection_templates
    (organization_id, equipment_type_id, title, description, checklist_items)
  VALUES
    (NULL, type_scissor,
     'Scissor Lift — Daily Pre-Use Inspection',
     'Required before each use. Critical failures take unit out of service.',
     jsonb_build_array(
       jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Tires/wheels in good condition',          'is_critical', false),
       jsonb_build_object('id', gen_random_uuid()::text, 'label', 'All controls working properly',           'is_critical', true),
       jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Emergency stop / lowering working',       'is_critical', true),
       jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Platform gate / chain secure',            'is_critical', true),
       jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Guardrails in place and secure',          'is_critical', true),
       jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Battery / fuel level adequate',           'is_critical', false),
       jsonb_build_object('id', gen_random_uuid()::text, 'label', 'No hydraulic leaks',                      'is_critical', false),
       jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Warning alarms working',                  'is_critical', true),
       jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Fall protection anchor points intact',     'is_critical', true),
       jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Decals and operator manual present',       'is_critical', false),
       jsonb_build_object('id', gen_random_uuid()::text, 'label', 'No visible structural damage',             'is_critical', false),
       jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Equipment cleared — safe for use',         'is_critical', true)
     )
    ),
    (NULL, type_boom,
     'Boom Lift — Daily Pre-Use Inspection',
     'Required before each use. Critical failures take unit out of service.',
     jsonb_build_array(
       jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Tires/wheels in good condition',          'is_critical', false),
       jsonb_build_object('id', gen_random_uuid()::text, 'label', 'All controls working properly',           'is_critical', true),
       jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Emergency stop / lowering working',       'is_critical', true),
       jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Platform gate / chain secure',            'is_critical', true),
       jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Guardrails in place and secure',          'is_critical', true),
       jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Battery / fuel level adequate',           'is_critical', false),
       jsonb_build_object('id', gen_random_uuid()::text, 'label', 'No hydraulic leaks',                      'is_critical', false),
       jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Warning alarms working',                  'is_critical', true),
       jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Fall protection anchor points intact',     'is_critical', true),
       jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Decals and operator manual present',       'is_critical', false),
       jsonb_build_object('id', gen_random_uuid()::text, 'label', 'No visible structural damage',             'is_critical', false),
       jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Equipment cleared — safe for use',         'is_critical', true)
     )
    );

  -- ── Forklift / Telehandler ──────────────────────────────────
  INSERT INTO equipment_inspection_templates
    (organization_id, equipment_type_id, title, description, checklist_items)
  VALUES
    (NULL, type_forklift,
     'Forklift — Daily Pre-Use Inspection',
     'OSHA-required daily inspection before first use each shift.',
     jsonb_build_array(
       jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Tires in good condition',                 'is_critical', false),
       jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Forks — no cracks, bends, or wear',       'is_critical', true),
       jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Mast / boom operates smoothly',           'is_critical', true),
       jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Hydraulics — no leaks',                   'is_critical', false),
       jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Brakes working correctly',                'is_critical', true),
       jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Steering responsive',                     'is_critical', true),
       jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Backup alarm working',                    'is_critical', true),
       jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Seatbelt present and functional',         'is_critical', true),
       jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Lights working',                          'is_critical', false),
       jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Horn working',                            'is_critical', false),
       jsonb_build_object('id', gen_random_uuid()::text, 'label', 'No fluid leaks (oil, coolant, fuel)',     'is_critical', false),
       jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Load chart present in cab',               'is_critical', false),
       jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Equipment cleared — safe for use',         'is_critical', true)
     )
    ),
    (NULL, type_telehandler,
     'Telehandler / Lull — Daily Pre-Use Inspection',
     'Required before each shift. Critical failures take unit out of service.',
     jsonb_build_array(
       jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Tires in good condition',                 'is_critical', false),
       jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Forks / attachment — no cracks or wear',  'is_critical', true),
       jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Boom extends/retracts smoothly',          'is_critical', true),
       jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Hydraulics — no leaks',                   'is_critical', false),
       jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Brakes working correctly',                'is_critical', true),
       jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Steering responsive (all modes)',         'is_critical', true),
       jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Backup alarm working',                    'is_critical', true),
       jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Seatbelt present and functional',         'is_critical', true),
       jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Lights working',                          'is_critical', false),
       jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Horn working',                            'is_critical', false),
       jsonb_build_object('id', gen_random_uuid()::text, 'label', 'No fluid leaks (oil, coolant, fuel)',     'is_critical', false),
       jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Load chart present in cab',               'is_critical', false),
       jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Equipment cleared — safe for use',         'is_critical', true)
     )
    );

  -- ── Ladders ─────────────────────────────────────────────────
  FOR type_ladder IN
    SELECT unnest(ARRAY[type_ladder, type_ext_ladder, type_step_ladder])
  LOOP
    INSERT INTO equipment_inspection_templates
      (organization_id, equipment_type_id, title, description, checklist_items)
    VALUES (
      NULL, type_ladder,
      CASE type_ladder
        WHEN type_ext_ladder  THEN 'Extension Ladder — Pre-Use Inspection'
        WHEN type_step_ladder THEN 'Step Ladder — Pre-Use Inspection'
        ELSE 'Ladder — Pre-Use Inspection'
      END,
      'Required before each use. Remove from service if any critical item fails.',
      jsonb_build_array(
        jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Side rails — no cracks, dents, or bends',   'is_critical', true),
        jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Rungs / steps — none missing or damaged',   'is_critical', true),
        jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Feet / pads in good condition',             'is_critical', false),
        jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Safety labels readable',                    'is_critical', false),
        jsonb_build_object('id', gen_random_uuid()::text, 'label', 'No cracks, splits, or bends in body',       'is_critical', true),
        jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Correct ladder for this task / height',     'is_critical', false),
        jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Ladder cleared — safe for use',             'is_critical', true)
      )
    );
  END LOOP;

  -- ── Harness & Lanyard ────────────────────────────────────────
  FOR type_harness IN
    SELECT unnest(ARRAY[type_harness, type_lanyard])
  LOOP
    INSERT INTO equipment_inspection_templates
      (organization_id, equipment_type_id, title, description, checklist_items)
    VALUES (
      NULL, type_harness,
      CASE type_harness
        WHEN type_lanyard THEN 'Lanyard / SRL — Pre-Use Inspection'
        ELSE 'Harness / Fall Protection — Pre-Use Inspection'
      END,
      'Inspect before every use. Any critical failure = remove from service immediately.',
      CASE type_harness
        WHEN type_lanyard THEN
          jsonb_build_array(
            jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Webbing / rope — no cuts, fraying, or burns',  'is_critical', true),
            jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Snap hooks — no cracks or corrosion',          'is_critical', true),
            jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Snap hook gates lock properly',                'is_critical', true),
            jsonb_build_object('id', gen_random_uuid()::text, 'label', 'SRL retracts and locks correctly',             'is_critical', true),
            jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Labels / inspection tags readable',            'is_critical', false),
            jsonb_build_object('id', gen_random_uuid()::text, 'label', 'No impact indicator deployed',                 'is_critical', true),
            jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Equipment cleared — safe for use',              'is_critical', true)
          )
        ELSE
          jsonb_build_array(
            jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Webbing — no cuts, fraying, or burns',         'is_critical', true),
            jsonb_build_object('id', gen_random_uuid()::text, 'label', 'D-rings — no cracks, bends, or corrosion',     'is_critical', true),
            jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Buckles latch and release correctly',          'is_critical', true),
            jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Stitching intact (no broken threads)',          'is_critical', true),
            jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Labels and inspection date readable',          'is_critical', false),
            jsonb_build_object('id', gen_random_uuid()::text, 'label', 'No cuts, burns, or chemical damage',           'is_critical', true),
            jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Lanyard / SRL condition acceptable',           'is_critical', true),
            jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Equipment cleared — safe for use',              'is_critical', true)
          )
      END
    );
  END LOOP;

  -- ── Temporary Power / Cords / GFCI ──────────────────────────
  FOR type_temp_power IN
    SELECT unnest(ARRAY[type_temp_power, type_gfci, type_ext_cord])
  LOOP
    INSERT INTO equipment_inspection_templates
      (organization_id, equipment_type_id, title, description, checklist_items)
    VALUES (
      NULL, type_temp_power,
      CASE type_temp_power
        WHEN type_gfci     THEN 'GFCI Protection — Inspection'
        WHEN type_ext_cord THEN 'Extension Cord — Pre-Use Inspection'
        ELSE 'Temporary Power — Pre-Use Inspection'
      END,
      'Required before each use. Critical failures require immediate removal from service.',
      jsonb_build_array(
        jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Cord jacket — no cracks, cuts, or abrasion',     'is_critical', false),
        jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Plug ends intact — no damage or discoloration',  'is_critical', true),
        jsonb_build_object('id', gen_random_uuid()::text, 'label', 'No exposed copper / bare conductors',             'is_critical', true),
        jsonb_build_object('id', gen_random_uuid()::text, 'label', 'GFCI tested and tripped correctly',              'is_critical', true),
        jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Panel / box fully closed and latched',           'is_critical', true),
        jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Weather protection in place (if outdoors)',      'is_critical', false),
        jsonb_build_object('id', gen_random_uuid()::text, 'label', 'Equipment cleared — safe for use',               'is_critical', true)
      )
    );
  END LOOP;

END $$;
