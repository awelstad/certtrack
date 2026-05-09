export type ChecklistItemResult = 'pass' | 'fail' | 'na' | null

export type ChecklistItem = {
  id: string
  label: string
  is_critical: boolean
  result: ChecklistItemResult
  note: string
  photo_url: string | null
}

export type ChecklistTemplateItem = {
  id: string
  label: string
  is_critical: boolean
}

export type EquipmentInspectionStatus = 'pass' | 'fail' | 'out_of_service'

export const EQUIPMENT_CATEGORIES = [
  'Aerial Equipment',
  'Material Handling',
  'Fall Protection',
  'Power & Lighting',
  'Safety',
  'Vehicles',
  'Scaffolding',
] as const

export function calculateInspectionStatus(items: ChecklistItem[]): EquipmentInspectionStatus {
  const hasCriticalFail = items.some((i) => i.is_critical && i.result === 'fail')
  if (hasCriticalFail) return 'out_of_service'
  const hasFail = items.some((i) => i.result === 'fail')
  if (hasFail) return 'fail'
  return 'pass'
}

export function parseChecklist(raw: unknown): ChecklistItem[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item) => ({
    id: String(item?.id ?? crypto.randomUUID()),
    label: String(item?.label ?? ''),
    is_critical: Boolean(item?.is_critical),
    result: item?.result ?? null,
    note: String(item?.note ?? ''),
    photo_url: item?.photo_url ?? null,
  }))
}

export function parseChecklistTemplate(raw: unknown): ChecklistTemplateItem[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item) => ({
    id: String(item?.id ?? crypto.randomUUID()),
    label: String(item?.label ?? ''),
    is_critical: Boolean(item?.is_critical),
  }))
}

export function templateItemsToChecklist(items: ChecklistTemplateItem[]): ChecklistItem[] {
  return items.map((item) => ({
    ...item,
    result: null,
    note: '',
    photo_url: null,
  }))
}
