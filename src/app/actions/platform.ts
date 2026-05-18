'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isValidPlan } from '@/lib/plans'

async function getCallerUserId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

async function getPlatformAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' as const }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_platform_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_platform_admin) return { error: 'Unauthorized' as const }
  return { supabase }
}

export async function createOrganization(
  _prev: { error?: string; orgId?: string; tempPassword?: string } | null,
  formData: FormData
): Promise<{ error?: string; orgId?: string; tempPassword?: string }> {
  const auth = await getPlatformAdmin()
  if ('error' in auth) return { error: auth.error }

  const admin = createAdminClient()

  const orgName      = (formData.get('org_name') as string)?.trim()
  const adminName    = (formData.get('admin_name') as string)?.trim()
  const adminEmail   = (formData.get('admin_email') as string)?.trim()
  const adminPassword = (formData.get('admin_password') as string)?.trim()

  if (!orgName)        return { error: 'Organization name is required' }
  if (!adminEmail)     return { error: 'Admin email is required' }
  if (!adminPassword)  return { error: 'Password is required' }

  const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  // Create org
  const { data: org, error: orgErr } = await admin
    .from('organizations')
    .insert({ name: orgName, slug })
    .select('id')
    .single()

  if (orgErr) return { error: orgErr.message }

  // Create auth user
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
  })

  if (authErr) {
    await admin.from('organizations').delete().eq('id', org.id)
    return { error: authErr.message }
  }

  // Create profile
  const { error: profileErr } = await admin.from('profiles').insert({
    id:              authData.user.id,
    organization_id: org.id,
    role:            'owner',
    full_name:       adminName || adminEmail.split('@')[0],
  })

  if (profileErr) {
    await admin.auth.admin.deleteUser(authData.user.id)
    await admin.from('organizations').delete().eq('id', org.id)
    return { error: profileErr.message }
  }

  revalidatePath('/super-admin')
  return { orgId: org.id, tempPassword: adminPassword }
}

export async function deleteOrganization(orgId: string): Promise<{ error?: string }> {
  const auth = await getPlatformAdmin()
  if ('error' in auth) return { error: auth.error }

  const admin = createAdminClient()

  // Delete all auth users in this org first
  const { data: profiles } = await admin
    .from('profiles')
    .select('id')
    .eq('organization_id', orgId)

  for (const p of profiles ?? []) {
    await admin.auth.admin.deleteUser(p.id)
  }

  // Cascade deletes handle the rest via FK constraints
  const { error } = await admin.from('organizations').delete().eq('id', orgId)
  if (error) return { error: error.message }

  revalidatePath('/super-admin')
  return {}
}

export async function switchToOrg(orgId: string): Promise<{ error?: string }> {
  const auth = await getPlatformAdmin()
  if ('error' in auth) return { error: auth.error }

  const userId = await getCallerUserId()
  if (!userId) return { error: 'Unauthorized' }

  const admin = createAdminClient()

  // Read current org so we can restore it on exit
  const { data: current } = await admin
    .from('profiles')
    .select('organization_id, home_org_id')
    .eq('id', userId)
    .single()

  if (!current) return { error: 'Profile not found' }

  // If already switched, preserve the original home org
  const homeOrg = current.home_org_id ?? current.organization_id

  const { error } = await admin
    .from('profiles')
    .update({ organization_id: orgId, home_org_id: homeOrg })
    .eq('id', userId)

  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return {}
}

export async function exitOrgSwitch(): Promise<{ error?: string }> {
  const auth = await getPlatformAdmin()
  if ('error' in auth) return { error: auth.error }

  const userId = await getCallerUserId()
  if (!userId) return { error: 'Unauthorized' }

  const admin = createAdminClient()

  const { data: current } = await admin
    .from('profiles')
    .select('home_org_id')
    .eq('id', userId)
    .single()

  if (!current?.home_org_id) return {} // already home

  const { error } = await admin
    .from('profiles')
    .update({ organization_id: current.home_org_id, home_org_id: null })
    .eq('id', userId)

  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return {}
}

export async function inviteUserToOrg(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const auth = await getPlatformAdmin()
  if ('error' in auth) return { error: auth.error }

  const admin = createAdminClient()

  const orgId    = (formData.get('org_id') as string)?.trim()
  const fullName = (formData.get('full_name') as string)?.trim()
  const email    = (formData.get('email') as string)?.trim()
  const role     = (formData.get('role') as string)?.trim()
  const password = (formData.get('password') as string)?.trim()

  if (!orgId || !email || !role || !password) return { error: 'All fields are required' }

  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authErr) return { error: authErr.message }

  const { error: profileErr } = await admin.from('profiles').insert({
    id:              authData.user.id,
    organization_id: orgId,
    role,
    full_name:       fullName || email.split('@')[0],
  })

  if (profileErr) {
    await admin.auth.admin.deleteUser(authData.user.id)
    return { error: profileErr.message }
  }

  revalidatePath(`/super-admin/orgs/${orgId}`)
  return { success: true }
}

export async function updateUserProfile(
  userId: string,
  orgId: string,
  data: { full_name?: string; role?: string }
): Promise<{ error?: string }> {
  const auth = await getPlatformAdmin()
  if ('error' in auth) return { error: auth.error }

  const admin = createAdminClient()
  const { error } = await admin.from('profiles').update(data).eq('id', userId).eq('organization_id', orgId)
  if (error) return { error: error.message }

  revalidatePath(`/super-admin/orgs/${orgId}`)
  return {}
}

export async function sendPasswordResetEmail(userEmail: string): Promise<{ error?: string }> {
  const auth = await getPlatformAdmin()
  if ('error' in auth) return { error: auth.error }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/auth/callback?next=/dashboard`,
  })
  if (error) return { error: error.message }
  return {}
}

export async function removeUserFromOrg(userId: string, orgId: string): Promise<{ error?: string }> {
  const auth = await getPlatformAdmin()
  if ('error' in auth) return { error: auth.error }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) return { error: error.message }

  revalidatePath(`/super-admin/orgs/${orgId}`)
  revalidatePath('/super-admin')
  return {}
}

export async function setHomeOrg(orgId: string): Promise<{ error?: string }> {
  const auth = await getPlatformAdmin()
  if ('error' in auth) return { error: auth.error }

  const userId = await getCallerUserId()
  if (!userId) return { error: 'Unauthorized' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('profiles')
    .update({ organization_id: orgId, home_org_id: null })
    .eq('id', userId)

  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return {}
}

export async function updateOrgPlan(orgId: string, plan: string): Promise<{ error?: string }> {
  const auth = await getPlatformAdmin()
  if ('error' in auth) return { error: auth.error }

  if (!isValidPlan(plan)) return { error: 'Invalid plan' }

  const admin = createAdminClient()
  const { error } = await admin.from('organizations').update({ plan }).eq('id', orgId)
  if (error) return { error: error.message }

  revalidatePath('/super-admin')
  return {}
}

export async function updateOrgName(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const auth = await getPlatformAdmin()
  if ('error' in auth) return { error: auth.error }

  const admin = createAdminClient()

  const orgId = (formData.get('org_id') as string)?.trim()
  const name  = (formData.get('name') as string)?.trim()

  if (!orgId || !name) return { error: 'Name is required' }

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const { error } = await admin
    .from('organizations')
    .update({ name, slug })
    .eq('id', orgId)

  if (error) return { error: error.message }

  revalidatePath(`/super-admin/orgs/${orgId}`)
  revalidatePath('/super-admin')
  return { success: true }
}
