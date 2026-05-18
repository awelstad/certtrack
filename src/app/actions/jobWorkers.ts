'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function getCallerOrg(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()
  return profile?.organization_id ?? null
}

export async function confirmJobTransfer({
  workerId,
  fromJobId,
  toJobId,
}: {
  workerId: string
  fromJobId: string
  toJobId: string
}): Promise<{ error?: string }> {
  const orgId = await getCallerOrg()
  if (!orgId) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  // Verify both jobs belong to caller's org
  const { data: jobs } = await admin
    .from('jobs')
    .select('id')
    .in('id', [fromJobId, toJobId])
    .eq('organization_id', orgId)

  if (!jobs || jobs.length < 2) return { error: 'Job not found' }

  const [delErr, upsErr] = await Promise.all([
    admin.from('job_workers').delete().eq('worker_id', workerId).eq('job_id', fromJobId).then((r) => r.error),
    admin.from('job_workers').upsert({ job_id: toJobId, worker_id: workerId }, { onConflict: 'job_id,worker_id', ignoreDuplicates: true }).then((r) => r.error),
  ])

  if (delErr) return { error: delErr.message }
  if (upsErr) return { error: upsErr.message }
  return {}
}

export async function addWorkerToJob({
  workerId,
  jobId,
}: {
  workerId: string
  jobId: string
}): Promise<{ error?: string }> {
  const orgId = await getCallerOrg()
  if (!orgId) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  const { data: job } = await admin.from('jobs').select('id').eq('id', jobId).eq('organization_id', orgId).single()
  if (!job) return { error: 'Job not found' }

  const { error } = await admin
    .from('job_workers')
    .upsert({ job_id: jobId, worker_id: workerId }, { onConflict: 'job_id,worker_id', ignoreDuplicates: true })

  return error ? { error: error.message } : {}
}

export async function removeWorkerFromJob({
  workerId,
  jobId,
}: {
  workerId: string
  jobId: string
}): Promise<{ error?: string }> {
  const orgId = await getCallerOrg()
  if (!orgId) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  const { data: job } = await admin.from('jobs').select('id').eq('id', jobId).eq('organization_id', orgId).single()
  if (!job) return { error: 'Job not found' }

  const { error } = await admin
    .from('job_workers')
    .delete()
    .eq('worker_id', workerId)
    .eq('job_id', jobId)

  return error ? { error: error.message } : {}
}
