'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit'

const MANAGER_ROLES = ['owner', 'admin', 'pm', 'superintendent'] as const

// Called from CertificationUploadForm after the file has been uploaded to Storage.
export async function saveCert(
  _prev: { success: boolean; error?: string } | null,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { success: false, error: 'Profile not found' }

  const workerId     = formData.get('workerId') as string
  const certTypeId   = formData.get('certTypeId') as string
  const documentPath = (formData.get('documentPath') as string) || null
  const issueDate    = (formData.get('issueDate') as string) || null
  const expiryDate   = (formData.get('expiryDate') as string) || null
  const notes        = (formData.get('notes') as string) || null

  if (!workerId || !certTypeId) return { success: false, error: 'Missing required fields' }

  const { data: cert, error } = await supabase
    .from('worker_certifications')
    .insert({
      organization_id:       profile.organization_id,
      worker_id:             workerId,
      certification_type_id: certTypeId,
      document_url:          documentPath,
      issue_date:            issueDate,
      expiry_date:           expiryDate,
      notes,
      status:                'pending',
    })
    .select('id')
    .single()

  if (error) return { success: false, error: `${error.message} | code: ${error.code} | details: ${error.details} | hint: ${error.hint}` }

  await createAuditLog({
    supabase,
    organizationId: profile.organization_id,
    actorId: user.id,
    action: 'cert_uploaded',
    entityType: 'certification',
    entityId: cert.id,
    metadata: { certTypeId, workerId },
  })

  revalidatePath(`/workers/${workerId}/certifications`)
  revalidatePath('/certifications/pending')
  return { success: true }
}

export async function approveCert(certId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()
  if (!profile || !MANAGER_ROLES.includes(profile.role as never)) return { error: 'Insufficient permissions' }

  const { data: cert, error } = await supabase
    .from('worker_certifications')
    .update({ status: 'approved', reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq('id', certId)
    .eq('organization_id', profile.organization_id)
    .select('worker_id')
    .single()

  if (error) return { error: error.message }

  await createAuditLog({
    supabase,
    organizationId: profile.organization_id,
    actorId: user.id,
    action: 'cert_approved',
    entityType: 'certification',
    entityId: certId,
  })

  revalidatePath(`/workers/${cert.worker_id}/certifications/${certId}`)
  revalidatePath(`/workers/${cert.worker_id}/certifications`)
  revalidatePath('/certifications/pending')
  revalidatePath('/workers')
  return {}
}

export async function rejectCert(certId: string, reason: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()
  if (!profile || !MANAGER_ROLES.includes(profile.role as never)) return { error: 'Insufficient permissions' }

  const { data: cert, error } = await supabase
    .from('worker_certifications')
    .update({ status: 'rejected', reviewed_by: user.id, reviewed_at: new Date().toISOString(), notes: reason })
    .eq('id', certId)
    .eq('organization_id', profile.organization_id)
    .select('worker_id')
    .single()

  if (error) return { error: error.message }

  await createAuditLog({
    supabase,
    organizationId: profile.organization_id,
    actorId: user.id,
    action: 'cert_rejected',
    entityType: 'certification',
    entityId: certId,
    metadata: { reason },
  })

  revalidatePath(`/workers/${cert.worker_id}/certifications/${certId}`)
  revalidatePath(`/workers/${cert.worker_id}/certifications`)
  revalidatePath('/certifications/pending')
  revalidatePath('/workers')
  return {}
}

export async function deleteCert(certId: string, workerId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()
  if (!profile || !MANAGER_ROLES.includes(profile.role as never)) return { error: 'Insufficient permissions' }

  const { data: cert } = await supabase
    .from('worker_certifications')
    .select('document_url')
    .eq('id', certId)
    .eq('organization_id', profile.organization_id)
    .single()

  const { error } = await supabase
    .from('worker_certifications')
    .delete()
    .eq('id', certId)
    .eq('organization_id', profile.organization_id)

  if (error) return { error: error.message }

  // Remove file from Storage if one was attached
  if (cert?.document_url) {
    await supabase.storage.from('cert-documents').remove([cert.document_url])
  }

  await createAuditLog({
    supabase,
    organizationId: profile.organization_id,
    actorId: user.id,
    action: 'cert_deleted',
    entityType: 'certification',
    entityId: certId,
    metadata: { workerId },
  })

  revalidatePath(`/workers/${workerId}/certifications`)
  revalidatePath('/certifications/pending')
  revalidatePath('/workers')
  return {}
}
