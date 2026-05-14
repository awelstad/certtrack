-- ============================================================
-- Migration 014: Standard Certification Types + Toolbox Talk Templates
-- Run in Supabase SQL Editor
-- ============================================================

-- ── Standard Certification Types ──────────────────────────
-- Inserts standard cert types into every existing organization.
-- Skips any name that already exists for that org.
INSERT INTO certification_types (organization_id, name, description)
SELECT o.id, t.name, t.description
FROM organizations o
CROSS JOIN (VALUES
  ('OSHA 10-Hour Construction',         'OSHA 10-hour construction safety outreach training card'),
  ('OSHA 30-Hour Construction',         'OSHA 30-hour construction safety outreach training card'),
  ('First Aid / CPR',                   'First Aid and CPR certification'),
  ('Forklift Operator',                 'Forklift (powered industrial truck) operator certification'),
  ('Scissor Lift Operator',             'Aerial work platform — scissor lift operator certification'),
  ('Boom Lift / AWP Operator',          'Aerial work platform — boom/articulating lift operator certification'),
  ('Telehandler / Lull Operator',       'Telescopic forklift (Lull, telehandler) operator certification'),
  ('Excavator Operator',                'Excavator and tracked equipment operator certification'),
  ('Rigging & Signaling',               'Crane rigging and hand-signal certification'),
  ('Fall Protection',                   'Fall protection training and certification'),
  ('Confined Space Entry',              'Permit-required confined space entry training'),
  ('Hazmat / HAZWOPER',                 'Hazardous materials or HAZWOPER 40-hour certification'),
  ('Flagging / Traffic Control',        'Flagger and traffic control safety certification'),
  ('Powder-Actuated Tool Operator',     'Powder-actuated fastening tool operator (e.g. Hilti, Ramset)'),
  ('Electrical Safety / NFPA 70E',      'Electrical safety awareness per NFPA 70E')
) AS t(name, description)
WHERE NOT EXISTS (
  SELECT 1 FROM certification_types ct
  WHERE ct.organization_id = o.id AND ct.name = t.name
);

-- ── Standard Toolbox Talk Templates ───────────────────────
INSERT INTO toolbox_talk_templates (title, topic, content) VALUES

(
  'Slips, Trips, and Falls Prevention',
  'Fall Prevention',
  'Good morning everyone. Today we are talking about slips, trips, and falls — one of the leading causes of injury on construction sites.

KEY POINTS:
• Keep walkways clear of cords, tools, and debris at all times.
• Clean up spills immediately; use absorbent material and wet-floor signs.
• Wear footwear with slip-resistant soles appropriate for site conditions.
• Use three points of contact when climbing ladders — two hands and one foot, or two feet and one hand.
• Inspect ladders before each use; never use a damaged ladder.
• Secure floor openings with covers rated for the load, or install guardrails immediately.
• Pay attention — phone distractions are a leading cause of trip injuries.

DISCUSSION QUESTION:
Has anyone seen a slip or trip hazard on site recently? What did you do about it?

Remember: a two-second look at your path can prevent a life-changing injury.'
),

(
  'Personal Protective Equipment (PPE)',
  'PPE / Equipment Safety',
  'Good morning team. Today we are covering Personal Protective Equipment — your last line of defense against injury.

REQUIRED PPE ON THIS SITE:
• Hard hat: worn at all times in designated areas. Inspect daily for cracks or damage.
• Safety glasses or goggles: required whenever there is a risk of flying objects or chemical splash.
• High-visibility vest: required whenever working near vehicle or equipment traffic.
• Steel-toed or composite-toed boots: required on all active work areas.
• Gloves: wear cut-resistant gloves for handling sheet metal, rebar, or sharp materials.
• Hearing protection: required in areas with sustained noise above 85 dB.
• Respirator: required when working with silica dust, chemicals, or in poor-air environments.

KEY REMINDERS:
• Never modify PPE — drilling holes in a hard hat or cutting a vest defeats its purpose.
• Replace damaged or expired PPE immediately; report the need to your supervisor.
• PPE is provided — if yours is worn out, ask. No excuses for not wearing it.

DISCUSSION:
Is everyone wearing their required PPE today? Are there tasks coming up this week that require additional PPE?'
),

