'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const MANAGER_ROLES = ['platform_admin', 'owner', 'admin', 'pm', 'superintendent'] as const

async function getAuthedManager() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, profile: null, error: 'Unauthorized' as const }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || !MANAGER_ROLES.includes(profile.role as never)) {
    return { supabase, profile: null, error: 'Insufficient permissions' as const }
  }

  return { supabase, profile, userId: user.id, error: null }
}

// ─── Jobs ────────────────────────────────────────────────────────────────────

export async function createJob(
  _prev: { jobId?: string; error?: string } | null,
  formData: FormData
): Promise<{ jobId?: string; error?: string }> {
  const { supabase, profile, error } = await getAuthedManager()
  if (error || !profile) return { error: error ?? 'Unauthorized' }

  const name      = (formData.get('name') as string).trim()
  const address   = (formData.get('address') as string) || null
  const city      = (formData.get('city') as string) || null
  const state     = (formData.get('state') as string) || null
  const zip       = (formData.get('zip') as string) || null
  const status    = (formData.get('status') as string) || 'active'
  const startDate = (formData.get('startDate') as string) || null
  const endDate   = (formData.get('endDate') as string) || null

  if (!name) return { error: 'Job name is required' }

  const { data: job, error: dbErr } = await supabase
    .from('jobs')
    .insert({
      organization_id: profile.organization_id,
      name, address, city, state, zip, status,
      start_date: startDate,
      end_date:   endDate,
    })
    .select('id')
    .single()

  if (dbErr) return { error: dbErr.message }
  revalidatePath('/jobs')
  return { jobId: job.id }
}

export async function updateJob(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const { supabase, profile, error } = await getAuthedManager()
  if (error || !profile) return { error: error ?? 'Unauthorized' }

  const jobId     = (formData.get('job_id') as string)?.trim()
  const name      = (formData.get('name') as string)?.trim()
  const address   = (formData.get('address') as string)?.trim() || null
  const city      = (formData.get('city') as string)?.trim() || null
  const state     = (formData.get('state') as string)?.trim() || null
  const zip       = (formData.get('zip') as string)?.trim() || null
  const status    = (formData.get('status') as string) || 'active'
  const startDate = (formData.get('startDate') as string) || null
  const endDate   = (formData.get('endDate') as string) || null

  if (!jobId) return { error: 'Job ID missing' }
  if (!name)  return { error: 'Job name is required' }

  const { error: dbErr } = await supabase
    .from('jobs')
    .update({ name, address, city, state, zip, status, start_date: startDate, end_date: endDate })
    .eq('id', jobId)
    .eq('organization_id', profile.organization_id)

  if (dbErr) return { error: dbErr.message }
  revalidatePath(`/jobs/${jobId}`)
  revalidatePath('/jobs')
  return { success: true }
}

export async function updateJobStatus(
  jobId: string,
  status: string
): Promise<{ error?: string }> {
  const { supabase, profile, error } = await getAuthedManager()
  if (error || !profile) return { error: error ?? 'Unauthorized' }

  const { error: dbErr } = await supabase
    .from('jobs')
    .update({ status })
    .eq('id', jobId)
    .eq('organization_id', profile.organization_id)

  if (dbErr) return { error: dbErr.message }
  revalidatePath(`/jobs/${jobId}`)
  revalidatePath('/jobs')
  return {}
}

// ─── Requirements ────────────────────────────────────────────────────────────

export async function addJobRequirement(
  jobId: string,
  certTypeId: string
): Promise<{ error?: string }> {
  const { supabase, profile, error } = await getAuthedManager()
  if (error || !profile) return { error: error ?? 'Unauthorized' }

  const { error: dbErr } = await supabase
    .from('job_required_certifications')
    .insert({
      organization_id:       profile.organization_id,
      job_id:                jobId,
      certification_type_id: certTypeId,
    })

  if (dbErr) return { error: dbErr.message }
  revalidatePath(`/jobs/${jobId}/requirements`)
  revalidatePath(`/jobs/${jobId}/compliance`)
  return {}
}

export async function removeJobRequirement(
  requirementId: string,
  jobId: string
): Promise<{ error?: string }> {
  const { supabase, profile, error } = await getAuthedManager()
  if (error || !profile) return { error: error ?? 'Unauthorized' }

  const { error: dbErr } = await supabase
    .from('job_required_certifications')
    .delete()
    .eq('id', requirementId)
    .eq('organization_id', profile.organization_id)

  if (dbErr) return { error: dbErr.message }
  revalidatePath(`/jobs/${jobId}/requirements`)
  revalidatePath(`/jobs/${jobId}/compliance`)
  return {}
}

// ─── Worker assignment ────────────────────────────────────────────────────────

export async function assignWorkerToJob(
  jobId: string,
  workerId: string
): Promise<{ error?: string }> {
  const { supabase, profile, userId, error } = await getAuthedManager()
  if (error || !profile) return { error: error ?? 'Unauthorized' }

  const { error: dbErr } = await supabase
    .from('job_workers')
    .insert({ job_id: jobId, worker_id: workerId, added_by: userId })

  if (dbErr) return { error: dbErr.message }
  revalidatePath(`/jobs/${jobId}/compliance`)
  return {}
}

export async function removeWorkerFromJob(
  jobId: string,
  workerId: string
): Promise<{ error?: string }> {
  const { supabase, profile, error } = await getAuthedManager()
  if (error || !profile) return { error: error ?? 'Unauthorized' }

  const { error: dbErr } = await supabase
    .from('job_workers')
    .delete()
    .eq('job_id', jobId)
    .eq('worker_id', workerId)

  if (dbErr) return { error: dbErr.message }
  revalidatePath(`/jobs/${jobId}/compliance`)
  return {}
}
