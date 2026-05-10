'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Role } from '@/lib/types'

const MANAGER_ROLES: Role[] = ['owner', 'admin', 'pm', 'superintendent']

export async function createToolboxTalk(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string; id?: string }> {
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

  const title       = (formData.get('title') as string)?.trim()
  const topic       = (formData.get('topic') as string)?.trim() || null
  const content     = (formData.get('content') as string)?.trim() || null
  const conductedBy = (formData.get('conducted_by') as string)?.trim() || null
  const talkDate    = (formData.get('talk_date') as string) || new Date().toISOString().split('T')[0]
  const jobId       = (formData.get('job_id') as string) || null

  if (!title) return { error: 'Title is required' }

  const { data, error } = await supabase
    .from('toolbox_talks')
    .insert({
      organization_id: profile.organization_id,
      job_id:    jobId,
      title,
      topic,
      content,
      conducted_by: conductedBy,
      talk_date:    talkDate,
      status:       'active',
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/toolbox')
  return { id: data.id }
}

export async function completeTalk(id: string): Promise<{ error?: string }> {
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

  const { error } = await supabase
    .from('toolbox_talks')
    .update({ status: 'completed' })
    .eq('id', id)
    .eq('organization_id', profile.organization_id)

  if (error) return { error: error.message }
  revalidatePath(`/toolbox/${id}`)
  revalidatePath('/toolbox')
  return {}
}
