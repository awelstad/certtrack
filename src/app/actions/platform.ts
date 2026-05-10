'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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
