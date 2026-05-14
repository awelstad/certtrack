'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function uploadCertDoc(
  formData: FormData
): Promise<{ path?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const file = formData.get('file') as File | null
  const orgId = formData.get('orgId') as string
  const workerId = formData.get('workerId') as string

  if (!file || !orgId || !workerId) return { error: 'Missing required fields' }

  const ext = file.name.split('.').pop() ?? 'bin'
  const path = `${orgId}/${workerId}/${Date.now()}.${ext}`

  const admin = createAdminClient()
  const { error } = await admin.storage.from('cert-documents').upload(path, file)
  if (error) return { error: error.message }

  return { path }
}
