'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit'
import { parseFieldValues } from '@/lib/jha'
import type { Role } from '@/lib/types'
import type { JhaFieldValues, JhaStep } from '@/lib/jha'

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

function parseFieldValuesFromForm(formData: FormData): JhaFieldValues | null {
  const raw = formData.get('fieldValues') as string
  try { return JSON.parse(raw) } catch { return null }
}

// ── Create ────────────────────────────────────────────────────

export async function createJha(
  _prev: { error?: string; jhaId?: string } | null,
  formData: FormData
): Promise<{ error?: string; jhaId?: string }> {
  const auth = await getAuthedManager()
  if ('error' in auth) return { error: auth.error }
  const { supabase, user, profile } = auth

  const title = (formData.get('title') as string)?.trim()
  if (!title) return { error: 'Title is required' }

  const field_values = parseFieldValuesFromForm(formData)
  if (!field_values) return { error: 'Invalid form data' }

  const { data, error } = await supabase
    .from('jhas')
    .insert({
      organization_id: profile.organization_id,
      job_id:          (formData.get('job_id') as string) || null,
      template_id:     (formData.get('template_id') as string) || null,
      title,
      work_description: (formData.get('work_description') as string)?.trim() || null,
      work_area:        (formData.get('work_area') as string)?.trim() || null,
      work_date:        (formData.get('work_date') as string) || null,
      status:           'draft',
      field_values,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error || !data) return { error: error?.message ?? 'Failed to create JHA' }

  await createAuditLog({
    supabase, organizationId: profile.organization_id, actorId: user.id,
    action: 'jha_created', entityType: 'jha', entityId: data.id,
    metadata: { title },
  })

  revalidatePath('/jha')
  return { jhaId: data.id }
}

// ── Update ────────────────────────────────────────────────────

export async function updateJha(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string }> {
  const auth = await getAuthedManager()
  if ('error' in auth) return { error: auth.error }
  const { supabase, user, profile } = auth

  const id = formData.get('id') as string
  const title = (formData.get('title') as string)?.trim()
  if (!title) return { error: 'Title is required' }

  const { data: existing } = await supabase
    .from('jhas')
    .select('status')
    .eq('id', id)
    .eq('organization_id', profile.organization_id)
    .single()

  if (!existing) return { error: 'JHA not found' }
  if (existing.status === 'completed') {
    return { error: 'Completed JHAs cannot be edited. Request a revision instead.' }
  }

  const field_values = parseFieldValuesFromForm(formData)
  if (!field_values) return { error: 'Invalid form data' }

  const { error } = await supabase
    .from('jhas')
    .update({
      title,
      work_description: (formData.get('work_description') as string)?.trim() || null,
      work_area:        (formData.get('work_area') as string)?.trim() || null,
      work_date:        (formData.get('work_date') as string) || null,
      job_id:           (formData.get('job_id') as string) || null,
      field_values,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('organization_id', profile.organization_id)

  if (error) return { error: error.message }

  await createAuditLog({
    supabase, organizationId: profile.organization_id, actorId: user.id,
    action: 'jha_edited', entityType: 'jha', entityId: id,
    metadata: { title },
  })

  revalidatePath(`/jha/${id}`)
  revalidatePath('/jha')
  return {}
}

// ── Complete / Revision ───────────────────────────────────────

export async function completeJha(jhaId: string): Promise<{ error?: string }> {
  const auth = await getAuthedManager()
  if ('error' in auth) return { error: auth.error }
  const { supabase, user, profile } = auth

  const { error } = await supabase
    .from('jhas')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', jhaId)
    .eq('organization_id', profile.organization_id)

  if (error) return { error: error.message }

  await createAuditLog({
    supabase, organizationId: profile.organization_id, actorId: user.id,
    action: 'jha_completed', entityType: 'jha', entityId: jhaId,
  })

  revalidatePath(`/jha/${jhaId}`)
  revalidatePath('/jha')
  return {}
}

export async function requestRevision(jhaId: string): Promise<{ error?: string; jhaId?: string }> {
  const auth = await getAuthedManager()
  if ('error' in auth) return { error: auth.error }
  const { supabase, user, profile } = auth

  const { data: original } = await supabase
    .from('jhas')
    .select('*')
    .eq('id', jhaId)
    .eq('organization_id', profile.organization_id)
    .single()

  if (!original) return { error: 'JHA not found' }

  const { data, error } = await supabase
    .from('jhas')
    .insert({
      organization_id:  profile.organization_id,
      job_id:           original.job_id,
      template_id:      original.template_id,
      title:            `${original.title} (Revision)`,
      work_description: original.work_description,
      work_area:        original.work_area,
      work_date:        new Date().toISOString().split('T')[0],
      status:           'draft',
      field_values:     original.field_values,
      created_by:       user.id,
    })
    .select('id')
    .single()

  if (error || !data) return { error: error?.message ?? 'Failed to create revision' }

  await createAuditLog({
    supabase, organizationId: profile.organization_id, actorId: user.id,
    action: 'jha_revised', entityType: 'jha', entityId: data.id,
    metadata: { original_jha_id: jhaId },
  })

  revalidatePath('/jha')
  return { jhaId: data.id }
}

export async function duplicateJha(jhaId: string): Promise<{ error?: string; jhaId?: string }> {
  const auth = await getAuthedManager()
  if ('error' in auth) return { error: auth.error }
  const { supabase, user, profile } = auth

  const { data: original } = await supabase
    .from('jhas')
    .select('*')
    .eq('id', jhaId)
    .eq('organization_id', profile.organization_id)
    .single()

  if (!original) return { error: 'JHA not found' }

  const { data, error } = await supabase
    .from('jhas')
    .insert({
      organization_id:  profile.organization_id,
      job_id:           original.job_id,
      template_id:      original.template_id,
      title:            `Copy of ${original.title}`,
      work_description: original.work_description,
      work_area:        original.work_area,
      work_date:        new Date().toISOString().split('T')[0],
      status:           'draft',
      field_values:     original.field_values,
      created_by:       user.id,
    })
    .select('id')
    .single()

  if (error || !data) return { error: error?.message ?? 'Failed to duplicate' }

  await createAuditLog({
    supabase, organizationId: profile.organization_id, actorId: user.id,
    action: 'jha_created', entityType: 'jha', entityId: data.id,
    metadata: { duplicated_from: jhaId },
  })

  revalidatePath('/jha')
  return { jhaId: data.id }
}

// ── Signatures ────────────────────────────────────────────────

export async function addJhaSignature(
  jhaId: string,
  payload: {
    printed_name: string
    signature_data: string | null
    worker_id: string | null
    worker_identifier: string | null
  }
): Promise<{ error?: string }> {
  const auth = await getAuthedUser()
  if ('error' in auth) return { error: auth.error }
  const { supabase, user, profile } = auth

  if (!payload.printed_name.trim()) return { error: 'Name is required' }

  const { error } = await supabase
    .from('jha_signatures')
    .insert({
      jha_id:           jhaId,
      organization_id:  profile.organization_id,
      worker_id:        payload.worker_id || null,
      printed_name:     payload.printed_name.trim(),
      signature_data:   payload.signature_data || null,
      worker_identifier: payload.worker_identifier?.trim() || null,
    })

  if (error) return { error: error.message }

  await createAuditLog({
    supabase, organizationId: profile.organization_id, actorId: user.id,
    action: 'jha_signed', entityType: 'jha', entityId: jhaId,
    metadata: { printed_name: payload.printed_name },
  })

  revalidatePath(`/jha/${jhaId}`)
  revalidatePath(`/jha/${jhaId}/sign`)
  return {}
}

// ── Templates ─────────────────────────────────────────────────

export async function createJhaTemplate(
  _prev: { error?: string; templateId?: string } | null,
  formData: FormData
): Promise<{ error?: string; templateId?: string }> {
  const auth = await getAuthedManager()
  if ('error' in auth) return { error: auth.error }
  const { supabase, user, profile } = auth

  const title = (formData.get('title') as string)?.trim()
  if (!title) return { error: 'Title is required' }

  let default_steps: JhaStep[], default_ppe: string[]
  try {
    default_steps = JSON.parse(formData.get('defaultSteps') as string)
    default_ppe   = JSON.parse(formData.get('defaultPpe') as string)
  } catch {
    return { error: 'Invalid template data' }
  }

  const { data, error } = await supabase
    .from('jha_templates')
    .insert({
      organization_id: profile.organization_id,
      title,
      description: (formData.get('description') as string)?.trim() || null,
      default_steps,
      default_ppe,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error || !data) return { error: error?.message ?? 'Failed to create template' }

  revalidatePath('/jha/templates')
  return { templateId: data.id }
}

// ── PDF export audit ──────────────────────────────────────────

export async function logJhaPdfExport(jhaId: string): Promise<void> {
  const auth = await getAuthedUser()
  if ('error' in auth) return

  const { supabase, user, profile } = auth
  await createAuditLog({
    supabase, organizationId: profile.organization_id, actorId: user.id,
    action: 'jha_pdf_exported', entityType: 'jha', entityId: jhaId,
  })
}
