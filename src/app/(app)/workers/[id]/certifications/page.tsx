import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { CertificationStatusCard } from '@/components/certifications/CertificationStatusCard'
import { UploadCertButton } from '@/components/certifications/UploadCertButton'
import { StatusBadge } from '@/components/workers/StatusBadge'
import { calculateWorkerOverallStatus, generateSignedDocumentUrl } from '@/lib/certifications'
import { ArrowLeft, Award } from 'lucide-react'
import type { CertStatus } from '@/lib/types'

export default async function WorkerCertificationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user!.id)
    .single()

  const { data: worker } = await supabase
    .from('workers')
    .select('id, first_name, last_name')
    .eq('id', id)
    .single()

  if (!worker) notFound()

  const { data: certs } = await supabase
    .from('worker_certifications')
    .select('id, status, expiry_date, issue_date, notes, document_url, certification_types(name)')
    .eq('worker_id', id)
    .order('created_at', { ascending: false })

  // Cert types for the upload form
  const { data: certTypes } = await supabase
    .from('certification_types')
    .select('id, name')
    .eq('organization_id', profile!.organization_id)
    .order('name')

  // Generate signed URLs for all certs that have documents
  const signedUrls: Record<string, string | null> = {}
  if (certs) {
    await Promise.all(
      certs
        .filter((c) => c.document_url)
        .map(async (c) => {
          signedUrls[c.id] = await generateSignedDocumentUrl(supabase, c.document_url!)
        })
    )
  }

  const overallStatus = calculateWorkerOverallStatus(
    (certs ?? []).map((c) => ({ status: c.status as CertStatus, expiry_date: c.expiry_date }))
  )

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4 flex items-center gap-3">
        <Link href={`/workers/${id}`} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          {worker.first_name} {worker.last_name}
        </Link>
      </div>

      <PageHeader
        title="Certifications"
        description={`All certifications for ${worker.first_name} ${worker.last_name}`}
        action={
          <UploadCertButton
            workerId={id}
            orgId={profile!.organization_id}
            certTypes={certTypes ?? []}
          />
        }
      />

      {/* Overall status */}
      <div className="mb-6 flex items-center gap-3">
        <p className="text-sm text-slate-500">Overall status:</p>
        <StatusBadge status={overallStatus} />
      </div>

      {!certs?.length ? (
        <EmptyState
          icon={Award}
          title="No certifications"
          description="Upload the worker's first certification to start tracking compliance."
        />
      ) : (
        <div className="space-y-3">
          {certs.map((cert) => (
            <CertificationStatusCard
              key={cert.id}
              cert={{
                id: cert.id,
                status: cert.status as CertStatus,
                expiry_date: cert.expiry_date,
                issue_date: cert.issue_date,
                notes: cert.notes,
                certification_types: cert.certification_types as unknown as { name: string } | null,
              }}
              workerId={id}
              signedDocumentUrl={signedUrls[cert.id]}
            />
          ))}
        </div>
      )}
    </div>
  )
}
