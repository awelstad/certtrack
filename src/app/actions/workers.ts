'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit'
import type { Role } from '@/lib/types'

const MANAGER_ROLES: Role[] = ['owner', 'admin', 'pm', 'superintendent']

export async function createWorker(
  _prev: { error?: string; workerId?: string } | null,
  formData: FormData
): Promise<{ error?: string; workerId?: string }> {
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

  const firstName = (formData.get('first_name') as string)?.trim()
  const lastName  = (formData.get('last_name') as string)?.trim()
  if (!firstName) return { error: 'First name is required' }
  if (!lastName)  return { error: 'Last name is required' }

  const { data, error } = await supabase
    .from('workers')
    .insert({
      organization_id: profile.organization_id,
      first_name:      firstName,
      last_name:       lastName,
      email:           (formData.get('email') as string)?.trim() || null,
      phone:           (formData.get('phone') as string)?.trim() || null,
      trade:           (formData.get('trade') as string)?.trim() || null,
      employer:        (formData.get('employer') as string)?.trim() || null,
      status:          'active' as const,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  await createAuditLog({
    supabase,
    organizationId: profile.organization_id,
    actorId: user.id,
    action: 'worker_created',
    entityType: 'worker',
    entityId: data.id,
    metadata: { name: `${firstName} ${lastName}` },
  })

  revalidatePath('/workers')
  return { workerId: data.id }
}
