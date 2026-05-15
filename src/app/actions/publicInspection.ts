'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { calculateInspectionStatus, parseChecklist } from '@/lib/equipment'

export async function submitPublicInspection(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const admin = createAdminClient()

  const equipmentId    = formData.get('equipmentId') as string
  const templateId     = (formData.get('templateId') as string) || null
  const inspectorName  = (formData.get('inspectorName') as string)?.trim()
  const inspectorSig   = (formData.get('inspectorSignature') as string) || null
  const inspectionDate = (formData.get('inspectionDate') as string) || new Date().toISOString().slice(0, 10)
  const notes          = (formData.get('notes') as string)?.trim() || null

  if (!equipmentId) return { error: 'Invalid equipment.' }
  if (!inspectorName) return { error: 'Inspector name is required.' }

  const rawResults = formData.get('results') as string
  let items
  try { items = parseChecklist(JSON.parse(rawResults)) } catch { return { error: 'Invalid checklist data.' } }

  const status = calculateInspectionStatus(items)

  const { error: insErr } = await admin
    .from('equipment_inspections')
    .insert({
      organization_id:     (await admin.from('equipment').select('organization_id').eq('id', equipmentId).single()).data?.organization_id,
      equipment_id:        equipmentId,
      template_id:         templateId,
      inspected_by:        null,
      inspector_name:      inspectorName,
      inspector_signature: inspectorSig,
      inspection_date:     inspectionDate,
      status,
      results:             items,
      notes,
    })

  if (insErr) return { error: insErr.message }

  // Update equipment status + last_inspection_at
  const equipmentUpdate: Record<string, unknown> = {
    last_inspection_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  if (status === 'out_of_service') equipmentUpdate.status = 'out_of_service'
  else if (status === 'pass')      equipmentUpdate.status = 'active'

  await admin.from('equipment').update(equipmentUpdate).eq('id', equipmentId)

  return { success: true }
}
