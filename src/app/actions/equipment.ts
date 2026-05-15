'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit'
import { calculateInspectionStatus, parseChecklist, parseChecklistTemplate } from '@/lib/equipment'
import type { Role } from '@/lib/types'

const MANAGER_ROLES: Role[] = ['owner', 'admin', 'pm', 'superintendent']

async function getAuthedManager() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' as const }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || !MANAGER_ROLES.includes(profile.role as Role)) {
    return { error: 'Insufficient permissions' as const }
  }
  return { supabase, user, profile }
}

async function getAuthedUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' as const }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: 'Profile not found' as const }
  return { supabase, user, profile }
}

// ── Equipment CRUD ─────────────────────────────────────────────

export async function createEquipment(
  _prev: { error?: string; equipmentId?: string } | null,
  formData: FormData
): Promise<{ error?: string; equipmentId?: string }> {
  const auth = await getAuthedManager()
  if ('error' in auth) return { error: auth.error }
  const { supabase, user, profile } = auth

  const name = (formData.get('name') as string)?.trim()
  if (!name) return { error: 'Name is required' }

  const payload = {
    organization_id:        profile.organization_id,
    name,
    equipment_type_id:      (formData.get('equipment_type_id') as string) || null,
    make:                   (formData.get('make') as string)?.trim() || null,
    model:                  (formData.get('model') as string)?.trim() || null,
    serial_number:          (formData.get('serial_number') as string)?.trim() || null,
    company_asset_number:   (formData.get('company_asset_number') as string)?.trim() || null,
    year:                   formData.get('year') ? Number(formData.get('year')) : null,
    job_id:                 (formData.get('job_id') as string) || null,
    assigned_worker_id:     (formData.get('assigned_worker_id') as string) || null,
    inspection_template_id: (formData.get('inspection_template_id') as string) || null,
    photo_url:              (formData.get('photo_url') as string)?.trim() || null,
    notes:                  (formData.get('notes') as string)?.trim() || null,
    status:                 'active' as const,
  }

  const { data, error } = await supabase.from('equipment').insert(payload).select('id').single()
  if (error) return { error: error.message }

  await createAuditLog({
    supabase,
    organizationId: profile.organization_id,
    actorId: user.id,
    action: 'equipment_created',
    entityType: 'equipment',
    entityId: data.id,
    metadata: { name },
  })

  revalidatePath('/equipment')
  return { equipmentId: data.id }
}

export async function updateEquipment(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string }> {
  const auth = await getAuthedManager()
  if ('error' in auth) return { error: auth.error }
  const { supabase, user, profile } = auth

  const equipmentId = formData.get('equipmentId') as string
  const name = (formData.get('name') as string)?.trim()
  if (!name) return { error: 'Name is required' }

  const { error } = await supabase
    .from('equipment')
    .update({
      name,
      equipment_type_id:      (formData.get('equipment_type_id') as string) || null,
      make:                   (formData.get('make') as string)?.trim() || null,
      model:                  (formData.get('model') as string)?.trim() || null,
      serial_number:          (formData.get('serial_number') as string)?.trim() || null,
      company_asset_number:   (formData.get('company_asset_number') as string)?.trim() || null,
      year:                   formData.get('year') ? Number(formData.get('year')) : null,
      job_id:                 (formData.get('job_id') as string) || null,
      assigned_worker_id:     (formData.get('assigned_worker_id') as string) || null,
      inspection_template_id: (formData.get('inspection_template_id') as string) || null,
      photo_url:              (formData.get('photo_url') as string)?.trim() || null,
      notes:                  (formData.get('notes') as string)?.trim() || null,
      status:                 (formData.get('status') as string) || 'active',
      updated_at:             new Date().toISOString(),
    })
    .eq('id', equipmentId)
    .eq('organization_id', profile.organization_id)

  if (error) return { error: error.message }

  await createAuditLog({
    supabase,
    organizationId: profile.organization_id,
    actorId: user.id,
    action: 'equipment_updated',
    entityType: 'equipment',
    entityId: equipmentId,
  })

  revalidatePath(`/equipment/${equipmentId}`)
  revalidatePath('/equipment')
  return {}
}

// ── Inspections ────────────────────────────────────────────────

