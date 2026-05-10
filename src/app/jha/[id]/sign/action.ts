'use server'

import { createClient } from '@/lib/supabase/server'

export async function addJhaSignaturePublic(
  jhaId: string,
  payload: {
    printed_name: string
    signature_data: string | null
    worker_identifier: string | null
  }
): Promise<{ error?: string }> {
  if (!payload.printed_name.trim()) return { error: 'Name is required' }

  const supabase = await createClient()

  const { data: jha } = await supabase
    .from('jhas')
    .select('organization_id')
    .eq('id', jhaId)
    .single()

  if (!jha) return { error: 'JHA not found.' }

  const { error } = await supabase.from('jha_signatures').insert({
    jha_id:            jhaId,
    organization_id:   jha.organization_id,
    printed_name:      payload.printed_name.trim(),
    signature_data:    payload.signature_data || null,
    worker_identifier: payload.worker_identifier?.trim() || null,
  })

  if (error) return { error: error.message }
  return {}
}
