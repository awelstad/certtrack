import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { ArrowLeft, CheckCircle2, Clock } from 'lucide-react'

export default async function PendingCertsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user!.id)
    .single()

  const { data: pending } = await supabase
    .from('worker_certifications')
    .select('id, created_at, issue_date, expiry_date, notes, workers(id, first_name, last_name), certification_types(name)')
    .eq('organization_id', profile!.organization_id)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4 flex items-center gap-3">
        <Link href="/certifications" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Certifications
        </Link>
      </div>

      <PageHeader
        title="Pending Approvals"
        description="Certifications uploaded by workers waiting for admin review."
      />

      {!pending?.length ? (
        <EmptyState
          icon={CheckCircle2}
          title="All caught up"
          description="No certifications are waiting for review."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <ul className="divide-y divide-slate-100">
            {pending.map((cert) => {
              const w = cert.workers as unknown as { id: string; first_name: string; last_name: string } | null
              const ct = cert.certification_types as unknown as { name: string } | null
              const daysPending = Math.floor(
                (Date.now() - new Date(cert.created_at).getTime()) / 864e5
              )
              return (
                <li key={cert.id}>
                  <Link
                    href={`/workers/${w?.id}/certifications/${cert.id}`}
                    className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-50">
                      <Clock className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900">
                        {w ? `${w.first_name} ${w.last_name}` : '—'}
                      </p>
                      <p className="text-sm text-slate-500">
                        {ct?.name ?? '—'}
                        {cert.expiry_date && ` · Expires ${cert.expiry_date}`}
                      </p>
                    </div>
                    <span className={`shrink-0 text-xs font-medium ${daysPending > 7 ? 'text-red-600' : 'text-slate-500'}`}>
                      {daysPending === 0 ? 'Today' : `${daysPending}d ago`}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