export async function submitInspection(
  _prev: { error?: string; inspectionId?: string } | null,
  formData: FormData
): Promise<{ error?: string; inspectionId?: string }> {
  const auth = await getAuthedUser()
  if ('error' in auth) return { error: auth.error }
  const { supabase, user, profile } = auth

  const equipmentId   = formData.get('equipmentId') as string
  const templateId    = (formData.get('templateId') as string) || null
  const inspectorName = (formData.get('inspectorName') as string)?.trim()
  const inspectorSig  = (formData.get('inspectorSignature') as string) || null
  const inspectionDate = (formData.get('inspectionDate') as string) || new Date().toISOString().slice(0, 10)
  const notes         = (formData.get('notes') as string)?.trim() || null

  if (!inspectorName) return { error: 'Inspector name is required' }

  const rawResults = formData.get('results') as string
  let items
  try { items = parseChecklist(JSON.parse(rawResults)) } catch { return { error: 'Invalid checklist data' } }

  const status = calculateInspectionStatus(items)

  const { data: inspection, error: insErr } = await supabase
    .from('equipment_inspections')
    .insert({
      organization_id:     profile.organization_id,
      equipment_id:        equipmentId,
      template_id:         templateId,
      inspected_by:        user.id,
      inspector_name:      inspectorName,
      inspector_signature: inspectorSig,
      inspection_date:     inspectionDate,
      status,
      results:             items,
      notes,
    })
    .select('id')
    .single()

  if (insErr) return { error: insErr.message }

  // Update equipment last_inspection_at; sync status with inspection result
  const equipmentUpdate: Record<string, unknown> = {
    last_inspection_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  if (status === 'out_of_service') {
    equipmentUpdate.status = 'out_of_service'
  } else if (status === 'pass') {
    equipmentUpdate.status = 'active'
  }
  await supabase
    .from('equipment')
    .update(equipmentUpdate)
    .eq('id', equipmentId)
    .eq('organization_id', profile.organization_id)

  await createAuditLog({
    supabase,
    organizationId: profile.organization_id,
    actorId: user.id,
    action: 'equipment_inspected',
    entityType: 'equipment',
    entityId: equipmentId,
    metadata: { inspectionId: inspection.id, status },
  })

  revalidatePath(`/equipment/${equipmentId}`)
  revalidatePath('/equipment')
  revalidatePath('/equipment/out-of-service')
  revalidatePath('/equipment/failed')
  return { inspectionId: inspection.id }
}

// ── Inspection Templates ───────────────────────────────────────

export async function createInspectionTemplate(
  _prev: { error?: string; templateId?: string } | null,
  formData: FormData
): Promise<{ error?: string; templateId?: string }> {
  const auth = await getAuthedManager()
  if ('error' in auth) return { error: auth.error }
  const { supabase, user, profile } = auth

  const title = (formData.get('title') as string)?.trim()
  if (!title) return { error: 'Title is required' }

  const rawItems = formData.get('checklist_items') as string
  let items
  try { items = parseChecklistTemplate(JSON.parse(rawItems)) } catch { return { error: 'Invalid checklist data' } }

  const { data, error } = await supabase
    .from('equipment_inspection_templates')
    .insert({
      organization_id:   profile.organization_id,
      equipment_type_id: (formData.get('equipment_type_id') as string) || null,
      title,
      description:       (formData.get('description') as string)?.trim() || null,
      checklist_items:   items,
      created_by:        user.id,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  await createAuditLog({
    supabase,
    organizationId: profile.organization_id,
    actorId: user.id,
    action: 'inspection_template_created',
    entityType: 'equipment',
    entityId: data.id,
    metadata: { title },
  })

  revalidatePath('/equipment/templates')
  return { templateId: data.id }
}

export async function updateInspectionTemplate(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string }> {
  const auth = await getAuthedManager()
  if ('error' in auth) return { error: auth.error }
  const { supabase, user, profile } = auth

  const templateId = formData.get('templateId') as string
  const title = (formData.get('title') as string)?.trim()
  if (!title) return { error: 'Title is required' }

  const rawItems = formData.get('checklist_items') as string
  let items
  try { items = parseChecklistTemplate(JSON.parse(rawItems)) } catch { return { error: 'Invalid checklist data' } }

  const { error } = await supabase
    .from('equipment_inspection_templates')
    .update({
      equipment_type_id: (formData.get('equipment_type_id') as string) || null,
      title,
      description:       (formData.get('description') as string)?.trim() || null,
      checklist_items:   items,
      updated_at:        new Date().toISOString(),
    })
    .eq('id', templateId)
    .eq('organization_id', profile.organization_id)

  if (error) return { error: error.message }

  await createAuditLog({
    supabase,
    organizationId: profile.organization_id,
    actorId: user.id,
    action: 'inspection_template_updated',
    entityType: 'equipment',
    entityId: templateId,
  })

  revalidatePath('/equipment/templates')
  revalidatePath(`/equipment/templates/${templateId}`)
  return {}
}

export async function logEquipmentPdfExport(equipmentId: string): Promise<void> {
  const auth = await getAuthedUser()
  if ('error' in auth) return
  const { supabase, user, profile } = auth

  await createAuditLog({
    supabase,
    organizationId: profile.organization_id,
    actorId: user.id,
    action: 'equipment_pdf_exported',
    entityType: 'equipment',
    entityId: equipmentId,
  })
}