(
  'Struck-By Hazards',
  'Struck-By / Overhead Safety',
  'Good morning. Today we are discussing struck-by hazards — the second leading cause of construction fatalities.

THE FOUR TYPES OF STRUCK-BY HAZARDS:
1. Flying objects: fragments from grinders, nail guns, or power tools.
2. Falling objects: tools or materials dropped from heights above.
3. Swinging/rolling equipment: blind spots on excavators, cranes, and trucks.
4. Vehicle traffic: workers on foot near vehicles in motion.

PREVENTION:
• Never stand or walk under suspended loads or active crane operations.
• Secure all tools and materials at heights — use lanyards or toe boards.
• Wear eye protection whenever cutting, grinding, or nailing.
• Maintain eye contact with equipment operators before entering their work zone.
• Stay outside the swing radius of excavators and cranes unless the operator has confirmed you.
• Wear your hi-vis vest whenever working near vehicle traffic.

SIGNAL: If you see a tool falling or something flying toward someone — shout "HEADS UP" immediately.

DISCUSSION:
What struck-by hazards exist on our current work area? What controls are in place?'
),

(
  'Heat Illness Prevention',
  'Heat Safety',
  'Good morning everyone. With temperatures rising, today we are reviewing how to prevent heat illness — which can turn fatal fast.

HEAT ILLNESS STAGES:
• Heat cramps: muscle pain/spasms — rest in shade, drink water, stretch.
• Heat exhaustion: heavy sweating, weakness, dizziness, nausea — move to cool area, hydrate, notify supervisor.
• Heat stroke: hot dry skin, confusion, loss of consciousness — CALL 911 IMMEDIATELY. This is a life-threatening emergency.

PREVENTION — WATER, REST, SHADE:
• Drink 1 cup of water every 20 minutes — do not wait until you are thirsty.
• Take rest breaks in the shade or air-conditioned areas, especially during peak heat (10am–4pm).
• Wear light-colored, loose-fitting clothing and a hat when possible.
• NEW WORKERS: it takes 7–14 days to acclimatize to heat. Take extra care your first two weeks.
• Buddy up — watch your coworkers for signs of heat illness and speak up.

KNOW THE EMERGENCY PLAN:
The nearest shade/rest area is: ___________
Emergency contact / site supervisor: ___________
Nearest cold water location: ___________

DISCUSSION:
Does everyone know where the water cooler and shade areas are located today?'
),

(
  'Electrical Safety Awareness',
  'Electrical Safety',
  'Good morning team. Today we are covering electrical hazards — the fourth leading cause of construction deaths.

THE FOUR ELECTRICAL HAZARDS (FLEE):
• Flash/arc flash: explosive release of energy from electrical fault
• Lightning: outdoor work and metal structures
• Electrocution: contact with live wires or components
• Electric shock: non-fatal current through the body that can still cause burns and falls

KEY SAFE PRACTICES:
• Treat every wire as if it is live — always.
• Use Ground Fault Circuit Interrupters (GFCIs) with all power tools on site.
• Inspect cords before each use — no frays, cuts, or damaged insulation.
• Never use damaged extension cords; tag them and remove them from service.
• Keep a 10-foot clearance from overhead power lines unless lines are de-energized and grounded.
• Use lockout/tagout (LOTO) before working on any electrical equipment or panel.
• Only qualified electricians perform electrical work.

OVERHEAD LINES: Before raising equipment (boom lifts, scaffolding, ladders) — look up. Call 811 before digging.

DISCUSSION:
Are there any overhead power lines, exposed panels, or cord hazards visible from where you are standing right now?'
);

NOTIFY pgrst, 'reload schema';
