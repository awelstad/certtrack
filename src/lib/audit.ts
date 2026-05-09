type AuditParams = {
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>
  organizationId: string
  actorId: string
  action:
    | 'worker_created'
    | 'cert_uploaded'
    | 'cert_approved'
    | 'cert_rejected'
    | 'cert_edited'
    | 'cert_deleted'
    | 'qr_viewed'
    | 'orientation_created'
    | 'orientation_updated'
    | 'orientation_signed'
    | 'jha_created'
    | 'jha_edited'
    | 'jha_signed'
    | 'jha_completed'
    | 'jha_revised'
    | 'jha_pdf_exported'
    | 'equipment_created'
    | 'equipment_updated'
    | 'equipment_inspected'
    | 'equipment_pdf_exported'
    | 'inspection_template_created'
    | 'inspection_template_updated'
  entityType: 'worker' | 'certification' | 'qr_scan' | 'orientation' | 'jha' | 'equipment'
  entityId?: string
  metadata?: Record<string, unknown>
}

export async function createAuditLog({
  supabase,
  organizationId,
  actorId,
  action,
  entityType,
  entityId,
  metadata,
}: AuditParams): Promise<void> {
  await supabase.from('audit_logs').insert({
    organization_id: organizationId,
    actor_id: actorId,
    action,
    entity_type: entityType,
    entity_id: entityId ?? null,
    metadata: metadata ?? null,
  })
}
