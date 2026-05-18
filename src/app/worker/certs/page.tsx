import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ArrowLeft, Plus, CheckCircle, Clock, XCircle, AlertTriangle } from 'lucide-react'
import { WorkerCertUpload } from './WorkerCertUpload'

export const dynamic = 'force-dynamic'

const statusDisplay = {
  approved: { label: 'Approved',        cls: 'bg-green-50 text-green-700 border-green-200',  icon: <CheckCircle className="h-3.5 w-3.5" /> },
  pending:  { label: 'Pending Review',  cls: 'bg-amber-50 text-amber-700 border-amber-200',  icon: <Clock className="h-3.5 w-3.5" /> },
  rejected: { label: 'Rejected',        cls: 'bg-red-50 text-red-700 border-red-200',        icon: <XCircle className="h-3.5 w-3.5" /> },
  expired:  { label: 'Expired',         cls: 'bg-slate-50 text-slate-600 border-slate-200',  icon: <AlertTriangle className="h-3.5 w-3.5" /> },
}

export default async function WorkerCertsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/worker/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'worker' && profile.role !== 'platform_admin')) {
    redirect('/jobs')
  }

  const admin = createAdminClient()

  const { data: worker } = await admin
    .from('workers')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  // Fetch certs and cert types in parallel
  const [{ data: certs }, { data: certTypes }] = await Promise.all([
    worker
      ? admin
          .from('worker_certifications')
          .select('id, status, issue_date, expiry_date, document_url, notes, certification_types(name)')
          .eq('worker_id', worker.id)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    admin
      .from('certification_types')
      .select('id, name, validity_days')
      .eq('organization_id', profile.organization_id)
      .order('name'),
  ])

  type CertRow = {
    id: string
    status: string
    issue_date: string | null
    expiry_date: string | null
    document_url: string | null
    notes: string | null
    certification_types: { name: string } | null
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-slate-900 px-5 py-5">
        <Link href="/worker" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white mb-3">
          <ArrowLeft className="h-4 w-4" />
          Worker Portal
        </Link>
        <h1 className="text-xl font-bold text-white">My Certifications</h1>
      </div>

      <div className="px-4 py-5 max-w-lg mx-auto space-y-5">
        {/* Upload form */}
        {worker && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Plus className="h-4 w-4 text-orange-500" />
              <h2 className="font-semibold text-slate-900">Upload a Certification</h2>
            </div>
            <WorkerCertUpload
              workerId={worker.id}
              orgId={profile.organization_id}
              certTypes={(certTypes ?? []).map((t) => ({ id: t.id, name: t.name }))}
            />
          </div>
        )}

        {!worker && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Your account hasn&apos;t been fully linked yet. Complete a site orientation or contact your site manager.
          </div>
        )}

        {/* Cert list */}
        {(certs as unknown as CertRow[])?.length ? (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-700">{certs!.length} certification{certs!.length !== 1 ? 's' : ''} on file</p>
            </div>
            <ul className="divide-y divide-slate-100">
              {(certs as unknown as CertRow[]).map((c) => {
                const disp = statusDisplay[c.status as keyof typeof statusDisplay] ?? statusDisplay.pending
                return (
                  <li key={c.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 text-sm">
                          {c.certification_types?.name ?? 'Certification'}
                        </p>
                        {c.issue_date && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            Issued: {new Date(c.issue_date).toLocaleDateString()}
                            {c.expiry_date && ` · Expires: ${new Date(c.expiry_date).toLocaleDateString()}`}
                          </p>
                        )}
                        {c.notes && c.status === 'rejected' && (
                          <p className="text-xs text-red-600 mt-1">{c.notes}</p>
                        )}
                      </div>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold shrink-0 ${disp.cls}`}>
                        {disp.icon}
                        {disp.label}
                      </span>
                    </div>
                    {c.document_url && (
                      <a
                        href={c.document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-xs text-orange-500 hover:underline"
                      >
                        View document
                      </a>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        ) : worker ? (
          <div className="rounded-xl border border-dashed border-slate-300 py-10 text-center bg-white">
            <p className="text-slate-500 font-medium">No certifications yet</p>
            <p className="text-xs text-slate-400 mt-1">Upload your first cert above.</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
