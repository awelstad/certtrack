'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function submitWorkerCert(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const workerId        = formData.get('worker_id') as string
  const orgId           = formData.get('org_id') as string
  const certTypeId      = formData.get('cert_type_id') as string
  const issueDateStr    = formData.get('issue_date') as string | null
  const expiryDateStr   = formData.get('expiry_date') as string | null
  const file            = formData.get('file') as File | null

  if (!workerId || !certTypeId) return { error: 'Missing required fields' }

  const admin = createAdminClient()

  // Verify this worker is linked to the requesting user
  const { data: workerRow } = await admin
    .from('workers')
    .select('id, organization_id')
    .eq('id', workerId)
    .eq('auth_user_id', user.id)
    .single()
  if (!workerRow) return { error: 'Worker record not found for your account' }

  let documentUrl: string | null = null

  if (file && file.size > 0) {
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${orgId}/${workerId}/${Date.now()}.${ext}`
    const { error: uploadErr } = await admin.storage.from('cert-documents').upload(path, file)
    if (uploadErr) return { error: uploadErr.message }

    const { data: urlData } = admin.storage.from('cert-documents').getPublicUrl(path)
    documentUrl = urlData.publicUrl
  }

  const { error } = await admin.from('worker_certifications').insert({
    organization_id:       workerRow.organization_id,
    worker_id:             workerId,
    certification_type_id: certTypeId,
    issue_date:            issueDateStr || null,
    expiry_date:           expiryDateStr || null,
    document_url:          documentUrl,
    status:                'pending',
  })

  if (error) return { error: error.message }

  revalidatePath('/worker/certs')
  return { success: true }
}
