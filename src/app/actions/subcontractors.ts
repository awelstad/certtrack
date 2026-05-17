'use server'

import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export type InviteState = { error?: string; success?: boolean }

export async function inviteSubcontractor(
  _prev: InviteState | null,
  formData: FormData
): Promise<InviteState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || !['owner', 'admin', 'pm', 'superintendent'].includes(profile.role)) {
    return { error: 'Insufficient permissions' }
  }

  const companyName = (formData.get('company_name') as string)?.trim()
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const jobId = formData.get('job_id') as string | null

  if (!companyName) return { error: 'Company name is required' }
  if (!email) return { error: 'Email is required' }

  const admin = createAdminClient()

  // Create or update invite record
  const { data: invite, error: inviteError } = await admin
    .from('subcontractor_invites')
    .upsert({
      organization_id: profile.organization_id,
      job_id: jobId || null,
      company_name: companyName,
      email,
      status: 'pending',
      invited_by: user.id,
    }, { onConflict: 'organization_id,email', ignoreDuplicates: false })
    .select('token')
    .single()

  if (inviteError) return { error: inviteError.message }

  // Derive origin from request headers
  const hdrs = await headers()
  const host = hdrs.get('host') ?? 'localhost:3000'
  const proto = host.startsWith('localhost') ? 'http' : 'https'
  const origin = `${proto}://${host}`

  // Send Supabase magic-link invite email
  const { error: emailError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/sub/accept`,
    data: {
      invite_token: invite?.token,
      organization_id: profile.organization_id,
      company_name: companyName,
      job_id: jobId || null,
    },
  })

  if (emailError) return { error: emailError.message }

  revalidatePath(`/jobs/${jobId}/subs`)
  return { success: true }
}

export async function completeSubInvite(): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  // Find pending invite for this email
  const { data: invite } = await admin
    .from('subcontractor_invites')
    .select('*')
    .eq('email', user.email!)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!invite) return { error: 'No pending invite found for this email.' }

  // Create profile
  const { error: profileError } = await admin.from('profiles').upsert({
    id: user.id,
    organization_id: invite.organization_id,
    role: 'subcontractor_admin',
    full_name: user.user_metadata?.full_name || invite.company_name,
    sub_company_name: invite.company_name,
    sub_job_id: invite.job_id || null,
  }, { onConflict: 'id' })

  if (profileError) return { error: profileError.message }

  // Mark invite accepted
  await admin
    .from('subcontractor_invites')
    .update({ status: 'accepted' })
    .eq('id', invite.id)

  return {}
}

export async function addSubWorker(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role, sub_company_name, sub_job_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'subcontractor_admin') return { error: 'Unauthorized' }

  const firstName = (formData.get('first_name') as string)?.trim()
  const lastName = (formData.get('last_name') as string)?.trim()
  const trade = (formData.get('trade') as string)?.trim() || null
  const email = (formData.get('email') as string)?.trim() || null
  const phone = (formData.get('phone') as string)?.trim() || null

  if (!firstName) return { error: 'First name is required' }
  if (!lastName) return { error: 'Last name is required' }

  const admin = createAdminClient()

  const { data: worker, error: workerError } = await admin.from('workers').insert({
    organization_id: profile.organization_id,
    first_name: firstName,
    last_name: lastName,
    trade,
    email,
    phone,
    employer: profile.sub_company_name,
    status: 'active',
  }).select('id').single()

  if (workerError) return { error: workerError.message }

  // Assign to job
  if (profile.sub_job_id && worker) {
    await admin.from('job_workers').insert({
      job_id: profile.sub_job_id,
      worker_id: worker.id,
      added_by: user.id,
    }).select().single()
  }

  revalidatePath('/sub-portal')
  return { success: true }
}
