'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit'
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

export async function createOrientation(
  _prev: { error?: string; orientationId?: string } | null,
  formData: FormData
): Promise<{ error?: string; orientationId?: string }> {
  const auth = await getAuthedManager()
  if ('error' in auth) return { error: auth.error }
  const { supabase, user, profile } = auth

  const title = (formData.get('title') as string)?.trim()
  const content = (formData.get('content') as string)?.trim() || null
  const jobId = (formData.get('jobId') as string) || null
  const isRequired = formData.get('isRequired') === 'on'
  const includeInCompliance = formData.get('includeInCompliance') === 'on'

  if (!title) return { error: 'Title is required' }

  const { data, error } = await supabase
    .from('orientation_modules')
    .insert({
      organization_id: profile.organization_id,
      job_id: jobId,
      title,
      content,
      is_required: isRequired,
      include_in_compliance: includeInCompliance,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error || !data) return { error: error?.message ?? 'Failed to create' }

  await createAuditLog({
    supabase,
    organizationId: profile.organization_id,
    actorId: user.id,
    action: 'orientation_created',
    entityType: 'orientation',
    entityId: data.id,
    metadata: { title },
  })

  revalidatePath('/orientations')
  return { orientationId: data.id }
}

export async function updateOrientation(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string }> {
  const auth = await getAuthedManager()
  if ('error' in auth) return { error: auth.error }
  const { supabase, user, profile } = auth

  const id = formData.get('id') as string
  const title = (formData.get('title') as string)?.trim()
  const content = (formData.get('content') as string)?.trim() || null
  const jobId = (formData.get('jobId') as string) || null
  const isRequired = formData.get('isRequired') === 'on'
  const includeInCompliance = formData.get('includeInCompliance') === 'on'

  if (!title) return { error: 'Title is required' }

  const { error } = await supabase
    .from('orientation_modules')
    .update({
      title,
      content,
      job_id: jobId,
      is_required: isRequired,
      include_in_compliance: includeInCompliance,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('organization_id', profile.organization_id)

  if (error) return { error: error.message }

  await createAuditLog({
    supabase,
    organizationId: profile.organization_id,
    actorId: user.id,
    action: 'orientation_updated',
    entityType: 'orientation',
    entityId: id,
    metadata: { title },
  })

  revalidatePath(`/orientations/${id}`)
  revalidatePath('/orientations')
  return {}
}

export async function signOrientation(orientationId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: 'Profile not found' }

  const { data: worker } = await supabase
    .from('workers')
    .select('id')
    .eq('profile_id', user.id)
    .eq('organization_id', profile.organization_id)
    .single()

  if (!worker) return { error: 'No worker record linked to your account. Ask an admin to link it.' }

  const { error } = await supabase
    .from('orientation_signatures')
    .insert({
      orientation_id: orientationId,
      worker_id: worker.id,
      organization_id: profile.organization_id,
    })

  if (error) {
    if (error.code === '23505') return { error: 'Already signed' }
    return { error: error.message }
  }

  await createAuditLog({
    supabase,
    organizationId: profile.organization_id,
    actorId: user.id,
    action: 'orientation_signed',
    entityType: 'orientation',
    entityId: orientationId,
    metadata: { worker_id: worker.id },
  })

  revalidatePath(`/orientations/${orientationId}`)
  return {}
}
