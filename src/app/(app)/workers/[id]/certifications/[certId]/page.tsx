import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { ReviewForm } from '@/components/certifications/ReviewForm'
import { AuditLogTable } from '@/components/certifications/AuditLogTable'
import { getCertExpirationStatus, generateSignedDocumentUrl } from '@/lib/certifications'
import { ArrowLeft, FileText, ExternalLink } from 'lucide-react'
import type { CertStatus, Role } from '@/lib/types'

const statusVariant: Record<CertStatus, 'green' | 'yellow' | 'red' | 'slate'> = {
  approved: 'green',
  pending:  'yellow',
  rejected: 'red',
  expired:  'red',
}

const MANAGER_ROLES: Role[] = ['owner', 'admin', 'pm', 'superintendent']

export default async function CertDetailPage({
  params,
}: {
  params: Promise<{ id: string; certId: string }>
}) {
  const { id: workerId, certId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user!.id)
    .single()

  const { data: cert } = await supabase
    .from('worker_certifications')
    .select('*, certification_types(name, validity_days), workers(first_name, last_name)')
    .eq('id', certId)
    .eq('worker_id', workerId)
    .eq('organization_id', profile!.organization_id)
    .single()

  if (!cert) notFound()

  const worker = cert.workers as { first_name: string; last_name: string } | null
  const certType = cert.certification_types as { name: string; validity_days: number | null } | null

  // Reviewer name
  let reviewerName: string | null = null
  if (cert.reviewed_by) {
    const { data: reviewer } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', cert.reviewed_by)
      .single()
    reviewerName = reviewer?.full_name ?? null
  }

  // Signed URL for document
  const signedUrl = cert.document_url
    ? await generateSignedDocumentUrl(supabase, cert.document_url)
    : null

  // Audit log for this cert
  const { data: auditEntries } = await supabase
    .from('audit_logs')
    .select('id, action, entity_type, entity_id, metadata, created_at, profiles(full_name)')
    .eq('organization_id', profile!.organization_id)
    .eq('entity_id', certId)
    .order('created_at', { ascending: false })
    .limit(50)

  const expiry = getCertExpirationStatus(cert.status as CertStatus, cert.expiry_date)
  const isManager = MANAGER_ROLES.includes(profile?.role as Role)

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4 flex items-center gap-3">
        <Link
          href={`/workers/${workerId}/certifications`}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          {worker ? `${worker.first_name} ${worker.last_name}` : 'Worker'}
        </Link>
      </div>

      <PageHeader
        title={certType?.name ?? 'Certification'}
        description="Certification details and admin review."
      />

      <div className="space-y-5">
        {/* Cert info card */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
              <FileText className="h-5 w-5 text-slate-500" />
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-lg font-semibold text-slate-900">{certType?.name}</h2>
                <Badge label={cert.status} variant={statusVariant[cert.status as CertStatus]} />
                {expiry.color !== 'green' && (
                  <Badge
                    label={expiry.label}
                    variant={expiry.color === 'red' ? 'red' : 'yellow'}
                  />
                )}
              </div>

              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="font-medium text-slate-500">Issue Date</dt>
                  <dd className="mt-0.5 text-slate-900">{cert.issue_date ?? '—'}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-500">Expiry Date</dt>
                  <dd className="mt-0.5 text-slate-900">{cert.expiry_date ?? 'No expiry'}</dd>
                </div>
                {certType?.validity_days && (
                  <div>
                    <dt className="font-medium text-slate-500">Valid For</dt>
                    <dd className="mt-0.5 text-slate-900">{certType.validity_days} days</dd>
                  </div>
                )}
                {reviewerName && (
                  <div>
                    <dt className="font-medium text-slate-500">Reviewed By</dt>
                    <dd className="mt-0.5 text-slate-900">{reviewerName}</dd>
                  </div>
                )}
                {cert.reviewed_at && (
                  <div>
                    <dt className="font-medium text-slate-500">Reviewed At</dt>
                    <dd className="mt-0.5 text-slate-900">
                      {new Date(cert.reviewed_at).toLocaleDateString()}
                    </dd>
                  </div>
                )}
              </dl>

              {cert.notes && (
                <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <span className="font-medium text-slate-500">Notes: </span>{cert.notes}
                </div>
              )}

              {signedUrl && (
                <a
                  href={signedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Document
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Approve / Reject */}
        <ReviewForm
          certId={certId}
          workerId={workerId}
          currentStatus={cert.status as CertStatus}
          isManager={isManager}
        />

        {/* Audit log */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-slate-700">Audit History</h3>
          <AuditLogTable
            entries={(auditEntries ?? []).map((e) => ({
              ...e,
              profiles: Array.isArray(e.profiles) ? (e.profiles[0] ?? null) : (e.profiles as unknown as { full_name: string } | null),
            }))}
          />
        </div>
      </div>
    </div>
  )
}
