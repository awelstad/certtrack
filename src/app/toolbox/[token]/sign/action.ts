'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export async function signToolboxTalk(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const token       = formData.get('token') as string
  const printedName = (formData.get('printed_name') as string)?.trim()
  const workerId    = (formData.get('worker_identifier') as string)?.trim() || null

  if (!printedName) return { error: 'Name is required' }

  const admin = createAdminClient()

  const { data: talk } = await admin
    .from('toolbox_talks')
    .select('id, organization_id, status')
    .eq('public_token', token)
    .single()

  if (!talk) return { error: 'Talk not found' }
  if (talk.status === 'completed') return { error: 'This talk has already been completed and is no longer accepting signatures.' }

  const { error } = await admin
    .from('toolbox_talk_signatures')
    .insert({
      talk_id:          talk.id,
      organization_id:  talk.organization_id,
      printed_name:     printedName,
      worker_identifier: workerId,
    })

  if (error) return { error: error.message }
  return { success: true }
}
