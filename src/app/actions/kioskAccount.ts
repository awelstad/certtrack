'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Role } from '@/lib/types'

const MANAGER_ROLES: Role[] = ['platform_admin', 'owner', 'admin', 'pm', 'superintendent']

export async function createKioskAccount(data: {
  jobId: string
  email: string
  password: string
}): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()
  if (!profile || !MANAGER_ROLES.includes(profile.role as Role)) {
    return { error: 'Insufficient permissions' }
  }

  // Verify the job belongs to this org
  const { data: job } = await supabase
    .from('jobs')
    .select('id')
    .eq('id', data.jobId)
    .eq('organization_id', profile.organization_id)
    .single()
  if (!job) return { error: 'Job not found' }

  const admin = createAdminClient()

  // Create the auth user
  const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
    email: data.email.trim().toLowerCase(),
    password: data.password,
    email_confirm: true,
  })
  if (createErr) return { error: createErr.message }

  // Create profile with kiosk role
  const { error: profileErr } = await admin.from('profiles').insert({
    id: newUser.user.id,
    organization_id: profile.organization_id,
    role: 'kiosk',
    full_name: `Kiosk — ${data.email}`,
    kiosk_job_id: data.jobId,
  })
  if (profileErr) {
    await admin.auth.admin.deleteUser(newUser.user.id).catch(() => {})
    return { error: profileErr.message }
  }

  revalidatePath(`/jobs/${data.jobId}`)
  return { success: true }
}

export async function deleteKioskAccount(data: {
  kioskUserId: string
  jobId: string
}): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()
  if (!profile || !MANAGER_ROLES.includes(profile.role as Role)) {
    return { error: 'Insufficient permissions' }
  }

  const admin = createAdminClient()

  // Verify the kiosk account belongs to this org
  const { data: kioskProfile } = await admin
    .from('profiles')
    .select('organization_id, role')
    .eq('id', data.kioskUserId)
    .single()
  if (!kioskProfile || kioskProfile.organization_id !== profile.organization_id || kioskProfile.role !== 'kiosk') {
    return { error: 'Kiosk account not found' }
  }

  await admin.auth.admin.deleteUser(data.kioskUserId)

  revalidatePath(`/jobs/${data.jobId}`)
  return { success: true }
}

export async function getKioskAccounts(jobId: string): Promise<{
  accounts: Array<{ id: string; email: string; created_at: string }> | null
  error?: string
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { accounts: null, error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()
  if (!profile || !MANAGER_ROLES.includes(profile.role as Role)) {
    return { accounts: null, error: 'Insufficient permissions' }
  }

  const admin = createAdminClient()
  const { data: kioskProfiles } = await admin
    .from('profiles')
    .select('id, full_name, created_at')
    .eq('organization_id', profile.organization_id)
    .eq('role', 'kiosk')
    .eq('kiosk_job_id', jobId)

  if (!kioskProfiles?.length) return { accounts: [] }

  // Get emails from auth
  const accounts = await Promise.all(
    kioskProfiles.map(async (p) => {
      const { data: authUser } = await admin.auth.admin.getUserById(p.id)
      return {
        id: p.id,
        email: authUser.user?.email ?? p.full_name,
        created_at: p.created_at,
      }
    })
  )

  return { accounts }
}
