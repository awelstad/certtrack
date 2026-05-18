'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Role } from '@/lib/types'

const OWNER_ROLES: Role[] = ['platform_admin', 'owner']

export async function updateOrgSettings(data: {
  workersCanUploadCerts: boolean
}): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || !OWNER_ROLES.includes(profile.role as Role)) {
    return { error: 'Only owners can change organization settings' }
  }

  const { error } = await supabase
    .from('organizations')
    .update({ workers_can_upload_certs: data.workersCanUploadCerts })
    .eq('id', profile.organization_id)

  if (error) return { error: error.message }

  revalidatePath('/admin/branding')
  revalidatePath('/worker/certs')
  return { success: true }
}
