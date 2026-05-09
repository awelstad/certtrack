-- Equipment types (global, not org-scoped)
CREATE TABLE IF NOT EXISTS equipment_types (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  inspection_interval_days INTEGER
);

INSERT INTO equipment_types (name, category) VALUES
  ('Scissor Lift',                  'Aerial Equipment'),
  ('Boom Lift',                     'Aerial Equipment'),
  ('Aerial Lift',                   'Aerial Equipment'),
  ('Forklift',                      'Material Handling'),
  ('Telehandler / Lull',            'Material Handling'),
  ('Ladder',                        'Fall Protection'),
  ('Extension Ladder',              'Fall Protection'),
  ('Step Ladder',                   'Fall Protection'),
  ('Harness / Fall Protection Gear','Fall Protection'),
  ('Lanyard / SRL',                 'Fall Protection'),
  ('Generator',                     'Power & Lighting'),
  ('Light Tower',                   'Power & Lighting'),
  ('Power Tools',                   'Power & Lighting'),
  ('Extension Cords',               'Power & Lighting'),
  ('Temporary Power Box',           'Power & Lighting'),
  ('GFCI Protection',               'Power & Lighting'),
  ('Fire Extinguisher',             'Safety'),
  ('Company Vehicle / Truck',       'Vehicles'),
  ('Trailer',                       'Vehicles'),
  ('Scaffold',                      'Scaffolding')
ON CONFLICT DO NOTHING;

-- Add missing columns to equipment
ALTER TABLE equipment
  ADD COLUMN IF NOT EXISTS company_asset_number TEXT,
  ADD COLUMN IF NOT EXISTS assigned_worker_id   UUID REFERENCES workers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS photo_url            TEXT,
  ADD COLUMN IF NOT EXISTS last_inspection_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_inspection_due  DATE,
  ADD COLUMN IF NOT EXISTS notes                TEXT;

-- Equipment inspection templates
CREATE TABLE IF NOT EXISTS equipment_inspection_templates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  equipment_type_id UUID REFERENCES equipment_types(id) ON DELETE SET NULL,
  title            TEXT NOT NULL,
  description      TEXT,
  checklist_items  JSONB NOT NULL DEFAULT '[]',
  created_by       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Equipment inspections
CREATE TABLE IF NOT EXISTS equipment_inspections (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  equipment_id     UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  template_id      UUID REFERENCES equipment_inspection_templates(id) ON DELETE SET NULL,
  inspected_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  inspector_name   TEXT NOT NULL,
  inspector_signature TEXT,
  inspection_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  status           TEXT NOT NULL DEFAULT 'pass' CHECK (status IN ('pass', 'fail', 'out_of_service')),
  results          JSONB NOT NULL DEFAULT '[]',
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE equipment_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "equipment_types_public_read" ON equipment_types
  FOR SELECT USING (true);

ALTER TABLE equipment_inspection_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "eit_org_read" ON equipment_inspection_templates
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY "eit_manager_all" ON equipment_inspection_templates
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid() AND role IN ('owner','admin','pm','superintendent')
    )
  );

ALTER TABLE equipment_inspections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ei_org_read" ON equipment_inspections
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY "ei_org_insert" ON equipment_inspections
  FOR INSERT WITH CHECK (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY "ei_manager_update" ON equipment_inspections
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid() AND role IN ('owner','admin','pm','superintendent')
    )
  );
