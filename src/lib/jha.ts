export type JhaStep = {
  id: string
  description: string
  hazards: JhaHazard[]
}

export type JhaHazard = {
  id: string
  description: string
  controls: string[]
}

export type JhaFieldValues = {
  company: string
  supervisor: string
  foreman: string
  weather: string
  emergency_contact: string
  emergency_notes: string
  notes: string
  tools: string
  ppe: string[]
  steps: JhaStep[]
}

export type JhaTemplate = {
  id: string
  organization_id: string
  title: string
  description: string | null
  default_steps: JhaStep[]
  default_ppe: string[]
  created_by: string | null
  created_at: string
  updated_at: string
}

export type JhaSignatureRecord = {
  id: string
  jha_id: string
  organization_id: string
  worker_id: string | null
  printed_name: string
  signature_data: string | null
  worker_identifier: string | null
  signed_at: string
}

export const DEFAULT_PPE_ITEMS = [
  'Hard Hat',
  'Safety Vest / Hi-Vis',
  'Safety Glasses',
  'Steel-Toed Boots',
  'Gloves',
  'Hearing Protection',
  'Face Shield',
  'Respirator / Dust Mask',
  'Fall Arrest Harness',
  'Arc Flash PPE',
  'Chemical-Resistant Gloves',
  'Cut-Resistant Gloves',
  'Rain Gear',
  'Knee Pads',
] as const

export const DEFAULT_JHA_FIELD_VALUES: JhaFieldValues = {
  company: '',
  supervisor: '',
  foreman: '',
  weather: '',
  emergency_contact: '',
  emergency_notes: '',
  notes: '',
  tools: '',
  ppe: [],
  steps: [],
}

export function parseFieldValues(raw: Record<string, unknown> | null): JhaFieldValues {
  if (!raw) return { ...DEFAULT_JHA_FIELD_VALUES }
  return {
    company:           typeof raw.company === 'string'           ? raw.company           : '',
    supervisor:        typeof raw.supervisor === 'string'        ? raw.supervisor        : '',
    foreman:           typeof raw.foreman === 'string'           ? raw.foreman           : '',
    weather:           typeof raw.weather === 'string'           ? raw.weather           : '',
    emergency_contact: typeof raw.emergency_contact === 'string' ? raw.emergency_contact : '',
    emergency_notes:   typeof raw.emergency_notes === 'string'   ? raw.emergency_notes   : '',
    notes:             typeof raw.notes === 'string'             ? raw.notes             : '',
    tools:             typeof raw.tools === 'string'             ? raw.tools             : '',
    ppe:               Array.isArray(raw.ppe)   ? (raw.ppe as string[])   : [],
    steps:             Array.isArray(raw.steps) ? (raw.steps as JhaStep[]) : [],
  }
}
